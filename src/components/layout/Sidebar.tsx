"use client";

import { Link, usePathname } from "@/i18n/routing";
import { Building2, LayoutDashboard, Briefcase, FileText, PieChart, Users, Construction, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const isAr = locale === 'ar';

  const menuItems = [
    { name: isAr ? 'لوحة القيادة' : 'Tableau de bord', href: '/projects/dashboard', icon: LayoutDashboard },
    { name: isAr ? 'المشاريع' : 'Projets', href: '/projects', icon: Briefcase },
    { name: isAr ? 'العمال' : 'العمال / Ouvriers', href: '/projects/workers', icon: Users },
    { name: isAr ? 'العتاد' : 'Équipement', href: '/projects/equipment', icon: Construction },
    { name: isAr ? 'الإعدادات' : 'Paramètres', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 rtl:border-l rtl:border-r-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <Building2 className="w-8 h-8 text-blue-500" />
        <span className="text-xl font-bold tracking-tight">Binaa SaaS</span>
      </div>
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
