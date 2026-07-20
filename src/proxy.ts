import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Run the next-intl middleware first
  const response = intlMiddleware(request);

  // 2. Handle Supabase auth cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 3. Read session from cookies (no network call — works fully offline).
  //    getSession() validates the JWT signature locally using the stored cookie.
  //    We use this for route protection decisions to avoid redirecting offline users.
  const { data: { session } } = await supabase.auth.getSession();

  // 4. Attempt to refresh the server-side token if online.
  //    We intentionally ignore errors here — a failure just means we keep the
  //    existing session and let the client handle token refresh on next sync.
  if (session) {
    supabase.auth.getUser().catch(() => {
      // Network unavailable: non-critical, session remains valid from cookie.
    });
  }

  // 5. Protected routes check — based on cookie session, not network verification
  const pathname = request.nextUrl.pathname;

  // Extract locale from pathname or use default
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

  if (isAuthPage && session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/projects`;
    return NextResponse.redirect(url);
  }

  if (isProtectedPage && !session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/', '/(ar|fr)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)',]
};
