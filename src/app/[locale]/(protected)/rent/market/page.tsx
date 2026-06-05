"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Equipment } from "@/lib/types/projects";
import { EquipmentCard } from "@/components/rental/EquipmentCard";
import { FilterSidebar, RentalFilters } from "@/components/rental/FilterSidebar";
import { BookingModal } from "@/components/rental/BookingModal";
import {
  Search, MapPin, LayoutGrid, Map as MapIcon,
  Loader2, AlertCircle, SlidersHorizontal, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamic import for map to avoid SSR issues
const RentalMap = dynamic(
  () => import("@/components/rental/RentalMap").then(m => m.RentalMap),
  { ssr: false, loading: () => <div className="w-full h-96 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" /> }
);

const DEFAULT_FILTERS: RentalFilters = {
  category: "all",
  wilaya: "all",
  minPrice: "",
  maxPrice: "",
  availability: "all",
};

export default function RentalMarketPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === "ar";

  const [equipment, setEquipment] = useState<(Equipment & { distance?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<RentalFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Fetch equipment
  const fetchEquipment = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "all") params.set("category", filters.category);
      if (filters.wilaya && filters.wilaya !== "all") params.set("wilaya", filters.wilaya);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (searchQuery) params.set("q", searchQuery);
      if (userLocation) {
        params.set("lat", userLocation.lat.toString());
        params.set("lon", userLocation.lon.toString());
      }

      const res = await fetch(`/api/rentals/available?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      let list = data.equipment as (Equipment & { distance?: number })[];

      // Client-side availability filter
      if (filters.availability && filters.availability !== "all") {
        list = list.filter(e => e.status === filters.availability);
      }

      setEquipment(list);
    } catch (err: any) {
      setError(err.message || (isAr ? "حدث خطأ في التحميل" : "Erreur de chargement"));
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery, userLocation, isAr]);

  useEffect(() => {
    const timer = setTimeout(() => fetchEquipment(), 300);
    return () => clearTimeout(timer);
  }, [fetchEquipment]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {}
    );
  };

  const handleBook = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setIsBookingOpen(true);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
  };

  const hasActiveFilters = searchQuery || Object.entries(filters).some(([, v]) => v && v !== "all");

  return (
    <div className="space-y-4">
      {/* Search + Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAr ? "ابحث باسم المعدة، الماركة، الموديل..." : "Rechercher par nom, marque, modèle..."}
            className={cn(
              "w-full ps-10 pe-4 py-2.5 rounded-xl border text-sm",
              "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
              "focus:ring-2 focus:ring-emerald-500 focus:outline-none",
              "text-slate-700 dark:text-slate-200 placeholder-slate-400"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            className="gap-1.5 text-xs h-10"
            title={isAr ? "استخدم موقعي" : "Utiliser ma position"}
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            {userLocation ? (isAr ? "موقعك نشط" : "Position active") : (isAr ? "قريب مني" : "Près de moi")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(s => !s)}
            className={cn("gap-1.5 text-xs h-10 md:hidden", showFilters && "border-emerald-400 text-emerald-600")}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {isAr ? "فلاتر" : "Filtres"}
          </Button>
          <div className="flex border rounded-xl overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={cn("p-2.5", view === "grid" ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
              title={isAr ? "شبكة" : "Grille"}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("map")}
              className={cn("p-2.5", view === "map" ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
              title={isAr ? "خريطة" : "Carte"}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {isAr
              ? `${equipment.length} معدة متاحة`
              : `${equipment.length} matériel(s) disponible(s)`}
          </span>
          {hasActiveFilters && (
            <button onClick={handleResetFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
              <X className="w-3 h-3" />
              {isAr ? "مسح الفلاتر" : "Réinitialiser"}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar filters – desktop always visible, mobile toggled */}
        <div className={cn("w-64 shrink-0", !showFilters && "hidden md:block")}>
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
            isAr={isAr}
            className="sticky top-4"
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <p className="text-sm">{isAr ? "جاري تحميل المعدات..." : "Chargement des matériels..."}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-red-500">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchEquipment}>
                {isAr ? "إعادة المحاولة" : "Réessayer"}
              </Button>
            </div>
          ) : equipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <span className="text-4xl">🚜</span>
              </div>
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">
                {isAr ? "لا توجد معدات متاحة" : "Aucun matériel disponible"}
              </p>
              <p className="text-sm text-center max-w-xs">
                {isAr
                  ? "جرّب تغيير الفلاتر أو توسيع نطاق البحث"
                  : "Essayez de modifier les filtres ou d'élargir la recherche"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  {isAr ? "مسح كل الفلاتر" : "Effacer les filtres"}
                </Button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {equipment.map(eq => (
                <EquipmentCard
                  key={eq.id}
                  equipment={eq}
                  isAr={isAr}
                  onBook={handleBook}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm" style={{ height: "600px" }}>
              <RentalMap
                equipment={equipment}
                userLocation={userLocation || undefined}
                onMarkerClick={handleBook}
                isAr={isAr}
              />
            </div>
          )}
        </div>
      </div>

      {/* Booking modal */}
      {selectedEquipment && (
        <BookingModal
          equipment={selectedEquipment}
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          isAr={isAr}
          onSuccess={fetchEquipment}
        />
      )}
    </div>
  );
}
