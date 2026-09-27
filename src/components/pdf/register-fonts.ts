import { Font } from "@react-pdf/renderer";

/**
 * تسجيل خط Cairo مرة واحدة لكل التطبيق.
 *
 * كان مكرراً داخل كل مكوّن من مكوّنات PDF الخمسة، أي أن تبديل الخط كان
 * عملية يدوية في خمسة مواضع. التسجيل يجب أن يسبق أي تحميل للخط، لأن
 * FontSource.load() يحفظ نتيجته ولا يعيد التحميل إن سُجل خط بعده.
 */
let isRegistered = false;

export function registerPdfFonts(): void {
  if (isRegistered) return;
  isRegistered = true;

  Font.register({
    family: "Cairo",
    fonts: [
      { src: "/fonts/Cairo-Variable.ttf", fontWeight: 400 },
      { src: "/fonts/Cairo-Variable.ttf", fontWeight: 700 },
    ],
  });
}

/**
 * يضمن أن خط Cairo محمّل فعلياً قبل بناء المستند. بدون هذه الانتظار قد يبني
 * react-pdf المستند بخط افتراضي (Helvetica) لأن ملف الخط ما زال يُحمّل، فيخرج
 * PDF بعربية مكسورة.
 */
export async function ensurePdfFontsLoaded(): Promise<void> {
  registerPdfFonts();
  await Font.getFont({ fontFamily: "Cairo" }).load();
}
