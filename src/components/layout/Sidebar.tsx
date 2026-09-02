"use client";

import { Link, usePathname } from "@/i18n/routing";
import { Building2, LayoutDashboard, Briefcase, FileText, PieChart, Users, Construction, Settings, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar({ locale, className }: { locale: string; className?: string }) {
  const pathname = usePathname();
  const isAr = locale === 'ar';

  const menuItems = [
    { name: isAr ? 'لوحة القيادة' : 'Tableau de bord', href: '/projects/dashboard', icon: LayoutDashboard },
    { name: isAr ? 'المشاريع' : 'Projets', href: '/projects', icon: Briefcase },
    { name: isAr ? 'العمال' : 'العمال / Ouvriers', href: '/projects/workers', icon: Users },
    { name: isAr ? 'العتاد' : 'Équipement', href: '/projects/equipment', icon: Construction },
    { name: isAr ? 'تسجيل الحضور' : 'Pointage / Présence', href: '/pointage', icon: Clock },
    { name: isAr ? 'الإعدادات' : 'Paramètres', href: '/settings', icon: Settings },
  ];

  return (
    <aside className={cn("fixed inset-y-0 w-64 bg-inverse text-inverse-foreground flex flex-col border-r border-inverse-foreground/10 rtl:border-l rtl:border-r-0 z-40", className)}>
      <div className="h-16 flex items-center px-6 border-b border-inverse-foreground/10 gap-3">
        <Building2 className="w-8 h-8 text-primary" />
        <span className="text-xl font-bold tracking-tight">Binaa SaaS</span>
      </div>
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          // Check if there is another menu item that is a more specific match for the current path
          const hasMoreSpecificMatch = menuItems.some(
            (menuItem) =>
              menuItem.href !== item.href &&
              menuItem.href.startsWith(item.href) &&
              pathname.startsWith(menuItem.href)
          );
          const isActive = !hasMoreSpecificMatch && pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-inverse-foreground/70 hover:bg-inverse-foreground/10 hover:text-inverse-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      

    </aside>
  );
}
