"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { ShiftBlock } from "./ShiftBlock";
import { ShiftCellContext, WorkerScheduleRow } from "./schedule-types";

interface WorkerRowProps {
  row: WorkerScheduleRow;
  weekDates: string[];
  todayStr: string;
  isAr: boolean;
  compact?: boolean;
  onCellClick?: (ctx: ShiftCellContext) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function WorkerRow({ row, weekDates, todayStr, isAr, compact, onCellClick }: WorkerRowProps) {
  const { worker, shifts, weekTotalHours, presentDays } = row;

  return (
    <div
      className={cn(
        "grid border-b border-slate-100 hover:bg-slate-50/60 transition-colors",
        compact
          ? "grid-cols-[140px_repeat(7,minmax(64px,1fr))_72px]"
          : "grid-cols-[200px_repeat(7,minmax(88px,1fr))_88px]"
      )}
    >
      {/* Worker info — sticky start column (يمين في RTL) */}
      <div
        className={cn(
          "sticky start-0 z-10 bg-white border-e border-slate-100 flex items-center gap-2.5 px-3 py-2.5",
          compact ? "min-w-[140px]" : "min-w-[200px]"
        )}
      >
        <Avatar className={cn(compact ? "h-8 w-8" : "h-9 w-9", "ring-2 ring-white shadow-sm")}>
          {worker.photo_url && <AvatarImage src={worker.photo_url} alt={worker.full_name} />}
          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
            {getInitials(worker.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold text-slate-800 truncate", compact ? "text-xs" : "text-sm")}>
            {worker.full_name}
          </p>
          <p className="text-[10px] text-slate-500 truncate">{worker.job_title}</p>
        </div>
      </div>

      {/* Day cells */}
      {weekDates.map((date) => (
        <div key={date} className="p-1 border-e border-slate-50">
          <ShiftBlock
            shift={shifts[date] ?? null}
            isToday={date === todayStr}
            isAr={isAr}
            compact={compact}
            onClick={() =>
              onCellClick?.({ worker, date, shift: shifts[date] ?? null })
            }
          />
        </div>
      ))}

      {/* إجمالي الساعات — sticky end column (يسار في RTL = نهاية الصف) */}
      <div
        className={cn(
          "sticky end-0 z-10 flex flex-col items-center justify-center px-2 py-2",
          "bg-emerald-50 border-s border-emerald-100"
        )}
      >
        <div className="flex items-center gap-1">
          <Clock className={cn("text-emerald-600 shrink-0", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          <span className={cn("font-bold text-emerald-700 tabular-nums", compact ? "text-sm" : "text-base")}>
            {weekTotalHours.toFixed(1)}
          </span>
        </div>
        <span className="text-[10px] font-medium text-emerald-600/80 mt-0.5">
          {isAr ? "ساعة" : "heures"}
        </span>
        <span className="text-[9px] text-slate-400 mt-0.5">
          {presentDays} {isAr ? "أيام" : "j"}
        </span>
      </div>
    </div>
  );
}
