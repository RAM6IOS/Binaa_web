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

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Protected routes check
  const pathname = request.nextUrl.pathname;
  
  // Extract locale from pathname or use default
  const localeMatch = pathname.match(/^\/(ar|fr)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  const isAuthPage = pathname.includes('/auth/login') || pathname.includes('/auth/register');
  const isProtectedPage = pathname.includes('/projects') || 
                         pathname.includes('/settings') || 
                         pathname.includes('/workers') || 
                         pathname.includes('/equipment') || 
                         pathname.includes('/dashboard') ||
                         pathname.includes('/marketplace');

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/projects`;
    return NextResponse.redirect(url);
  }

  if (isProtectedPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/', '/(ar|fr)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};

