"use client";

import { Link, usePathname } from "@/i18n/routing";
import { Tractor, Package, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { use } from "react";

interface RentLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

const TABS = [
  {
    href: "/rent/market",
    icon: Tractor,
    labelAr: "سوق المعدات",
    labelFr: "Marché Matériels",
    descAr: "تصفح المعدات المتاحة للإيجار",
    descFr: "Parcourir les matériels disponibles",
  },
  {
    href: "/rent/my-equipment",
    icon: Package,
    labelAr: "معداتي",
    labelFr: "Mon Matériel",
    descAr: "إدارة عروض التأجير الخاصة بك",
    descFr: "Gérer vos annonces de location",
  },
  {
    href: "/rent/my-rentals",
    icon: CalendarDays,
    labelAr: "حجوزاتي",
    labelFr: "Mes Réservations",
    descAr: "متابعة طلبات الاستئجار",
    descFr: "Suivre vos demandes de location",
  },
];

export default function RentLayout({ children, params }: RentLayoutProps) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const pathname = usePathname();

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Page Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white">
        {/* Decorative circles */}
        <div className="absolute -top-8 -end-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -start-6 w-56 h-56 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Tractor className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">
                {isAr ? "سوق تأجير المعدات" : "Marché de Location de Matériel"}
              </h1>
              <p className="text-emerald-100 text-sm mt-0.5">
                {isAr
                  ? "استأجر أو أجّر معداتك بكل سهولة مع مقاولين موثوقين"
                  : "Louez ou proposez votre matériel à des entrepreneurs vérifiés"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300",
                "border",
                isActive
                  ? "border-emerald-500"
                  : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:text-emerald-600"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isAr ? tab.labelAr : tab.labelFr}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
