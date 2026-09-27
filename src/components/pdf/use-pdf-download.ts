"use client";

import { useCallback, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { ensurePdfFontsLoaded } from "./register-fonts";

type UsePdfDownloadOptions = {
  /** يبني مستند PDF عند الطلب فقط. لا يُستدعى إلا عند ضغط المستخدم. */
  buildDocument: () => React.ReactElement;
  fileName: string;
  isAr?: boolean;
};

/**
 * توليد PDF عند الطلب، لا عند تركيب المكوّن.
 *
 * لماذا لا نستخدم PDFDownloadLink: هو يولّد المستند فور التركيب ويسجّل
 * مستمعاً يُعيد التوليد عند كل تغيير. داخل قائمة situations أو daily logs
 * يعني ذلك توليد N مستندات بلا أن يضغط المستخدم زراً واحداً، وفي كل توليد
 * ينشئ @react-pdf/layout نسخة Yoga جديدة على الذاكرة المشتركة لـ WASM دون
 * تحريرها، حتى ينهار المتصفح بـ memory access out of bounds.
 *
 * التوليد عند الطلب يُبقي الذاكرة مرتبطة بعدد الضغطات الفعلية.
 */
export function usePdfDownload({ buildDocument, fileName, isAr = false }: UsePdfDownloadOptions) {
  const [isGenerating, setIsGenerating] = useState(false);

  const download = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      await ensurePdfFontsLoaded();
      const blob = await pdf(buildDocument()).toBlob();

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success(isAr ? "تم تحميل الملف" : "Fichier téléchargé");
    } catch (error) {
      console.error("[PDF] فشل التوليد:", error);
      toast.error(
        isAr
          ? "تعذّر توليد الملف. حاول مرة أخرى."
          : "Échec de la génération du fichier. Réessayez."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [buildDocument, fileName, isAr, isGenerating]);

  return { download, isGenerating };
}
