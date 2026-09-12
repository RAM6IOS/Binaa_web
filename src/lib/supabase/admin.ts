import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * عميل خادم بصلاحيات كاملة (Service Role).
 *
 * ⚠️ ممنوع منعاً باتاً استيراده من أي Client Component أو صفحة عميل —
 * تسريبه يعطي وصولاً كاملاً لقاعدة البيانات. يُستخدم فقط داخل Route Handlers
 * (الخادم) عبر خدمة team-admin-service.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}