import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { parseSessionFromCookieEntries } from "@/lib/auth/session-cookie";

export default async function ProtectedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // قراءة الجلسة محلياً من الكوكيز (لا شبكة) — ينجو المستخدم المسجَّل من
  // إعادة التحميل/التنقّل عند الانقطاع. التوجيه يحرسه الـ proxy.
  const cookieStore = await cookies();
  const parsed = parseSessionFromCookieEntries(
    cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
  );

  const userEmail = parsed.valid ? parsed.session?.user?.email ?? undefined : undefined;

  let avatarUrl = null;
  let fullName = null;

  if (parsed.valid && parsed.session?.user?.id) {
    try {
      // جلب ملف المستخدم هو الوحيد الذي يبقى شبكياً؛ فشله (انقطاع) لا يُسقط
      // الصفحة — نعرض رأساً بلا صورة/اسم.
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', parsed.session.user.id)
        .single();

      if (profile) {
        avatarUrl = profile.avatar_url;
        fullName = profile.full_name;
      }
    } catch {
      // Offline: نكمل برأس أساسي بدل إفشال الصفحة.
    }
  }

  return (
    <div className="min-h-screen bg-background flex transition-colors">
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar locale={locale} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header locale={locale} userEmail={userEmail} avatarUrl={avatarUrl} fullName={fullName} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}