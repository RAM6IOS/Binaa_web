import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionChunkNames,
  parseSessionFromCookieEntries,
} from '@/lib/auth/session-cookie';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  let response = await intlMiddleware(request);

  // تُحلَل الجلسة محلياً من الكوكيز — بلا أي استدعاء شبكي — حتى ينجو
  // المستخدم المسجَّل من إعادة التحميل/التنقّل عند انقطاع الإنترنت.
  const cookieEntries = request.cookies.getAll().map((c) => ({
    name: c.name,
    value: c.value,
  }));
  const parsed = parseSessionFromCookieEntries(cookieEntries);
  const user = parsed.valid
    ? { id: parsed.session?.user?.id ?? 'session' }
    : null;

  // كوكيز جلسة عالقة/تالفة/منتهية: تُمسح تلقائياً لتعالج «قفل حذف الكوكيز اليدوي».
  const staleChunkNames = parsed.hasSessionCookie && !parsed.valid
    ? cookieEntries
        .map((c) => c.name)
        .filter((name) => getSessionChunkNames().includes(name))
    : [];
  const clearStaleSession = staleChunkNames.length > 0;

  const applyStaleClear = (res: NextResponse) => {
    if (!clearStaleSession) return res;
    for (const name of staleChunkNames) {
      res.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
    return res;
  };

  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(ar|fr)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  const isAuthPage = pathname.includes('/auth/login') || pathname.includes('/auth/register');
  const isProtectedPage =
    pathname.includes('/projects') ||
    pathname.includes('/settings') ||
    pathname.includes('/workers') ||
    pathname.includes('/equipment') ||
    pathname.includes('/dashboard') ||
    pathname.includes('/marketplace') ||
    pathname.includes('/pointage');

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/projects`;
    return applyStaleClear(NextResponse.redirect(url));
  }

  if (isProtectedPage && !user) {
    // حالة شاذة: ارتداد مع وجود كوكيز جلسة — يوحي بمشكلة تثبيت/نقل
    // لا بانتهاء جلسة؛ نُسجّله كمرجع ميداني.
    if (parsed.hasSessionCookie) {
      console.log(
        `[proxy] protected bounce WITH session cookies: path=${pathname} reason=${parsed.reason ?? 'n/a'}`
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return applyStaleClear(NextResponse.redirect(url));
  }

  return applyStaleClear(response);
}

export const config = {
  matcher: ['/', '/(ar|fr)/:path*']
};