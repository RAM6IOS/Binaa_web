import { redirect } from "next/navigation";

/**
 * /projects/[id] لم يعد واجهة شبكة للمشاريع — نقطة الدخول الموحّدة هي
 * /projects (وضع الموقع). أي رابط قديم لصفحة مشروع يُعاد توجيهه إلى
 * وضع الموقع مع نفس المشروع محدَّداً في ?project=، فيبقى الرابط قابلاً
 * للمشاركة ولا ينكسر.
 *
 * المسار يُبنى ببادئة اللغة يدوياً (نفس نمط login/actions.ts) فيحصل
 * المستخدم على إعادة توجيه واحدة بدل قفزة إضافية عبر الـ middleware.
 */
export default async function ProjectRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  // معرّف المشروع مدخل من الرابط ⇒ يُمرَّر كـ query مُرمَّز فقط، ولا
  // يُستعمل في أي جلب بيانات على هذا المسار.
  redirect(`/${locale}/projects?project=${encodeURIComponent(id)}`);
}
