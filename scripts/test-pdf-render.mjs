// ═══════════════════════════════════════════════════════════════════
// حارس انحدار لتوليد PDF: خط Cairo + نص عربي (bidi reordering)
//
// التشغيل: node scripts/test-pdf-render.mjs  (أو npm run test:pdf)
//
// لماذا هذا الحارس موجود:
//   في textkit@6.2.0 انكسرت عملية bidi reordering (reorderLine ← getItemAtIndex
//   يُرجع undefined ثم تُقرأ .id من undefined)، فتنهار كل مستندات PDF العربية.
//   الخلل في الحزمة العابرة لا في كودنا، لذلك npm لا ينبّهنا: لا اختبار ولا
//   ترقية إجبارية. هذا السكربت يفشل فور عودة الخلل.
//
//   مرجع: https://github.com/diegomura/react-pdf/issues/3050
//
// ما لا يغطيه هذا السكربت:
//   انهيار "memory access out of bounds" في yoga WASM — يحدث في المتصفح
//   فقط (Node يستخدم yoga asm.js). سببه التوليد عند التركيب لا عند الطلب،
//   وقد أُصلح في usePdfDownload.
// ═══════════════════════════════════════════════════════════════════

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { renderToBuffer, Document, Page, Text, Font } = require("@react-pdf/renderer");
const textkitVersion = require("@react-pdf/textkit/package.json").version;

const h = React.createElement;

const FONT_PATH = path.join(projectRoot, "public", "fonts", "Cairo-Variable.ttf");

Font.register({
  family: "Cairo",
  fonts: [
    { src: FONT_PATH, fontWeight: 400 },
    { src: FONT_PATH, fontWeight: 700 },
  ],
});

// نفس خطورة النصوص في SituationOfficialPDF: فرنسي + أرقام + عربي داخل نفس
// المستند، لأن bidi reordering هو المسار المتعطّل لا ترميز العربية وحده.
const buildDocument = () =>
  h(
    Document,
    null,
    h(
      Page,
      { style: { fontFamily: "Cairo", fontSize: 11, padding: 20 } },
      h(Text, null, "Situation N° 12 — مشروع توسيع الطريق الوطني"),
      h(Text, null, "Maître d'Ouvrage: ministrye des travaux publics"),
      h(Text, null, "RC N°: 0999160001234567"),
      h(Text, null, "المبلغ المصادق عليه: 1 250 000,00 دج"),
      h(Text, { style: { fontWeight: 700 } }, "Arrêté la présente situation à la somme de : 850 000,00 DZD"),
      h(Text, null, "أوقّع عليها بتاريخ 12/03/2026")
    )
  );

let failed = false;

try {
  const buffer = await renderToBuffer(buildDocument());
  const isRealPdf = Buffer.from(buffer).subarray(0, 5).toString() === "%PDF-";
  if (!isRealPdf) {
    console.error("✗ الناتج ليس ملف PDF صالحاً.");
    failed = true;
  } else {
    console.log(`✓ تم توليد PDF بالعربية (${buffer.length} بايت) — textkit@${textkitVersion}`);
  }
} catch (error) {
  failed = true;
  console.error(`✗ فشل توليد PDF — textkit@${textkitVersion}`);
  console.error(`  ${error?.message ?? error}`);
  console.error(
    "  إن كان الخطأ 'Cannot read properties of undefined (reading id)' فهو انحدار textkit:\n" +
      "  ثبّت الإصدار العامل في package.json عبر overrides ثم أعد تشغيل هذا السكربت."
  );
}

process.exit(failed ? 1 : 0);
