/**
 * فحص الاتصال الموثوق:
 * - نقطتا فحص بديلتان: مورد محلي سريع ثم نقاط Supabase (حتى 401 تثبت الاتصال).
 * - مهلة أوسع من السابقة (3ث → 6ث) حتى لا يفشل الفحص أثناء تجميع الخادم.
 * - دمج الفحوص المتزامنة وتخمين النتيجة لثوانٍ لتجنّب قصف الخادم.
 *
 * ملاحظة: هذا الفحص يُستخدم للشريط وقرارات الكتابة فقط. قراءة القوائم
 * «الخادم أولاً» ولا تُحجب به أبداً (انظر خدمات البيانات).
 */

const PROBE_TIMEOUT_MS = 6000;
const RESULT_TTL_MS = 3000;

let inFlightProbe: Promise<boolean> | null = null;
let cachedResult: { at: number; online: boolean } | null = null;

function probeUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  return fetch(url, {
    method: 'HEAD',
    cache: 'no-store',
    signal: controller.signal,
  })
    .then((response) => {
      clearTimeout(timeoutId);
      return response.ok;
    })
    .catch(() => {
      clearTimeout(timeoutId);
      return false;
    });
}

async function probeConnectivity(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!navigator.onLine) return false;

  // محلي سريع ودون قيود CORS
  if (await probeUrl('/manifest.json')) return true;

  // فحص ثانٍ عبر نقاط Supabase: الوصول حتى بـ 401 (غير مصادق) يثبت الاتصال الفعلي،
  // لأنه يستلزم بلوغ الخادم عوض البقاء داخل المتصفح (SW/كاش محلي).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      return response.status >= 200 && response.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return false;
}

export async function checkNetworkStatus(): Promise<boolean> {
  if (cachedResult && Date.now() - cachedResult.at < RESULT_TTL_MS) {
    return cachedResult.online;
  }
  if (inFlightProbe) return inFlightProbe;

  inFlightProbe = probeConnectivity().then((online) => {
    cachedResult = { at: Date.now(), online };
    inFlightProbe = null;
    return online;
  });
  return inFlightProbe;
}

/**
 * هل الخطأ خطأ شبكة حقيقي (انقطاع/مهلة) أم خطأ تطبيق (RLS/فصل/قيود)؟
 * نستخدمه للتراجع إلى التخزين المحلي عند فشل حقيقي فقط، دون إخفاء
 * أخطاء الصلاحية/البيانات الصادقة التي يجب عرضها للمستخدم.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { message?: string; name?: string; code?: string; status?: number };
  const message = String(e?.message ?? e ?? '');
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('fetch failed') ||
    message.includes('Connection reset') ||
    message.includes('timed out') ||
    e?.name === 'TypeError' ||
    e?.name === 'AbortError' ||
    e?.code === 'TypeError' ||
    e?.code === 'ERR_NETWORK' ||
    e?.status === 0
  );
}