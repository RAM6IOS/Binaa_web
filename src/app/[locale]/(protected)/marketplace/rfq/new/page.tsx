"use client";

import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/routing";

export default function RFQWizardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <div>
        <Link href="/marketplace" className="text-blue-600 hover:underline flex items-center gap-2 mb-4 text-sm font-medium">
          {isAr ? <><ArrowRight className="w-4 h-4"/> رجوع للسوق</> : <><ArrowLeft className="w-4 h-4"/> Retour au marché</>}
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">
          {isAr ? 'طلب عرض سعر جديد (RFQ)' : 'Nouvelle Demande de Devis (RFQ)'}
        </h2>
        <p className="text-slate-500 mt-2">
          {isAr ? 'املأ التفاصيل التالية لنشر طلب عرض سعر للشركات والمقاولين.' : 'Remplissez les détails suivants pour publier un appel d\'offres.'}
        </p>
      </div>

      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -z-10 -translate-y-1/2" />
        <div className="absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 -translate-y-1/2 transition-all" style={{ width: `${(step - 1) * 50}%` }} />
        
        {[1, 2, 3].map((s) => (
          <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm outline outline-4 outline-white dark:outline-slate-950 ${s <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            {s < step ? <CheckCircle2 className="w-5 h-5"/> : s}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && (isAr ? 'التفاصيل الأساسية' : 'Détails de base')}
            {step === 2 && (isAr ? 'المتطلبات والمرفقات' : 'Exigences et pièces jointes')}
            {step === 3 && (isAr ? 'المراجعة والنشر' : 'Examen et publication')}
          </CardTitle>
          <CardDescription>
            {step === 1 && (isAr ? 'حدد طبيعة العمل وموقعه' : 'Définissez la nature du travail et son emplacement')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{isAr ? 'عنوان الطلب' : 'Titre de la demande'}</label>
                <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" placeholder={isAr ? 'مثال: أعمال بناء أساسية في ولاية الجزائر...' : 'Ex: Gros œuvres à Alger...'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{isAr ? 'نوع الخدمة' : 'Type de service'}</label>
                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500">
                  <option>{isAr ? 'أشغال كبرى' : 'Gros œuvre'}</option>
                  <option>{isAr ? 'أشغال التشطيب' : 'Second œuvre'}</option>
                  <option>{isAr ? 'تأجير معدات' : 'Location de matériel'}</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? 'الميزانية التقديرية (دج)' : 'Budget estimé (DZD)'}</label>
                  <input type="number" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? 'موعد التسليم' : 'Date limite'}</label>
                  <input type="date" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-slate-500 text-center py-10 border-2 border-dashed rounded-lg">
              <p>[File Upload & Detailed Description Mockup]</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-slate-500 text-center py-10 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
              <p>[Review Form Information Mockup]</p>
              <p className="text-sm">{isAr ? 'جاهز للنشر' : 'Prêt à publier'}</p>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
            {isAr ? 'السابق' : 'Précédent'}
          </Button>
          <Button onClick={() => setStep(s => Math.min(3, s + 1))}>
            {step === 3 ? (isAr ? 'نشر الطلب' : 'Publier') : (isAr ? 'التالي' : 'Suivant')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
