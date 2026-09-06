/**
 * «نافذة العمل دون اتصال» — سياسة زمنية تُحد من العمل offline بعد آخر اتصال ناجح.
 *
 * التصميم المعتمَد:
 *  - العدّاد يُحسب من «آخر اتصال ناجح» (آخر عملية بيانات حقيقية نجحت مع الخادم).
 *  - بعد تجاوز النافذة: القراءة المحلية تبقى متاحة، والكتابة تُمنع بردّ رسالة واضحة.
 *  - مدة النافذة قابلة للضبط عبر NEXT_PUBLIC_OFFLINE_WINDOW_HOURS (الافتراضي 24).
 *
 * ملاحظة أمنية: توقيت الجهاز يُستخدم فقط لتقارير عرض النافذة هنا؛ ولا يُتخذ
 * قرار حساس أمني (مثل رفض تسجيل دخول) بناءً عليه.
 */

const STORAGE_KEY = 'binaa:lastOnlineSyncAt';

const DEFAULT_WINDOW_HOURS = 24;
const MS_PER_HOUR = 3_600_000;

export const OFFLINE_WINDOW_HOURS = (() => {
  const raw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_OFFLINE_WINDOW_HOURS
      : undefined;
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WINDOW_HOURS;
})();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/** آخر اتصال ناجح (ملي ثانية)، أو null في أول استخدام أو عند تعذر التخزين. */
export function getLastOnlineSyncAt(): number | null {
  if (!isBrowser()) return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) return null;
  const ts = Number(value);
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

/**
 * يُسجّل «آخر اتصال ناجح» الآن. يُستدعى فقط عند نجاح عملية بيانات حقيقية مع
 * الخادم (ولو كما isCheckNetworkStatus، لأن مجرد ping قد ينجح دون جلسة صالحة).
 */
export function markOnlineSync(): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // localStorage غير متاح (مثل وضع التصفح الخاص) — نتجاهل بلا إنهيار.
  }
}

export interface OfflineWindowStatus {
  withinWindow: boolean;
  lastOnlineSyncAt: number | null;
  remainingMs: number;
}

export function getOfflineWindowStatus(
  now: number = Date.now()
): OfflineWindowStatus {
  const last = getLastOnlineSyncAt();

  // لا سجل سابق: نتعامل بتسامح (لا نبدأ ساعة الحظر بلا أساس) بدل منع مستخدم مشروع.
  if (last === null) {
    return {
      withinWindow: true,
      lastOnlineSyncAt: null,
      remainingMs: OFFLINE_WINDOW_HOURS * MS_PER_HOUR,
    };
  }

  const remainingMs = OFFLINE_WINDOW_HOURS * MS_PER_HOUR - (now - last);
  return {
    withinWindow: remainingMs > 0,
    lastOnlineSyncAt: last,
    remainingMs: Math.max(0, remainingMs),
  };
}

/** يرمي خطأً واضحاً باللغة العربية إذا تجاوزنا النافذة دون اتصال. */
export function assertOfflineWriteAllowed(now: number = Date.now()): void {
  const { withinWindow } = getOfflineWindowStatus(now);
  if (!withinWindow) {
    throw new Error(
      'انتهت مهلة العمل دون اتصال. عدّ للاتصال بالإنترنت للمزامنة قبل إجراء تغييرات جديدة.'
    );
  }
}

/** نص مقروء بالعربية يصف الوقت المتبقي (مثلاً «18 ساعة»). */
export function formatOfflineRemaining(remainingMs: number): string {
  const hours = Math.floor(remainingMs / MS_PER_HOUR);
  if (hours >= 1) return `${hours} ساعة`;
  const minutes = Math.max(1, Math.floor(remainingMs / 60_000));
  return `${minutes} دقيقة`;
}