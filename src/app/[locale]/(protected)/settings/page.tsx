"use client";

import { useState } from "react";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { ProfileSettings } from "./components/ProfileSettings";
import { CompanySettings } from "./components/CompanySettings";
import { NotificationSettings } from "./components/NotificationSettings";
import { SecuritySettings } from "./components/SecuritySettings";
import { BillingSettings } from "./components/BillingSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { use } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const [activeSection, setActiveSection] = useState('profile');

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSettings locale={locale} />;
      case 'company': return <CompanySettings locale={locale} />;
      case 'notifications': return <NotificationSettings locale={locale} />;
      case 'security': return <SecuritySettings locale={locale} />;
      case 'billing': return <BillingSettings locale={locale} />;
      default: return <ProfileSettings locale={locale} />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAr ? 'الإعدادات' : 'Paramètres'}
          </h1>
          <p className="text-slate-500">
            {isAr ? 'تخصيص وإدارة حسابك ومنصتك' : 'Personnalisez et gérez votre compte et votre plateforme'}
          </p>
        </div>
        <LogoutButton variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-12 gap-8 items-start">
        <div className="col-span-3">
          <SettingsSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
            locale={locale} 
          />
        </div>
        <div className="col-span-9 bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          {renderSection()}
        </div>
      </div>

      {/* Mobile Layout (No Tabs as extra sections are hidden) */}
      <div className="md:hidden">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
