"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Crown, Zap, AlertCircle } from "lucide-react";

export function BillingSettings({ locale }: { locale: string }) {
  const isAr = locale === 'ar';

  const usage = [
    { label: isAr ? 'المشاريع' : 'Projets', current: 3, limit: 5, color: "bg-blue-600" },
    { label: isAr ? 'العمال' : 'Ouvriers', current: 45, limit: 100, color: "bg-green-600" },
    { label: isAr ? 'العتاد' : 'Équipements', current: 12, limit: 20, color: "bg-purple-600" },
  ];

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-bold">
          {isAr ? 'الفوترة والاشتراك' : 'Facturation & Abonnement'}
        </CardTitle>
        <CardDescription>
          {isAr ? 'إدارة خطة الاشتراك واستهلاك الموارد' : 'Gérez votre abonnement et suivez votre consommation de ressources'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-0">
        {/* Current Plan */}
        <section className="p-6 bg-slate-900 text-white rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Crown className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="px-3 py-1 bg-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                {isAr ? 'الخطة الحالية' : 'Plan actuel'}
              </span>
              <h3 className="text-3xl font-bold mt-2">Binaa Pro</h3>
              <p className="text-slate-400 mt-1">
                {isAr ? 'تجديد الاشتراك في: 12 ماي 2026' : 'Prochaine facturation : 12 Mai 2026'}
              </p>
            </div>
            <Button className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-8 py-6 rounded-xl">
              <Zap className="w-4 h-4 mr-2 rtl:ml-2 fill-current" />
              {isAr ? 'ترقية الخطة' : 'Passer à l\'offre Business'}
            </Button>
          </div>
        </section>

        {/* Usage Stats */}
        <section className="space-y-6">
          <h3 className="text-lg font-semibold">{isAr ? 'ملخص الاستخدام' : 'Résumé de l\'utilisation'}</h3>
          <div className="grid gap-6">
            {usage.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className="text-slate-500">{item.current} / {item.limit}</span>
                </div>
                <Progress value={(item.current / item.limit) * 100} className="h-2 bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </section>

        {/* Features list */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
            <div className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{isAr ? 'مشاريع غير محدودة' : 'Projets illimités'}</p>
              <p className="text-xs text-slate-500">{isAr ? 'قريباً في خطة Business' : 'Bientôt disponible'}</p>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
            <div className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{isAr ? 'تقارير متقدمة' : 'Rapports avancés'}</p>
              <p className="text-xs text-slate-500">{isAr ? 'مفعلة حالياً' : 'Activé'}</p>
            </div>
          </div>
        </section>

        {/* Info */}
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/20 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>
            {isAr 
              ? 'تصلك فواتير الاشتراك عبر البريد الإلكتروني المسجل في الحساب تلقائياً كل شهر.' 
              : 'Les factures sont envoyées automatiquement par email chaque mois.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
