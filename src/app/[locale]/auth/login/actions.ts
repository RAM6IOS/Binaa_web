"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { syncProfileToDb } from "@/lib/profile-sync";

const SUPPORTED_LOCALES = ["ar", "fr"];

/**
 * Server Action لدخول كلمة المرور — نمط Supabase الرسمي في App Router:
 * تُنفَّذ المصادقة خادمياً داخل نفس الطلب، وتُكتب الكوكي عبر cookies()
 * في سياق Action (مُصرَّح به دائماً)، ثم تَعيد Next التوجيه حاملةً
 * تغييرات الكوكي في استجابة الطلب نفسه — دون أي fetch/انتقال جانبي يُفقدها.
 */
export async function login(formData: FormData) {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = SUPPORTED_LOCALES.includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    console.warn(
      "[login] signInWithPassword failed:",
      error?.message ??
        "(empty email/password or no session) — redirect to login with error"
    );
    redirect(`/${locale}/auth/login?error=invalid_credentials`);
  }

  // مزامنة بيانات الملف الشخصي (الاسم/الهاتف/البريد) بعد نجاح الدخول — لا تُسقط التوجيه عند فشلها.
  await syncProfileToDb(data.session.user);

  redirect(`/${locale}/projects`);
}