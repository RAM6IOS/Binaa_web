"use client";

import { Equipment } from "@/lib/types/projects";
import { MapPin, Calendar, Tag, Star, Wrench, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EquipmentCardProps {
  equipment: Equipment & { distance?: number };
  isAr: boolean;
  onBook: (equipment: Equipment) => void;
  onViewDetails?: (equipment: Equipment) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  excavation:    "bg-amber-500/10 text-amber-600 border-amber-200",
  lifting:       "bg-blue-500/10 text-blue-600 border-blue-200",
  transport:     "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  concrete:      "bg-slate-500/10 text-slate-600 border-slate-200",
  earthmoving:   "bg-orange-500/10 text-orange-600 border-orange-200",
  compaction:    "bg-purple-500/10 text-purple-600 border-purple-200",
  default:       "bg-sky-500/10 text-sky-600 border-sky-200",
};

const CATEGORY_LABELS_AR: Record<string, string> = {
  excavation:  "حفر وتجريف",
  lifting:     "رفع ومناولة",
  transport:   "نقل وشحن",
  concrete:    "خرسانة وبناء",
  earthmoving: "تحريك التراب",
  compaction:  "رصف ودمك",
};

export function EquipmentCard({ equipment, isAr, onBook, onViewDetails }: EquipmentCardProps) {
  const rate = equipment.rent_daily_rate || equipment.daily_rate;
  const colorClass = CATEGORY_COLORS[equipment.category] || CATEGORY_COLORS.default;
  const categoryLabel = isAr
    ? (CATEGORY_LABELS_AR[equipment.category] || equipment.category)
    : equipment.category;

  return (
    <div className={cn(
      "group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800",
      "shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
    )}>
      {/* Status strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

      {/* Image / Placeholder */}
      <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
        {equipment.photo_url ? (
          <img
            src={equipment.photo_url}
            alt={equipment.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Wrench className="w-16 h-16 text-slate-300 dark:text-slate-700" />
          </div>
        )}

        {/* Category badge */}
        <span className={cn(
          "absolute top-3 start-3 px-2.5 py-1 rounded-full text-xs font-semibold border",
          colorClass
        )}>
          {categoryLabel}
        </span>

        {/* Distance badge */}
        {equipment.distance !== undefined && (
          <span className="absolute top-3 end-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/50 text-white backdrop-blur-sm flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {equipment.distance < 1
              ? `${Math.round(equipment.distance * 1000)} م`
              : `${equipment.distance.toFixed(1)} كم`}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight line-clamp-1">
            {equipment.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {equipment.brand} {equipment.model && `· ${equipment.model}`}
            {equipment.year_of_manufacture && ` · ${equipment.year_of_manufacture}`}
          </p>
        </div>

        {equipment.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {equipment.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{equipment.wilaya}</span>
          {equipment.current_location && (
            <span className="text-slate-400">— {equipment.current_location}</span>
          )}
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            equipment.status === 'available'
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              equipment.status === 'available' ? "bg-emerald-500" : "bg-amber-500"
            )} />
            {equipment.status === 'available'
              ? (isAr ? "متاحة الآن" : "Disponible")
              : (isAr ? "مشغولة" : "Occupée")
            }
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {rate.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">DZD/{isAr ? "يوم" : "jour"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onViewDetails(equipment)}
              >
                {isAr ? "التفاصيل" : "Détails"}
              </Button>
            )}
            <Button
              size="sm"
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={() => onBook(equipment)}
              disabled={equipment.status !== 'available'}
            >
              <Calendar className="w-3.5 h-3.5" />
              {isAr ? "احجز الآن" : "Réserver"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
