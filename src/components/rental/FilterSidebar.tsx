"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const WILAYAS = [
  "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار",
  "البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر",
  "الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة",
  "قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض",
  "إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي",
  "خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تيموشنت",
  "غرداية","غليزان","تيميمون","برج باجي مختار","أولاد جلال","بني عباس",
  "عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة",
];

const CATEGORIES = [
  { value: "excavation", labelAr: "حفر وتجريف", labelFr: "Excavation" },
  { value: "lifting",    labelAr: "رفع ومناولة",  labelFr: "Levage" },
  { value: "transport",  labelAr: "نقل وشحن",     labelFr: "Transport" },
  { value: "concrete",   labelAr: "خرسانة وبناء", labelFr: "Béton" },
  { value: "earthmoving",labelAr: "تحريك التراب", labelFr: "Terrassement" },
  { value: "compaction", labelAr: "رصف ودمك",     labelFr: "Compactage" },
];

export interface RentalFilters {
  category: string;
  wilaya: string;
  minPrice: string;
  maxPrice: string;
  availability: string;
}

interface FilterSidebarProps {
  filters: RentalFilters;
  onChange: (filters: RentalFilters) => void;
  onReset: () => void;
  isAr: boolean;
  className?: string;
}

export function FilterSidebar({ filters, onChange, onReset, isAr, className }: FilterSidebarProps) {
  const update = (key: keyof RentalFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const hasActiveFilters = Object.values(filters).some(v => v && v !== 'all');

  return (
    <aside className={cn(
      "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800",
      "p-5 space-y-6 shadow-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
          <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
          {isAr ? "فلترة النتائج" : "Filtrer les résultats"}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            {isAr ? "مسح" : "Réinitialiser"}
          </button>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isAr ? "نوع المعدة" : "Catégorie"}
        </Label>
        <div className="space-y-1.5">
          <FilterChip
            label={isAr ? "الكل" : "Toutes"}
            active={!filters.category || filters.category === 'all'}
            onClick={() => update('category', 'all')}
          />
          {CATEGORIES.map(cat => (
            <FilterChip
              key={cat.value}
              label={isAr ? cat.labelAr : cat.labelFr}
              active={filters.category === cat.value}
              onClick={() => update('category', cat.value)}
            />
          ))}
        </div>
      </div>

      {/* Wilaya */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isAr ? "الولاية" : "Wilaya"}
        </Label>
        <select
          value={filters.wilaya}
          onChange={e => update('wilaya', e.target.value)}
          className={cn(
            "w-full rounded-lg border border-slate-200 dark:border-slate-700",
            "bg-slate-50 dark:bg-slate-800 text-sm p-2.5",
            "focus:ring-2 focus:ring-emerald-500 focus:outline-none",
            "text-slate-700 dark:text-slate-200"
          )}
        >
          <option value="all">{isAr ? "كل الولايات" : "Toutes les wilayas"}</option>
          {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isAr ? "السعر اليومي (DZD)" : "Tarif journalier (DZD)"}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder={isAr ? "من" : "Min"}
            value={filters.minPrice}
            onChange={e => update('minPrice', e.target.value)}
            className={cn(
              "rounded-lg border border-slate-200 dark:border-slate-700",
              "bg-slate-50 dark:bg-slate-800 text-sm p-2",
              "focus:ring-2 focus:ring-emerald-500 focus:outline-none",
              "text-slate-700 dark:text-slate-200 w-full"
            )}
          />
          <input
            type="number"
            min="0"
            placeholder={isAr ? "إلى" : "Max"}
            value={filters.maxPrice}
            onChange={e => update('maxPrice', e.target.value)}
            className={cn(
              "rounded-lg border border-slate-200 dark:border-slate-700",
              "bg-slate-50 dark:bg-slate-800 text-sm p-2",
              "focus:ring-2 focus:ring-emerald-500 focus:outline-none",
              "text-slate-700 dark:text-slate-200 w-full"
            )}
          />
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isAr ? "الحالة" : "Disponibilité"}
        </Label>
        <div className="space-y-1.5">
          {[
            { value: 'all',       labelAr: 'الكل',         labelFr: 'Toutes' },
            { value: 'available', labelAr: 'متاحة الآن',  labelFr: 'Disponible' },
            { value: 'in_use',    labelAr: 'قيد الاستخدام', labelFr: 'En cours' },
          ].map(opt => (
            <FilterChip
              key={opt.value}
              label={isAr ? opt.labelAr : opt.labelFr}
              active={filters.availability === opt.value}
              onClick={() => update('availability', opt.value)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-start px-3 py-2 rounded-lg text-sm transition-all duration-200",
        active
          ? "bg-emerald-500 text-white font-semibold shadow-sm"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}
