"use client";

import { EquipmentRental, RentalStatus } from "@/lib/types/projects";
import {
  CheckCircle2, XCircle, Clock, Loader2, PlayCircle,
  CalendarDays, Banknote, User, Briefcase, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface RentalRequestCardProps {
  rental: EquipmentRental;
  isAr: boolean;
  isOwner: boolean; // true = نظرة المالك (يرى المستأجر)، false = نظرة المستأجر
  onUpdateStatus?: (rentalId: string, status: RentalStatus) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<RentalStatus, {
  labelAr: string; labelFr: string;
  icon: React.ElementType;
  color: string; bg: string;
}> = {
  pending:   { labelAr: "بانتظار الموافقة", labelFr: "En attente",  icon: Clock,          color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  approved:  { labelAr: "تمت الموافقة",     labelFr: "Approuvée",   icon: CheckCircle2,   color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"     },
  ongoing:   { labelAr: "جارية الآن",       labelFr: "En cours",    icon: PlayCircle,     color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200"                 },
  completed: { labelAr: "مكتملة",           labelFr: "Terminée",    icon: CheckCircle2,   color: "text-slate-600",  bg: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"   },
  rejected:  { labelAr: "مرفوضة",           labelFr: "Refusée",     icon: XCircle,        color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"        },
};

export function RentalRequestCard({ rental, isAr, isOwner, onUpdateStatus, isLoading }: RentalRequestCardProps) {
  const config = STATUS_CONFIG[rental.status];
  const StatusIcon = config.icon;

  const fmtDate = (d: string) =>
    format(new Date(d), "d MMM yyyy", { locale: isAr ? ar : undefined });

  const person = isOwner
    ? rental.renter?.full_name || "—"
    : rental.owner?.full_name || "—";

  return (
    <div className={cn(
      "rounded-2xl border p-5 bg-white dark:bg-slate-900",
      "shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4"
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
            {rental.equipment?.name || "—"}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {rental.equipment?.brand} {rental.equipment?.model}
          </p>
        </div>

        {/* Status badge */}
        <span className={cn(
          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
          config.bg, config.color
        )}>
          <StatusIcon className="w-3.5 h-3.5" />
          {isAr ? config.labelAr : config.labelFr}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{fmtDate(rental.start_date)} ← {fmtDate(rental.end_date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Banknote className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {rental.total_cost.toLocaleString()} DZD
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span>{isOwner ? (isAr ? "المستأجر: " : "Locataire: ") : (isAr ? "المالك: " : "Propriétaire: ")}{person}</span>
        </div>
        {rental.project && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="truncate">{rental.project.name}</span>
          </div>
        )}
      </div>

      {rental.notes && (
        <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
          {rental.notes}
        </p>
      )}

      {/* Action buttons (owner only for pending) */}
      {isOwner && rental.status === 'pending' && onUpdateStatus && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5"
            onClick={() => onUpdateStatus(rental.id, 'approved')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isAr ? "قبول الطلب" : "Accepter"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-9 gap-1.5"
            onClick={() => onUpdateStatus(rental.id, 'rejected')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            {isAr ? "رفض" : "Refuser"}
          </Button>
        </div>
      )}

      {/* Complete button for ongoing */}
      {(isOwner || !isOwner) && rental.status === 'ongoing' && onUpdateStatus && (
        <Button
          size="sm"
          className="w-full bg-slate-700 hover:bg-slate-800 text-white text-xs h-9 gap-1.5"
          onClick={() => onUpdateStatus(rental.id, 'completed')}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {isAr ? "تأكيد اكتمال التأجير" : "Confirmer la fin de location"}
        </Button>
      )}
    </div>
  );
}
