"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Globe, LogOut } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NotificationDropdown } from "./NotificationDropdown";

export function Header({ 
  locale, 
  userEmail,
  avatarUrl,
  fullName
}: { 
  locale: string; 
  userEmail?: string;
  avatarUrl?: string | null;
  fullName?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'fr' : 'ar';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <header className="h-16 border-b bg-white dark:bg-slate-900 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex font-semibold text-lg text-slate-800 dark:text-slate-100 items-center gap-4">
        {/* Mobile Sidebar Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side={locale === 'ar' ? 'right' : 'left'} className="p-0 w-64 border-none">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navigation sidebar</SheetDescription>
              <Sidebar locale={locale} className="static inset-0 w-full h-full" />
            </SheetContent>
          </Sheet>
        </div>
        {/* Could insert dynamic page title here based on route */}
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={toggleLocale} className="gap-2">
          <Globe className="w-4 h-4" />
          {locale === 'ar' ? 'Français' : 'العربية'}
        </Button>
        
        {/* نظام الإشعارات المتكامل */}
        <NotificationDropdown locale={locale} />
        
        <LogoutButton 
          variant="ghost" 
          className="text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
        />

        <Avatar className="w-10 h-10 border-2 border-blue-200 dark:border-blue-800" title={fullName || userEmail}>
          <AvatarImage src={avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold">
            {fullName ? fullName.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : 'ME')}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
