"use server";

import { createClient } from "@/lib/supabase/server";
import { syncProfileToDb } from "@/lib/profile-sync";

/**
 * Server Action تُستدعى بعد التسجيل المباشر (عند وجود جلسة):
 * تقرأ الجلسة من الكوكيز وتزامن بيانات الملف (الاسم/الهاتف/البريد)
 * إلى public.profiles على الفور. الفشل يُسجَّل ويُعاد دون إزعاج المستخدم.
 */
export async function saveProfile(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    await syncProfileToDb(user);
    return { ok: true };
  } catch (err) {
    console.error("[saveProfile] فشل مزامنة الملف:", err);
    return { ok: false };
  }
}