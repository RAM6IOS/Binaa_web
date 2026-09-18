"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { teamService } from "@/lib/services/team-service";

/**
 * إشعار يظهر عندما لا يملك المستخدم عضوية شركة نشطة:
 * القوائم تُقرأ حينها بمدى الحساب الشخصي (تعويض غير صامت)،
 * فيوضح الإشعار السبب بدل جدول/data فارغ محيّر تحت الشمس.
 * لون + أيقونة + نص — لا نعتمد اللون وحده.
 */
export function CompanyScopeNotice({ isAr }: { isAr: boolean }) {
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    teamService
      .getMyMembership()
      .then((m) => { if (mounted) setHasCompany(Boolean(m)); })
      .catch(() => { if (mounted) setHasCompany(false); });
    return () => { mounted = false; };
  }, []);

  if (hasCompany !== false) return null;

  return (
    <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg px-4 py-3" role="status">
      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      <div className="text-sm min-w-0">
        <p className="font-bold text-warning">
          {isAr ? 'حسابك غير مرتبط بشركة بعد' : "Votre compte n'est lié à aucune entreprise"}
        </p>
        <p className="text-muted-foreground mt-0.5">
          {isAr
            ? 'تُعرض بياناتك الشخصية فقط. تواصل مع مالك الشركة لمنحك صلاحية العمل ضمن فريقها، أو افتح'
            : "Seules vos données personnelles s'affichent. Contactez le propriétaire de votre entreprise pour intégrer son équipe, ou ouvrez la "}
          <Link
            href={`/${isAr ? 'ar' : 'fr'}/team`}
            className="text-warning font-bold underline underline-offset-2"
          >
            {isAr ? 'إدارة الفريق' : 'gestion de l’équipe'}
          </Link>
          {isAr ? ' للتفاصيل.' : '.'}
        </p>
      </div>
    </div>
  );
}