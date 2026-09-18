"use client";

import { useEffect, useRef } from "react";
import { usePWA } from "@/components/providers/PWAProvider";

interface UseAutoRefreshOptions {
  /** يُستدعى بصمت (دون شاشة تحميل) عند عودة الاتصال عبر تأكيد حقيقي. */
  onReconnect?: () => void;
  /** يُستدعى بصمت عند عودة التركيز/الوضوح للنافذة — يقلّد استئناف المؤقّتات. */
  onFocus?: () => void;
}

/**
 * يعيد جلب بيانات الصفحة تلقائياً في لحظتين:
 * 1) عودة الاتصال (offline → online عبر PWAProvider، المدفوعة بتأكيد حقيقي للطلبات).
 * 2) عودة النافذة/التبويب للوضوح — لأن المتصفح يعلّق مؤقّتات الخلفية،
 *    فتُعاد القراءة من الخادم (لن تُرتَك قائمة قديمة/فارغة معلّقة).
 */
export function useAutoRefresh({ onReconnect, onFocus }: UseAutoRefreshOptions) {
  const { isOnline } = usePWA();
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      onReconnect?.();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, onReconnect]);

  useEffect(() => {
    if (!onFocus) return;
    const handleVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [onFocus]);
}