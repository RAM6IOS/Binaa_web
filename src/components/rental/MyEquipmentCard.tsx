"use client";

import { Equipment, EquipmentRental } from "@/lib/types/projects";
import { Wrench, MapPin, Edit3, Pause, Play, Trash2, ChevronDown, ChevronUp, Banknote, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RentalRequestCard } from "./RentalRequestCard";
import { RentalStatus } from "@/lib/types/projects";
import { useState } from "react";
import { toast } from "sonner";

interface MyEquipmentCardProps {
  equipment: Equipment & { incoming_requests: EquipmentRental[] };
  isAr: boolean;
  onEdit: (equipment: Equipment) => void;
  onToggle: (equipment: Equipment, isForRent: boolean) => void;
  onStatusUpdate: (rentalId: string, status: RentalStatus) => void;
  isLoading?: boolean;
}

export function MyEquipmentCard({
  equipment, isAr, onEdit, onToggle, onStatusUpdate, isLoading
}: MyEquipmentCardProps) {
  const [showRequests, setShowRequests] = useState(false);
  const pendingCount = equipment.incoming_requests?.filter(r => r.status === 'pending').length ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-5">
        {/* Image */}
        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
          {equipment.photo_url ? (
            <img src={equipment.photo_url} alt={equipment.name} className="w-full h-full object-cover" />
          ) : (
            <Wrench className="w-7 h-7 text-slate-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{equipment.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{equipment.brand} {equipment.model}</p>
            </div>
            {/* Active badge */}
            <span className={cn(
              "shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full",
              equipment.is_for_rent
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}>
              {equipment.is_for_rent ? (isAr ? "نشط" : "Actif") : (isAr ? "متوقف" : "Inactif")}
            </span>
          </div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Banknote className="w-3 h-3 text-emerald-500" />
              <strong className="text-slate-700 dark:text-slate-300">{equipment.rent_daily_rate?.toLocaleString()} DZD</strong>
              /{isAr ? "يوم" : "j"}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              {equipment.wilaya}
            </span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <Clock className="w-3 h-3" />
                {pendingCount} {isAr ? "طلب معلق" : "en attente"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-5 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => onEdit(equipment)}
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isAr ? "تعديل" : "Modifier"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className={cn(
            "gap-1.5 text-xs",
            equipment.is_for_rent
              ? "text-amber-600 border-amber-200 hover:bg-amber-50"
              : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          )}
          onClick={() => onToggle(equipment, !equipment.is_for_rent)}
          disabled={isLoading}
        >
          {equipment.is_for_rent
            ? <><Pause className="w-3.5 h-3.5" />{isAr ? "إيقاف" : "Désactiver"}</>
            : <><Play className="w-3.5 h-3.5" />{isAr ? "تفعيل" : "Activer"}</>
          }
        </Button>

        {equipment.incoming_requests?.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs ms-auto"
            onClick={() => setShowRequests(s => !s)}
          >
            {showRequests ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isAr
              ? `الطلبات (${equipment.incoming_requests.length})`
              : `Demandes (${equipment.incoming_requests.length})`}
          </Button>
        )}
      </div>

      {/* Incoming requests */}
      {showRequests && equipment.incoming_requests?.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isAr ? "طلبات التأجير الواردة" : "Demandes de location reçues"}
          </p>
          {equipment.incoming_requests.map(req => (
            <RentalRequestCard
              key={req.id}
              rental={req}
              isAr={isAr}
              isOwner={true}
              onUpdateStatus={onStatusUpdate}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
