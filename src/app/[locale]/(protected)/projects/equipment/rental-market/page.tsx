"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Truck, Navigation, Filter, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { rentalService } from "@/lib/services/rental-service";
import { Equipment } from "@/lib/types/projects";
import { BookingModal } from "@/components/rental/BookingModal";
import { toast } from "sonner";

export default function RentalMarketPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [equipmentList, setEquipmentList] = useState<(Equipment & { distance?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [wilayaFilter, setWilayaFilter] = useState("all");
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  // GPS geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Booking Modal State
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const fetchRentalEquipment = async () => {
    setIsLoading(true);
    try {
      const data = await rentalService.getAvailableEquipment({
        category: categoryFilter,
        wilaya: wilayaFilter,
        searchQuery,
        maxPrice,
        userLat: userCoords?.lat,
        userLon: userCoords?.lon,
      });
      setEquipmentList(data);
    } catch (err) {
      toast.error(isAr ? "فشل تحميل المعدات المتاحة" : "Échec du chargement des matériels");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRentalEquipment();
  }, [categoryFilter, wilayaFilter, searchQuery, maxPrice, userCoords]);

  // تفعيل الـ GPS لحساب المسافة وعرض الأقرب
  const handleGpsSearch = () => {
    if (!navigator.geolocation) {
      toast.error(isAr ? "متصفحك لا يدعم تحديد الموقع الجغرافي" : "La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsLocating(false);
        toast.success(isAr ? "تم تحديد موقعك! تم ترتيب المعدات حسب الأقرب." : "Position acquise ! Matériel trié par proximité.");
      },
      (error) => {
        console.error("GPS error:", error);
        setIsLocating(false);
        toast.error(isAr ? "تعذر الوصول إلى موقعك الجغرافي" : "Impossible d'accéder à votre position GPS");
      },
      { enableHighAccuracy: true }
    );
  };

  const categories = Array.from(new Set(equipmentList.map((e) => e.category))).filter(Boolean);
  const wilayas = Array.from(new Set(equipmentList.map((e) => e.wilaya))).filter(Boolean);

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* رأس الصفحة وزر العودة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <Link href="/projects/equipment" className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 mb-1">
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isAr ? "العودة لأسطول العتاد" : "Retour à ma flotte"}
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {isAr ? "سوق تأجير المعدات" : "Marché de location de matériel"}
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            {isAr 
              ? "ابحث عن العتاد الثقيل المتوفر للتأجير في الجزائر واحجزه لمشروعك" 
              : "Recherchez et réservez des engins lourds disponibles à la location en Algérie"}
          </p>
        </div>

        {/* زر التموضع بالـ GPS */}
        <Button 
          variant={userCoords ? "default" : "outline"} 
          className="gap-2 shrink-0 h-10 bg-blue-600 hover:bg-blue-700 text-white" 
          onClick={handleGpsSearch}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {isAr ? "البحث عن القريب مني (GPS)" : "Trouver à proximité (GPS)"}
        </Button>
      </div>

      {/* شريط الفلترة والبحث */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border">
        {/* حقل البحث النصي */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "ابحث بالاسم أو الموديل..." : "Nom, modèle, marque..."}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-md text-sm rtl:pr-10 rtl:pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
          />
        </div>

        {/* فلترة بالفئة */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder={isAr ? "كل الفئات" : "Toutes les catégories"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الفئات" : "Toutes les catégories"}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* فلترة بالولاية */}
        <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
          <SelectTrigger>
            <SelectValue placeholder={isAr ? "كل الولايات" : "Toutes les wilayas"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes les wilayas"}</SelectItem>
            {wilayas.map((w) => (
              <SelectItem key={w} value={w}>{w}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* فلترة بالحد الأقصى للسعر */}
        <Select 
          value={maxPrice ? maxPrice.toString() : "all"} 
          onValueChange={(val) => setMaxPrice(val === "all" ? undefined : Number(val))}
        >
          <SelectTrigger>
            <SelectValue placeholder={isAr ? "السعر اليومي الأقصى" : "Prix max journalier"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الأسعار" : "Tous les prix"}</SelectItem>
            <SelectItem value="15000">{isAr ? "أقل من 15,000 دج" : "Moins de 15 000 DZD"}</SelectItem>
            <SelectItem value="25000">{isAr ? "أقل من 25,000 دج" : "Moins de 25 000 DZD"}</SelectItem>
            <SelectItem value="50000">{isAr ? "أقل من 50,000 دج" : "Moins de 50 000 DZD"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* قائمة المنتجات المعروضة */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">{isAr ? "جاري تحميل سوق التأجير..." : "Chargement du marché..."}</p>
        </div>
      ) : equipmentList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-16 text-center text-slate-500 flex flex-col items-center gap-3">
          <Truck className="w-16 h-16 text-slate-300" />
          <p className="font-bold text-lg">{isAr ? "لا توجد معدات معروضة للتأجير حالياً" : "Aucun matériel disponible à la location"}</p>
          <p className="text-sm max-w-sm">
            {isAr 
              ? "جرب تعديل خيارات البحث أو قم بتغيير الفلاتر للعثور على معدات أخرى." 
              : "Essayez de modifier vos filtres ou termes de recherche pour trouver du matériel."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipmentList.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-all duration-300 flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
              {/* صورة المعدة */}
              <div className="h-48 w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b relative">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Truck className="w-12 h-12 text-slate-400" />
                )}
                {/* شارة الفئة */}
                <span className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md">
                  {item.category}
                </span>

                {/* شارة المسافة GPS */}
                {item.distance !== undefined && (
                  <span className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Navigation className="w-3 h-3 fill-current" />
                    {item.distance.toFixed(1)} {isAr ? "كم بعيداً" : "km"}
                  </span>
                )}
              </div>

              {/* تفاصيل المعدة */}
              <CardContent className="pt-5 flex-1 space-y-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {item.brand} {item.model}
                  </p>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-red-500" /> {item.wilaya}
                  </span>
                  <span>
                    {isAr ? "سنة الصنع:" : "Année:"} {item.year_of_manufacture || "-"}
                  </span>
                </div>
              </CardContent>

              {/* السعر وزر الحجز */}
              <CardFooter className="border-t bg-slate-50 dark:bg-slate-900/50 p-4 shrink-0 flex justify-between items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">{isAr ? "الأجر اليومي" : "Taux Journalier"}</span>
                  <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                    {(item.rent_daily_rate || item.daily_rate).toLocaleString()} <span className="text-[10px] font-normal">DZD</span>
                  </span>
                </div>

                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 h-9 px-4 shrink-0 gap-1.5"
                  onClick={() => {
                    setSelectedEquipment(item);
                    setIsBookingOpen(true);
                  }}
                >
                  {isAr ? "احجز الآن" : "Réserver"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* نموذج الحجز التفاعلي */}
      {selectedEquipment && (
        <BookingModal
          equipment={selectedEquipment}
          isOpen={isBookingOpen}
          onClose={() => {
            setIsBookingOpen(false);
            setSelectedEquipment(null);
          }}
          isAr={isAr}
          onSuccess={fetchRentalEquipment}
        />
      )}
    </div>
  );
}
