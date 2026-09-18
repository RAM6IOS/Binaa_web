import { createClient } from '../supabase/client';
import { resolveMyCompanyId } from './guard';

const supabase = createClient();

export async function resolveCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * نطاق القراءة متعدد المستأجرين: عضوية الشركة إن وُجدت، وإلا حساب المستخدم الشخصي.
 * نعتمد هذا التعويض حتى لا تُعرض قائمة فارغة صامتة لمجرد غياب العضوية
 * (بيانات قديمة بلا company_id أو حساب لم يُربط بعد) — أصل باغ القوائم الفارغة.
 */
export async function resolveMyDataScope(): Promise<{ userId: string | null; companyId: string | null }> {
  const [userId, companyId] = await Promise.all([resolveCurrentUserId(), resolveMyCompanyId()]);
  return { userId, companyId };
}