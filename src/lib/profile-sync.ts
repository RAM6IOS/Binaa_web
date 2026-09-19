import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * يزامن بيانات الملف الشخصي من جلسة المستخدم الموثَّقة إلى public.profiles
 * (الاسم / الهاتف / البريد / المسمى الوظيفي).
 *
 * - الهوية تأتي من الجلسة الخادمية حصراً — لا تُقبل من أي جهة خارجية.
 * - يستعمل service-role (يتجاوز RLS) لكنه يُستدعى من الخادم فقط.
 * - لا يعبئ إلا الحقول الموجودة في user_metadata حتى لا يمسح قيماً سابقة.
 * - الفشل يُسجَّل ولا يُسقط عمليات الدخول/التسجيل أبداً.
 */
export async function syncProfileToDb(user: User) {
  try {
    const meta = user.user_metadata ?? {};

    const patch: Record<string, unknown> = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (user.email) patch.email = user.email;
    if (typeof meta.full_name === 'string' && meta.full_name.trim()) {
      patch.full_name = meta.full_name.trim();
    }
    if (typeof meta.phone === 'string' && meta.phone.trim()) {
      patch.phone = meta.phone.trim();
    }
    if (typeof meta.job_title === 'string' && meta.job_title.trim()) {
      patch.job_title = meta.job_title.trim();
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('profiles')
      .upsert(patch, { onConflict: 'id' });

    if (error) {
      console.error('[profile-sync] فشل مزامنة الملف:', error.message);
    }
  } catch (err) {
    console.error('[profile-sync] فشل مزامنة الملف:', err);
  }
}