import { teamService, readCachedMembership } from './team-service';
import { assertCan, can, type MemberRole, type Permission } from '../auth/permissions';

/**
 * حراسة موحّدة للعمليات الحساسة في طبقة الخدمة (وليس UI فقط):
 * تُعيد العضوية النشطة (مع الدور) وترمي خطأً واضحاً عند نقص الصلاحية.
 * آمنة للعمل دون اتصال عبر كاش العضوية المحلي.
 */
export async function assertPermission(permission: Permission) {
  const membership = await teamService.getMyMembership();
  assertCan(membership?.role, permission);
  return membership;
}

/**
 * معرف شركة المستخدم الحالي — من العضوية المباشرة ثم الكاش المحلي عند
 * الانقطاع. يُستخدم لتحديد نطاق القراءة (multi-tenant) لكل القوائم العامة
 * (عمال، عتاد، مشاريع…): أي عضو active في الشركة يرى بيانات الشركة.
 */
export async function resolveMyCompanyId(): Promise<string | null> {
  const membership = await teamService.getMyMembership();
  return membership?.company_id ?? readCachedMembership()?.company_id ?? null;
}

export function roleHas(role: MemberRole | null | undefined, permission: Permission): boolean {
  return can(role, permission);
}