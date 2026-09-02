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
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
