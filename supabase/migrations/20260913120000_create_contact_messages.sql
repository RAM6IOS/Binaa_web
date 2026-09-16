-- migration: create_contact_messages
-- جدول رسائل الاتصال + سياسة RLS للإدراج فقط (الزائر المجهول).
-- يُطبَّق يدوياً عبر لوحة Supabase (يُدار الـ schema خارجياً في هذه المرحلة).

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 30),
  subject text not null check (subject in ('inquiry', 'demo', 'partnership')),
  message text not null check (char_length(message) between 10 and 2000),
  locale text not null default 'ar' check (locale in ('ar', 'fr')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- الزائر المجهول (بدون تسجيل دخول) يملك صلاحية الإدراج فقط.
create policy "anon can insert contact messages"
  on public.contact_messages
  for insert
  to anon
  with check (true);

-- منع المستخدم المسجَّل من قراءة/تعديل/حذف الرسائل (القراءة خارج نطاق الواجهة حالياً).
revoke all on public.contact_messages from authenticated;