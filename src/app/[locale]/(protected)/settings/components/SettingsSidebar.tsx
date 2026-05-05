"use client";

import { cn } from "@/lib/utils";
import { User, Building2, Bell, ShieldCheck, CreditCard } from "lucide-react";

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  locale: string;
}

export function SettingsSidebar({ activeSection, onSectionChange, locale }: SettingsSidebarProps) {
  const isAr = locale === 'ar';

  const sections = [
    { id: 'profile', label: isAr ? 'الإعدادات الشخصية' : 'Profil', icon: User },
    // Temporarily hidden as requested
    // { id: 'company', label: isAr ? 'إعدادات الشركة' : 'Entreprise', icon: Building2 },
    // { id: 'notifications', label: isAr ? 'إعدادات الإشعارات' : 'Notifications', icon: Bell },
    // { id: 'security', label: isAr ? 'الأمان والحساب' : 'Sécurité', icon: ShieldCheck },
    // { id: 'billing', label: isAr ? 'الفوترة والاشتراك' : 'Facturation', icon: CreditCard },
  ];

  return (
    <nav className="flex flex-col space-y-1">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
