"use client";

import { cn } from "@/lib/utils";
import { Clock, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DayShift, getShiftVariant, STATUS_STYLES } from "./schedule-types";

interface ShiftBlockProps {
  shift: DayShift | null;
  isToday: boolean;
  isAr: boolean;
  compact?: boolean;
  onClick?: () => void;
}

function formatTime(time?: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function ShiftBlock({ shift, isToday, isAr, compact, onClick }: ShiftBlockProps) {
  const variant = getShiftVariant(shift, isToday);
  const styles = STATUS_STYLES[variant];
  const hasData = shift && shift.status;

  const content = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border transition-all text-start group",
        compact ? "min-h-[52px] p-1.5" : "min-h-[72px] p-2",
        styles.bg,
        styles.border,
        styles.text,
        isToday && variant !== "empty" && "ring-2 ring-offset-1 ring-emerald-400/50",
        variant === "shift" && "shadow-sm",
        onClick && "hover:brightness-95 cursor-pointer",
        variant === "empty" && onClick && "hover:bg-yellow-50 hover:border-yellow-300"
      )}
    >
      {variant === "empty" ? (
        <div className="flex flex-col items-center justify-center h-full gap-0.5 pt-1">
          <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity text-slate-400" />
          <span className="text-[10px] opacity-40 group-hover:opacity-70">
            {isAr ? "إضافة" : "Ajouter"}
          </span>
        </div>
      ) : variant === "absent" ? (
        <div className="flex flex-col items-center justify-center h-full">
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
            {isAr ? "غائب" : "Absent"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 h-full justify-center">
          {shift?.checkIn && (
            <span className={cn("font-bold leading-tight", compact ? "text-[10px]" : "text-xs")}>
              {formatTime(shift.checkIn)}
              {shift.checkOut ? ` – ${formatTime(shift.checkOut)}` : " →"}
            </span>
          )}
          {!shift?.checkIn && (shift?.hours ?? 0) > 0 && (
            <span className={cn("font-bold", compact ? "text-[10px]" : "text-xs")}>
              {shift!.hours}h
            </span>
          )}
          {shift && (shift.hours ?? 0) > 0 && shift.checkIn && (
            <span className="text-[10px] opacity-75 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {shift.hours}h
            </span>
          )}
          {variant === "shift" && (
            <span className="text-[9px] font-semibold opacity-80">
              {isAr ? "● وردية" : "● Shift"}
            </span>
          )}
        </div>
      )}
    </button>
  );

  if (!hasData) return content;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <p className="font-bold">{isAr ? styles.labelAr : styles.labelFr}</p>
          {shift?.projectName && (
            <p className="text-slate-500 mt-0.5">{shift.projectName}</p>
          )}
          {shift?.checkIn && (
            <p className="mt-1">
              {isAr ? "دخول" : "Entrée"}: {formatTime(shift.checkIn)}
              {shift.checkOut && ` · ${isAr ? "خروج" : "Sortie"}: ${formatTime(shift.checkOut)}`}
            </p>
          )}
          {shift && shift.hours > 0 && (
            <p>{shift.hours} {isAr ? "ساعة" : "heures"}</p>
          )}
          <p className="mt-1 opacity-70">{isAr ? "انقر للتعديل" : "Cliquer pour modifier"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
