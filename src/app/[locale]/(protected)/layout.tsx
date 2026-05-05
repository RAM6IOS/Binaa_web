import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userEmail = user?.email;
  
  let avatarUrl = null;
  let fullName = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      avatarUrl = profile.avatar_url;
      fullName = profile.full_name;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
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
