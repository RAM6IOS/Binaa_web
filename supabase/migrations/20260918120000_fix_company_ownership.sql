-- ═══════════════════════════════════════════════════════════════════════════
-- إصلاح ملكية البيانات بعد ميزة الأدوار (commit 548d02f)
-- المشكلة: تغيّر نطاق قراءة القوائم من user_id إلى company_id دون ترحيل،
-- فأصبحت البيانات القديمة (company_id IS NULL) مخفية عن أصحابها.
-- ═══════════════════════════════════════════════════════════════════════════
-- كيفية الاستخدام:
--   1. افتح Supabase → SQL Editor → الصق السكربت كاملاً → Run.
--   2. السكربت آمن لإعادة التشغيل (idempotent) ولا يمسّ قيداً أو سياسة RLS موجودة.
--   3. ناقش أرقام «التشخيص» في أعلى المخرجات قبل وبعد التنفيذ.
-- ملاحظة: كل تعليمة تلمس جدولاً محمية بـ to_regclass حتى ينجح السكربت
-- حتى لو كانت بعض الجداول غير موجودة بعد (تثبيت جديد).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 0) تشخيص ما قبل التعديل — يُظهر عدد الصفوف اليتيمة (بلا شركة)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  n_users int;
  n_workers int;
  n_equipment int;
  n_projects int;
  n_members int;
  orphan_workers int;
  orphan_equipment int;
  orphan_projects int;
begin
  select count(*) into n_users from auth.users;

  if to_regclass('public.workers') is not null then
    select count(*) into n_workers from public.workers;
    select count(*) into orphan_workers from public.workers where company_id is null;
  else
    n_workers := 0; orphan_workers := 0;
  end if;

  if to_regclass('public.equipment') is not null then
    select count(*) into n_equipment from public.equipment;
    select count(*) into orphan_equipment from public.equipment where company_id is null;
  else
    n_equipment := 0; orphan_equipment := 0;
  end if;

  if to_regclass('public.projects') is not null then
    select count(*) into n_projects from public.projects;
    select count(*) into orphan_projects from public.projects where company_id is null;
  else
    n_projects := 0; orphan_projects := 0;
  end if;

  if to_regclass('public.company_members') is not null then
    select count(*) into n_members from public.company_members;
  else
    n_members := 0;
  end if;

  raise notice '═══ تشخيص ما قبل الإصلاح ═══';
  raise notice 'auth.users            = %', n_users;
  raise notice 'company_members       = %', n_members;
  raise notice 'workers               = % (بلا company_id: %)', n_workers, orphan_workers;
  raise notice 'equipment             = % (بلا company_id: %)', n_equipment, orphan_equipment;
  raise notice 'projects              = % (بلا company_id: %)', n_projects, orphan_projects;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) الاسم الموحّد للشركات المُنشأة تلقائياً — عَدِّل هنا فقط (نقطة واحدة)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.binaa_default_company_name()
returns text
language sql
immutable
as $$ select 'شركة المقاولات'::text $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) ضمان وجود الجداول (إن طُبِّقا سابقاً يدوياً يلغى الأمران تلقائياً)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.companies (
  id uuid primary key,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- عمود company_id على جداول البيانات القائمة إن غاب
do $$
begin
  if to_regclass('public.workers') is not null then
    alter table public.workers add column if not exists company_id uuid references public.companies(id) on delete set null;
  end if;
  if to_regclass('public.equipment') is not null then
    alter table public.equipment add column if not exists company_id uuid references public.companies(id) on delete set null;
  end if;
  if to_regclass('public.projects') is not null then
    alter table public.projects add column if not exists company_id uuid references public.companies(id) on delete set null;
  end if;
end $$;

-- فهرس على user_id للبحث السريع عن العضوية — لا نفرض قيود unique هنا:
-- الجدول قد يكون معرَّفاً مسبقاً بقيود مختلفة، والتطبيق يضمن الفرادة في طبقة الخدمة.
create index if not exists company_members_user_id_idx on public.company_members (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3) مُفعِّل الترقية: ينشئ شركة + عضوية owner لأي مستخدم جديد عند التسجيل
--    — يُنشأ فقط إن لم يوجد (لا نستبدل أي مُفعِّل يدوي قائم)
-- ─────────────────────────────────────────────────────────────────────────
do $ensure_trigger$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    create function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer set search_path = public
    as $$
    declare
      is_admin_created boolean;
      has_active_membership boolean;
    begin
      -- الحسابات التي ينشئها مدير داخل شركة (app_metadata.is_admin_created) لا
      -- تأخذ شركة خاصة: العضوية تُنشأ من قبل admin عبر insertMember مباشرة.
      select coalesce((new.app_metadata->>'is_admin_created')::boolean, false) into is_admin_created;
      if is_admin_created then
        return new;
      end if;

      -- المدعوّ المرتبط بشركة قائمة لا تأخذ شركة خاصة به
      select exists (
        select 1 from public.company_members cm
        where cm.email = new.email and cm.status = 'active'
      ) into has_active_membership;

      if has_active_membership then
        return new;
      end if;

      insert into public.companies (id, name, created_by, created_at, updated_at)
      values (new.id, public.binaa_default_company_name(), new.id, now(), now())
      on conflict (id) do nothing;

      insert into public.company_members (
        id, company_id, user_id, email, full_name,
        role, status, created_by, joined_at, created_at, updated_at
      )
      select
        gen_random_uuid(), new.id, new.id, new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
        'owner', 'active', new.id, now(), now(), now()
      where not exists (
        select 1 from public.company_members cm
        where cm.user_id = new.id or cm.email = new.email
      );

      return new;
    end $$;
  end if;
end $ensure_trigger$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4) ترحيل الصفوف اليتيمة — ربط كل مستخدم بشركته (owner) إن لم يكن له عضوية
-- ─────────────────────────────────────────────────────────────────────────
-- 4.أ) إنشاء شركة لكل مستخدم بلا عضوية (حساباً أو بريداً)
insert into public.companies (id, name, created_by, created_at, updated_at)
select u.id, public.binaa_default_company_name(), u.id, now(), now()
from auth.users u
where not exists (
  select 1 from public.company_members cm
  where cm.user_id = u.id or cm.email = u.email
)
and not exists (select 1 from public.companies c where c.id = u.id);

-- 4.ب) عضوية owner لكل مستخدم بلا أي صف عضوية (حساباً أو بريداً)
insert into public.company_members (
  id, company_id, user_id, email, full_name,
  role, status, created_by, joined_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id, u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  'owner', 'active', u.id, now(), now(), now()
from auth.users u
where not exists (
  select 1 from public.company_members cm
  where cm.user_id = u.id or cm.email = u.email
);

-- 4.ج) ربط الصفوف اليتيمة بشركة مالكها (عبر العضوية النشطة)
do $$
begin
  if to_regclass('public.workers') is not null then
    update public.workers w
    set company_id = cm.company_id
    from public.company_members cm
    where w.company_id is null
      and cm.user_id = w.user_id
      and cm.status = 'active';
  end if;

  if to_regclass('public.equipment') is not null then
    update public.equipment e
    set company_id = cm.company_id
    from public.company_members cm
    where e.company_id is null
      and cm.user_id = e.user_id
      and cm.status = 'active';
  end if;

  if to_regclass('public.projects') is not null then
    update public.projects p
    set company_id = cm.company_id
    from public.company_members cm
    where p.company_id is null
      and cm.user_id = p.created_by
      and cm.status = 'active';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5) تحقّق — RLS غير مُعدَّل هنا إطلاقاً (التحقق فقط، وعليك ضبط السياسات يدوياً)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  orphan_workers int;
  orphan_equipment int;
  orphan_projects int;
  no_membership int;
  rls_workers boolean;
  rls_equipment boolean;
  rls_projects boolean;
  rls_companies boolean;
  rls_members boolean;
begin
  if to_regclass('public.workers') is not null then
    select count(*) into orphan_workers from public.workers where company_id is null;
  else
    orphan_workers := 0;
  end if;

  if to_regclass('public.equipment') is not null then
    select count(*) into orphan_equipment from public.equipment where company_id is null;
  else
    orphan_equipment := 0;
  end if;

  if to_regclass('public.projects') is not null then
    select count(*) into orphan_projects from public.projects where company_id is null;
  else
    orphan_projects := 0;
  end if;

  select count(*) into no_membership from auth.users u
    where not exists (select 1 from public.company_members cm where cm.user_id = u.id);

  select coalesce(bool_or(rowsecurity), false) into rls_workers from pg_tables where schemaname = 'public' and tablename = 'workers';
  select coalesce(bool_or(rowsecurity), false) into rls_equipment from pg_tables where schemaname = 'public' and tablename = 'equipment';
  select coalesce(bool_or(rowsecurity), false) into rls_projects from pg_tables where schemaname = 'public' and tablename = 'projects';
  select coalesce(bool_or(rowsecurity), false) into rls_companies from pg_tables where schemaname = 'public' and tablename = 'companies';
  select coalesce(bool_or(rowsecurity), false) into rls_members from pg_tables where schemaname = 'public' and tablename = 'company_members';

  raise notice '═══ تحقّق ما بعد الإصلاح ═══';
  raise notice 'workers بلا شركة بعد    = %', orphan_workers;
  raise notice 'equipment بلا شركة بعد  = %', orphan_equipment;
  raise notice 'projects بلا شركة بعد   = %', orphan_projects;
  raise notice 'مستخدمون بلا عضوية بعد  = %', no_membership;
  raise notice 'RLS (لم تُعدَّل — راجعها يدوياً):';
  raise notice '  workers=%  equipment=%  projects=%  companies=%  company_members=%',
    rls_workers, rls_equipment, rls_projects, rls_companies, rls_members;
end $$;