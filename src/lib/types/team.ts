import type { MemberRole } from '@/lib/auth/permissions';

export type { MemberRole } from '@/lib/auth/permissions';

export type MemberStatus = 'active' | 'invited' | 'disabled';

/** شركة المقاولة — الوحدة التنظيمية لفصل بيانات المستأجرين. */
export interface Company {
  id: string;
  name: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** عضو في شركة — مصدر الأدوار والصلاحيات. */
export interface CompanyMember {
  id: string;
  company_id: string;
  user_id?: string | null;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: MemberRole;
  status: MemberStatus;
  created_by?: string | null;
  joined_at?: string;
  created_at?: string;
  updated_at?: string;
}

/** العضوية مع اسم الشركة (join) — تُستخدم في صفحة الفريق والجلب الشائع. */
export interface MembershipWithCompany extends CompanyMember {
  company?: Pick<Company, 'id' | 'name'> | null;
}

/** مدخلات إنشاء عضو إدارياً — حقول نموذج «إضافة مستخدم». */
export interface CreateMemberInput {
  companyId: string;
  full_name: string;
  email: string;
  role: Exclude<MemberRole, 'owner'>;
  tempPassword?: string;
}

/** منحنى نجاح إضافة/ربط عضو — يحدّد رسالة النجاح وشكل عرض النتيجة. */
export type MemberCreateOutcome = 'created' | 'reactivated' | 'linked';

/** نتيجة إضافة عضو — كلمة المرور المؤقتة تُرجَع مرة واحدة فقط، وتغيب في الحالة (linked). */
export interface CreateMemberResult {
  member: CompanyMember;
  /** رسالة النجاح المخصصة للحالة — تُعرض للمدير كما هي. */
  message: string;
  case: MemberCreateOutcome;
  /** موجودة عند إنشاء حساب جديد أو إعادة تعيين كلمة — تغيب عند الربط بحساب موجود. */
  tempPassword?: string;
}

/** نتيجة إعادة تعيين كلمة مرور مؤقتة — تعرض مرة واحدة فقط ولا تُخزَّن. */
export interface ResetPasswordResult {
  memberId: string;
  tempPassword: string;
}