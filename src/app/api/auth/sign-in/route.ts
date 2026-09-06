import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';

/** تحديد لغة الوجهة من صفحة الدخول التي أرسلت النموذج (Referer). */
function localeFrom(request: NextRequest): string {
  const referer = request.headers.get('referer') ?? '';
  const match = referer.match(/\/(ar|fr)\//);
  return match ? match[1] : routing.defaultLocale;
}

/**
 * POST /api/auth/sign-in
 *
 * تثبيت الجلسة عبر الخادم وإعادة التوجيه بـ 303 (أعلى المستوى):
 *  - الكوكي تُكتب عبر setAll على استجابة التوجيه نفسها، فيتبعها المتصفح
 *    حاملاً الكوكي إلى /projects فوراً — دون نافذة فقدها عند التنقّل.
 *  - نمط مطابق تماماً لمسار Google (auth/callback): exchangeCode ثم redirect.
 *
 * أخطاء المصادقة تعيد إلى صفحة الدخول مع وسم error ليعرض التوست بالواجهة.
 */
export async function POST(request: NextRequest) {
  const locale = localeFrom(request);
  const loginUrl = new URL(`/${locale}/auth/login`, request.url);
  loginUrl.searchParams.set('error', 'invalid_credentials');

  let email = '';
  let password = '';

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    email = String(body?.email ?? '');
    password = String(body?.password ?? '');
  } else {
    const form = await request.formData().catch(() => new FormData());
    email = String(form.get('email') ?? '');
    password = String(form.get('password') ?? '');
  }

  email = email.trim();
  if (!email || !password) {
    return NextResponse.redirect(loginUrl, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(loginUrl, 303);
  }

  return NextResponse.redirect(new URL(`/${locale}/projects`, request.url), 303);
}