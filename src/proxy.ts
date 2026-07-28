import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  let response = await intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch {
    session = null;
  }

  if (session) {
    supabase.auth.getUser().catch(() => {});
  }

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
  matcher: ['/', '/(ar|fr)/:path*']
};
