"use client";

import { Link } from "@/i18n/routing";
import { CopySlash, MapPin, Star, ShieldCheck, Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const CONTRACTORS = [
  {
    id: "c-1",
    name: "SARL Bâtiment Moderne Algérie",
    rating: 4.8,
    reviews: 124,
    size: "Grande Entreprise",
    wilaya: "Alger (16)",
    services: ["Gros œuvres", "Terrassement", "Génie civil"],
    verified: true,
  },
  {
    id: "c-2",
    name: "EURL Travaux Publics Oranais",
    rating: 4.5,
    reviews: 89,
    size: "Moyenne Entreprise",
    wilaya: "Oran (31)",
    services: ["Route", "Assainissement"],
    verified: true,
  },
  {
    id: "c-3",
    name: "Bureau d'Études Archicréa",
    rating: 4.9,
    reviews: 210,
    size: "Petite Entreprise",
    wilaya: "Sétif (19)",
    services: ["Architecture", "Étude de sol", "Suivi de chantier"],
    verified: false,
  }
];

import { use } from "react";

export default function MarketplacePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-primary/5 dark:bg-primary/10 border rounded-2xl p-8 md:p-12 flex flex-col items-center text-center space-y-6">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isAr ? 'ابحث عن أفضل المقاولين والموردين' : 'Trouvez les meilleurs entrepreneurs et fournisseurs'}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
          {isAr 
            ? 'اكتشف الدليل الشامل لشركات البناء والأشغال العمومية في الجزائر. اطلب عروض الأسعار بكل سهولة.' 
            : 'Découvrez l\'annuaire complet des entreprises de BTP en Algérie. Demandez des devis en toute simplicité.'}
        </p>
        
        <div className="w-full max-w-3xl flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rtl:right-3 rtl:left-auto" />
            <input 
              type="text" 
              placeholder={isAr ? 'ما الذي تبحث عنه؟ (مثال: أشغال كبرى، مهندس...)' : 'Que cherchez-vous ? (ex: Gros Œuvre, Architecte...)'} 
              className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-slate-950 text-base rtl:pr-10 rtl:pl-4 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="relative w-full sm:w-48 hidden sm:block">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rtl:right-3 rtl:left-auto" />
            <input 
              type="text" 
              placeholder={isAr ? 'الولاية...' : 'Wilaya...'} 
              className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-slate-950 text-base rtl:pr-10 rtl:pl-4 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <Button size="lg" className="w-full sm:w-auto h-auto py-3">
            {isAr ? 'بحث' : 'Rechercher'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 space-y-6 flex-shrink-0">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Filter className="w-4 h-4"/> {isAr ? 'الفلاتر' : 'Filtres'}</h3>
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p className="font-medium text-slate-700 dark:text-slate-300">{isAr ? 'نوع الخدمة' : 'Type de service'}</p>
                {['البناء والطرق', 'التصميم المعماري', 'توريد المواد'].map(f => (
                  <label key={f} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <input type="checkbox" className="rounded" /> {f}
                  </label>
                ))}
              </div>
              <div className="space-y-2 text-sm border-t pt-4">
                <p className="font-medium text-slate-700 dark:text-slate-300">{isAr ? 'حجم الشركة' : 'Taille de l\'entreprise'}</p>
                 {['كبيرة', 'متوسطة', 'صغيرة'].map(f => (
                  <label key={f} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <input type="checkbox" className="rounded" /> {f}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Directory Listing */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">{isAr ? 'الشركات المتاحة' : 'Entreprises disponibles'}</h3>
            <Link href="/marketplace/rfq/new">
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                {isAr ? 'طرح طلب عروض (RFQ)' : 'Soumettre un RFQ'}
              </Button>
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {CONTRACTORS.map(contractor => (
              <Card key={contractor.id} className="hover:shadow-lg transition-shadow duration-300 flex flex-col">
                <CardContent className="pt-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full border bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400 shrink-0">
                        {contractor.name[0]}
                      </div>
                      <div>
                        <Link href={`/marketplace/contractor/${contractor.id}`} className="font-semibold text-lg leading-tight hover:text-blue-600 flex items-center gap-2">
                          {contractor.name}
                          {contractor.verified && <ShieldCheck className="w-4 h-4 text-green-500" />}
                        </Link>
                        <div className="flex items-center gap-1 text-sm text-yellow-500 mt-1">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-medium">{contractor.rating}</span>
                          <span className="text-slate-500">({contractor.reviews})</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {contractor.wilaya}</span>
                          <span>{contractor.size}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {contractor.services.map(s => (
                      <span key={s} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-slate-50 dark:bg-slate-900/50 p-4 shrink-0 flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs">{isAr ? 'عرض الملف' : 'Voir le profil'}</Button>
                  <Button className="flex-1 text-xs">{isAr ? 'طلب عرض سعر' : 'Demander un devis'}</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
