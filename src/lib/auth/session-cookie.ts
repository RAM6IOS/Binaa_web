/**
 * تحليل جلسة Supabase محلياً من الكوكيز دون أي استدعاء شبكي.
 *
 * لماذا: الحارس (proxy/layout) كان يستدعي supabase.auth.getUser() — طلب شبكة
 * يَفشل عند انقطاع الإنترنت فيعيد توجيه المستخدم حتى لو كانت جلسته سليمة.
 * هذا الملف يقرر «هل توجد جلسة قابلة للاستخدام؟» من الكوكيز فقط.
 *
 * الحدود الأمنية المتعَمَّدة (تُراجع شخصياً):
 *  - القرار هنا قرار «توجيه» فقط. حماية البيانات الفعلية تبقى عبر RLS وسجلات
 *    Supabase نفسها (تطلب توقيعاً صالحاً) — لا يُمنح أي وصول للبيانات بفضل هذا.
 *  - نعتبر الجلسة صالحة إذا وُجد refresh_token (لمنتهٍ صلاحيته) — وليس بناءً على
 *    انتهاء access_token (~ساعة) حتى تستمر النافذة Offline 24h دون إقصاء خاطئ.
 *  - كوكيزٌ تالفة أو منتهية نهائياً تُعلَم ليُمسحها المتصل (تعالج «قفل حذف
 *    الكوكيز اليدوي») لا أن تُعامل بوصفها جلسة صالحة مطلقاً.
 */

/**
 * الاسم الحقيقي لكوكي جلسة Supabase. القاعدة في @supabase/supabase-js:
 * defaultStorageKey = `sb-${hostname.split('.')[0]}-auth-token` — أي
 * «sb-<project-ref>-auth-token»، وليست مفتاح localStorage (supabase.authln).
 */
function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

const PROJECT_REF =
  projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
  'sazpcswwafnqanbsyhon';

export const SESSION_COOKIE_KEY = `sb-${PROJECT_REF}-auth-token`;

/**
 * أسماء كوكيز كانت تكتبها إصدارات سابقة (@supabase/ssr القديمة ومفتاح
 * localStorage `supabase.authln`). تُقبل احتياطاً حتى لا تُقصى جلسات قديمة
 * فجأة، وتُمسح تلقائياً (عبر getSessionChunkNames) عندما تصبح تالفة/منتهية.
 */
export const LEGACY_SESSION_COOKIE_KEYS = [
  'supabase.authln',
  'supabase.auth.token',
];

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
}

export interface SessionCookieParseResult {
  /** هل وُجدت كوكية الجلسة أصلاً (حتى لو تالفة)؟ */
  hasSessionCookie: boolean;
  /** هل الجلسة قابلة للاستخدام؟ */
  valid: boolean;
  /** سبب الإبطال عندما تكون الكوكية موجودة لكن غير صالحة. */
  reason?: 'decode' | 'json' | 'no-refresh' | 'expired';
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    user?: { id?: string; email?: string | null };
  };
}

/** كل أسماء قطع الجلسة (الحالية والقديمة) لإثبات الوجود/المسح. */
export function getSessionChunkNames(): string[] {
  return [SESSION_COOKIE_KEY, ...LEGACY_SESSION_COOKIE_KEYS].flatMap((key) => [
    key,
    ...Array.from({ length: 5 }, (_, i) => `${key}.${i}`),
  ]);
}

function chunksForKeys(entries: { name: string; value: string }[], key: string) {
  return entries
    .filter(
      (c) => c.name === key || c.name.startsWith(`${key}.`)
    )
    .sort((a, b) => {
      if (a.name === key) return -1;
      if (b.name === key) return 1;
      return (
        parseInt(a.name.slice(key.length + 1), 10) -
        parseInt(b.name.slice(key.length + 1), 10)
      );
    });
}

function getRefreshExpiry(session: any): number | null {
  if (typeof session.refresh_expires_at === 'number' && Number.isFinite(session.refresh_expires_at)) {
    return session.refresh_expires_at;
  }
  if (typeof session.refresh_token === 'string') {
    const payload = decodeJwtPayload(session.refresh_token);
    if (payload && typeof payload.exp === 'number') return payload.exp;
  }
  return null;
}

/**
 * حلّل جلسة Supabase من قائمة كوكيز (اسم، قيمة). يُستدعى من الـ proxy
 * وشجرة الخادم حيث يكون المتصل مختلفاً (NextRequest vs next/headers).
 */
export function parseSessionFromCookieEntries(
  entries: { name: string; value: string }[]
): SessionCookieParseResult {
  const primaryChunks = chunksForKeys(entries, SESSION_COOKIE_KEY);
  // نعتمد عائلة الاسم الحديث أولاً؛ العائلة القديمة فقط عند غياب الحديثة.
  const chunks =
    primaryChunks.length > 0
      ? primaryChunks
      : LEGACY_SESSION_COOKIE_KEYS.map((key) => chunksForKeys(entries, key)).find(
          (c) => c.length > 0
        ) ?? [];

  if (chunks.length === 0) {
    return { hasSessionCookie: false, valid: false };
  }

  const raw = chunks.map((c) => c.value).join('');

  let decoded: string;
  try {
    decoded = raw.startsWith('base64-')
      ? decodeBase64Url(raw.slice('base64-'.length))
      : raw;
  } catch {
    return { hasSessionCookie: true, valid: false, reason: 'decode' };
  }

  let session: any;
  try {
    session = JSON.parse(decoded);
  } catch {
    return { hasSessionCookie: true, valid: false, reason: 'json' };
  }

  if (!session?.refresh_token) {
    return { hasSessionCookie: true, valid: false, reason: 'no-refresh' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const refreshExp = getRefreshExpiry(session);
  if (refreshExp !== null && nowSec > refreshExp) {
    return { hasSessionCookie: true, valid: false, reason: 'expired' };
  }

  return {
    hasSessionCookie: true,
    valid: true,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user?.id,
        email: session.user?.email ?? null,
      },
    },
  };
}