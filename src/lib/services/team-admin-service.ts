import type {
  CompanyMember,
  CreateMemberInput,
  CreateMemberResult,
  MemberCreateOutcome,
} from '@/lib/types/team';
import type { MemberRole } from '@/lib/auth/permissions';

/**
 * ⚠️ SERVER-ONLY — يُستورد داخل Route Handlers فقط.
 * إضافة عضو في شركة موجودة مع التعامل الصحيح مع الحسابات الموجودة مسبقاً:
 *   A) عضوية معطّلة لنفس الشركة → تفعيل + تحديث الدور إن لزم + إعادة كلمة مؤقتة
 *   B) حساب auth موجود بلا عضوية في الشركة → ربط فقط (بلا تغيير كلمة المرور)
 *   C) لا يوجد حساب → إنشاء حساب ثم عضوية مرتبطة به (user_id إلزامي)
 *
 * السبب في خلية الوصول (service role): إنشاء مؤهلات Auth يتجاوز RLS،
 * لذا لا يمكن تنفيذه من العميل أبداً؛ أي تسريب للمفتاح = وصول كامل.
 *
 * كلمة المرور المؤقتة تُرجَع مرة واحدة فقط ولا تُخزَّن نصّياً في أي مكان،
 * وتغيب تماماً في الحالة (linked) لأن المستخدم يملك كلمة مروره الخاصة.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * الشكل البنيوي الأدنى للعميل المؤهّل — يسمح بحقن عميل وهمي في الاختبارات
 * (scripts/test-member-create.mjs) دون الحاجة لإنشاء اتصال حقيقي.
 */
interface AdminLike {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any;
  auth: {
    admin: {
      createUser: (attrs: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
      }) => Promise<{ data: { user?: { id?: string | null } | null } | null; error: { message: string } | null }>;
      updateUserById: (uid: string, attrs: { password: string }) => Promise<{ error: { message: string } | null }>;
    };
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function generateTempPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** الاستيراد مؤجَّل (dynamic import) حتى لا يُحمَّل اتصال service-role عند استيراد الخدمة في الاختبارات. */
async function loadAdminClient(): Promise<AdminLike> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  return createAdminClient() as unknown as AdminLike;
}

const OUTCOME_MESSAGE: Record<MemberCreateOutcome, string> = {
  created: 'تم إنشاء العضو',
  reactivated: 'تم تفعيل العضو مجدداً',
  linked: 'تمت إضافة العضو وربطه بحساب موجود',
};

/** البحث في auth.users عن المستخدم بالبريد — خدمة الدور فقط (لا يُكشف للعميل). */
async function findAuthUserIdByEmail(admin: AdminLike, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc('find_user_id_by_email', { auth_email: email });
  if (error) throw new Error('تعذّر التحقق من البريد في نظام الحسابات: ' + error.message);
  return typeof data === 'string' && data.trim() !== '' ? data : null;
}

/** إنشاء حساب auth جديد بالعلامة is_admin_created حتى يتجاوز trigger إنشاء شركة مستقلة. */
async function createAuthAccount(
  admin: AdminLike,
  params: { email: string; fullName: string; tempPassword: string }
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.tempPassword,
    email_confirm: true,
    user_metadata: { full_name: params.fullName },
    app_metadata: { is_admin_created: true },
  });

  if (error) {
    // سباق نادر: ظهر البريد في auth بين البحث والإنشاء — لا نعيد رفضاً، بل نطلب إعادة الربط
    if (/already.*(register|exist)|already been registered|email_exists|user_already_exists/i.test(error.message)) {
      throw new Error('هذا البريد مسجّل بالفعل — أعد المحاولة ليرتبط بالحساب الحالي');
    }
    throw new Error('فشل إنشاء الحساب: ' + error.message);
  }

  const id = data?.user?.id ?? null;
  if (!id) throw new Error('فشل إنشاء الحساب — لم يُرجع المستخدم');
  return id;
}

async function findMemberByEmail(admin: AdminLike, companyId: string, email: string): Promise<CompanyMember | null> {
  const { data, error } = await admin
    .from('company_members')
    .select('*')
    .eq('company_id', companyId)
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error('تعذّر قراءة العضوية: ' + error.message);
  return (data as CompanyMember | null) ?? null;
}

async function findMemberByUser(admin: AdminLike, companyId: string, userId: string): Promise<CompanyMember | null> {
  const { data, error } = await admin
    .from('company_members')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('تعذّر قراءة العضوية: ' + error.message);
  return (data as CompanyMember | null) ?? null;
}

/** إدراج عضوية جديدة مرتبطة بمستخدم — يمنع عمداً أي صف جديد بلا user_id. */
async function insertMember(
  admin: AdminLike,
  params: { companyId: string; email: string; fullName: string; role: MemberRole; userId: string }
): Promise<CompanyMember> {
  const row = {
    company_id: params.companyId,
    user_id: params.userId,
    email: params.email,
    full_name: params.fullName,
    role: params.role,
    status: 'active',
    joined_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from('company_members').insert(row).select().single();
  if (error) throw new Error('فشل حفظ العضو: ' + error.message);
  return data as CompanyMember;
}

/** ربط حساب موجود بصف عضوية — إن كان يملك صفاً سابقاً بنفس (company_id, user_id) نحدّثه ولا نكرر. */
async function linkUserId(
  admin: AdminLike,
  params: { companyId: string; email: string; fullName: string; role: MemberRole; userId: string }
): Promise<CompanyMember> {
  const byUser = await findMemberByUser(admin, params.companyId, params.userId);
  if (byUser) {
    const patch = {
      user_id: params.userId,
      email: params.email,
      full_name: params.fullName,
      role: params.role,
      status: 'active',
      joined_at: new Date().toISOString(),
    };
    const { error } = await admin.from('company_members').update(patch).eq('id', byUser.id);
    if (error) throw new Error('فشل ربط العضو بحسابه: ' + error.message);
    return { ...byUser, ...patch, updated_at: new Date().toISOString() } as CompanyMember;
  }
  return insertMember(admin, params);
}

/**
 * تفعيل/استكمال صف عضوية قائم: ربط بحساب، تفعيل، تحديث الدور إن لزم، وكلمة مؤقتة عند الطلب.
 * الهدف من الحساب هو user_id المرتبط بالصف نفسه (إن وُجد) لا المطابقة العالمية للبريد:
 * فالحساب قد يكون غيّر بريده، وإعادة تعيين كلمة مرور حساب آخر يملك نفس البريد الآن
 * (من شركة مختلفة) كانت ستكون استيلاءً على حسابه (Account Takeover).
 */
async function activateExistingMember(
  admin: AdminLike,
  params: {
    existing: CompanyMember;
    authUserId: string;
    email: string;
    fullName: string;
    role: MemberRole;
    tempPassword: string;
    resetPassword: boolean;
  }
): Promise<CompanyMember> {
  const userId = params.existing.user_id ?? params.authUserId;
  if (!userId) throw new Error('تعذّر تحديد حساب العضو');

  if (params.resetPassword) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password: params.tempPassword });
    if (error) throw new Error('فشل تحديث كلمة المرور المؤقتة: ' + error.message);
  }

  const patch: Record<string, unknown> = {
    user_id: userId,
    status: 'active',
    full_name: params.fullName,
    joined_at: new Date().toISOString(),
  };
  if (params.existing.role !== params.role) patch.role = params.role;

  const { error } = await admin.from('company_members').update(patch).eq('id', params.existing.id);
  if (error) throw new Error('فشل تفعيل العضو: ' + error.message);

  return { ...params.existing, ...patch, updated_at: new Date().toISOString() } as CompanyMember;
}

function buildOutcome(kind: MemberCreateOutcome, member: CompanyMember, tempPassword?: string): CreateMemberResult {
  return {
    case: kind,
    message: OUTCOME_MESSAGE[kind],
    member,
    ...(tempPassword ? { tempPassword } : {}),
  };
}

/**
 * إضافة عضو إلى الشركة:
 *  1) يبحث عن المستخدم في auth بالبريد قبل أي إنشاء
 *  2) يقرر المسار: (C) إنشاء جديد · (B) ربط بحساب موجود · (A) إعادة تفعيل
 *  3) لا يستدعي createUser إطلاقاً إذا كان البريد موجوداً
 *  4) كل صف عضوية جديد يرتبط بـ user_id — لا صفوف بلا مستخدم
 */
export async function createMemberByAdmin(input: CreateMemberInput, client?: AdminLike): Promise<CreateMemberResult> {
  const admin = client ?? (await loadAdminClient());

  const companyId = String(input.companyId ?? '');
  const fullName = String(input.full_name ?? '').trim();
  const email = normalizeEmail(String(input.email ?? ''));
  const role = input.role as MemberRole;

  if (!companyId) throw new Error('معرّف الشركة مطلوب');
  if (!fullName) throw new Error('الاسم الكامل مطلوب');
  if (!EMAIL_RE.test(email)) throw new Error('بريد إلكتروني غير صالح');
  if (role !== 'admin' && role !== 'member') {
    throw new Error('لا يمكن إنشاء مالك من هذه الواجهة — الدور: admin أو member فقط');
  }

  const tempPassword =
    input.tempPassword && input.tempPassword.trim() ? input.tempPassword : generateTempPassword();
  if (tempPassword.length < 8) {
    throw new Error('كلمة المرور المؤقتة يجب أن تكون 8 أحرف على الأقل');
  }

  // 1) البحث عن المستخدم بالبريد في auth (خدمة الدور)
  const authUserId = await findAuthUserIdByEmail(admin, email);

  // 2) عضوية بنفس البريد داخل نفس الشركة
  const existing = await findMemberByEmail(admin, companyId, email);

  // لا عضوية سابقة → (B) ربط بحساب موجود أو (C) إنشاء حساب من الصفر
  if (!existing) {
    if (!authUserId) {
      const userId = await createAuthAccount(admin, { email, fullName, tempPassword });
      const member = await insertMember(admin, { companyId, email, fullName, role, userId });
      return buildOutcome('created', member, tempPassword);
    }
    const member = await linkUserId(admin, { companyId, email, fullName, role, userId: authUserId });
    return buildOutcome('linked', member);
  }

  // عضوية مرتطبة نشطة لنفس الحساب → طلب مكرر، ليس ربطاً
  if (existing.status === 'active' && existing.user_id) {
    if (authUserId && existing.user_id === authUserId) {
      throw new Error('هذا البريد عضو نشط بالفعل في الشركة');
    }
    // البريد الحقيقي في auth انتقل لحساب آخر (غيّر المستخدم بريده) → أعد الربط دون كلمة جديدة
    if (authUserId) {
      const member = await activateExistingMember(admin, {
        existing,
        authUserId,
        email,
        fullName,
        role,
        tempPassword,
        resetPassword: false,
      });
      return buildOutcome('linked', member);
    }
    throw new Error('هذا البريد عضو نشط بالفعل في الشركة');
  }

  // إعادة تفعيل / استكمال (disabled · invited · active بلا ربط)
  const resetPassword = existing.status !== 'active';
  if (authUserId) {
    const member = await activateExistingMember(admin, {
      existing,
      authUserId,
      email,
      fullName,
      role,
      tempPassword,
      resetPassword,
    });
    const kind: MemberCreateOutcome = existing.status === 'disabled' ? 'reactivated' : 'linked';
    return buildOutcome(kind, member, resetPassword ? tempPassword : undefined);
  }

  // لا حساب لهذا البريد → أنشئه ثم اربط الصف الموجود (بلا صف عضوية جديد)
  const newUserId = await createAuthAccount(admin, { email, fullName, tempPassword });
  const member = await activateExistingMember(admin, {
    existing,
    authUserId: newUserId,
    email,
    fullName,
    role,
    tempPassword,
    resetPassword: false,
  });
  const kind: MemberCreateOutcome = existing.status === 'disabled' ? 'reactivated' : 'created';
  return buildOutcome(kind, member, tempPassword);
}

/**
 * إعادة تعيين كلمة مرور مؤقتة لمستخدم Auth موثوق (خدمة الدور على الخادم فقط).
 * - لا تُقرأ الكلمة القديمة أبداً (ثبّتها Supabase Auth مجزّأةً آمناً)
 * - الكلمة الجديدة تُولّد عشوائياً وتُرجَع مرة واحدة فقط ولا تُخزَّن نصّياً
 * ⚠️ الخطر: تُستدعى من Route Handler يتحقق من أن المنفّذ owner/admin
 *    وأن الهدف يخصّ نفس الشركة (RLS + تحقق صريح).
 */
export async function resetMemberPassword(userId: string): Promise<{ tempPassword: string }> {
  const admin = await loadAdminClient();
  if (!userId) throw new Error('معرّف المستخدم مطلوب');

  const tempPassword = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: tempPassword });

  if (error) throw new Error('فشل إعادة تعيين كلمة المرور: ' + error.message);

  return { tempPassword };
}