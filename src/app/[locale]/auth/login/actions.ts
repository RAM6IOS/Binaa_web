"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

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

  // تشخيصي مؤقت: تأكيد أن الجلسة أُنشئت وأن الكوكي كُتبت قبل التوجيه (يُحذف بعد التحقق).
  const cookieStore = await cookies();
  console.log("[login] session user:", data.session?.user?.id ?? "none");
  console.log(
    "[login] cookies after signIn:",
    cookieStore.getAll().map((c) => c.name)
  );

  if (error || !data.session) {
    console.warn(
      "[login] signInWithPassword failed:",
      error?.message ??
        "(empty email/password or no session) — redirect to login with error"
    );
    redirect(`/${locale}/auth/login?error=invalid_credentials`);
  }

  redirect(`/${locale}/projects`);
}