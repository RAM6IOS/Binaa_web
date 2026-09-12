"use client";

import { useState, useEffect } from "react";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { ProfileSettings } from "./components/ProfileSettings";
import { CompanySettings } from "./components/CompanySettings";
import { NotificationSettings } from "./components/NotificationSettings";
import { SecuritySettings } from "./components/SecuritySettings";
import { BillingSettings } from "./components/BillingSettings";
import { TeamSettings } from "./components/TeamSettings";
import { use } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { teamService } from "@/lib/services/team-service";
import { can } from "@/lib/auth/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users } from "lucide-react";

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const [activeSection, setActiveSection] = useState('profile');
  const [canManageTeam, setCanManageTeam] = useState(false);

  useEffect(() => {
    let mounted = true;
    teamService
      .getMyMembership()
      .then((m) => {
        if (mounted) setCanManageTeam(!!m && can(m.role, 'manage_team'));
      })
      .catch(() => setCanManageTeam(false));
    return () => {
      mounted = false;
    };
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSettings locale={locale} />;
      case 'team': return canManageTeam ? <TeamSettings locale={locale} /> : <ProfileSettings locale={locale} />;
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isAr ? 'الإعدادات' : 'Paramètres'}
          </h1>
          <p className="text-muted-foreground">
            {isAr ? 'تخصيص وإدارة حسابك ومنصتك' : 'Personnalisez et gérez votre compte et votre plateforme'}
          </p>
        </div>
        <LogoutButton variant="destructive" />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-12 gap-8 items-start">
        <div className="col-span-3">
          <SettingsSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
            locale={locale} 
            canManageTeam={canManageTeam}
          />
        </div>
        <div className="col-span-9 bg-card p-8 rounded-lg shadow-sm border">
          {renderSection()}
        </div>
      </div>

      {/* Mobile Layout: مبدّل أقسام + محتوى */}
      <div className="space-y-4 md:hidden">
        <Select value={activeSection} onValueChange={setActiveSection}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profile">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {isAr ? 'الإعدادات الشخصية' : 'Profil'}
              </span>
            </SelectItem>
            {canManageTeam ? (
              <SelectItem value="team">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {isAr ? 'الفريق' : 'Équipe'}
                </span>
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
