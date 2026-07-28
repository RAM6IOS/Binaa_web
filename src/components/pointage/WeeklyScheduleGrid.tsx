"use client";

import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { arDZ, fr } from "date-fns/locale";
import { Clock, Loader2, Users } from "lucide-react";
import { WorkerRow } from "./WorkerRow";
import { ShiftCellContext, WorkerScheduleRow } from "./schedule-types";

interface WeeklyScheduleGridProps {
  rows: WorkerScheduleRow[];
  weekDates: string[];
  todayStr: string;
  isAr: boolean;
  isLoading?: boolean;
  compact?: boolean;
  onCellClick?: (ctx: ShiftCellContext) => void;
}

export function WeeklyScheduleGrid({
  rows,
  weekDates,
  todayStr,
  isAr,
  isLoading,
  compact,
  onCellClick,
}: WeeklyScheduleGridProps) {
  const locale = isAr ? arDZ : fr;

  const colTemplate = compact
    ? "grid-cols-[140px_repeat(7,minmax(64px,1fr))_72px]"
    : "grid-cols-[200px_repeat(7,minmax(88px,1fr))_88px]";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">
          {isAr ? "جاري تحميل الجدول الأسبوعي..." : "Chargement du planning..."}
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Users className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-700">
            {isAr ? "لا يوجد عمال لعرضهم" : "Aucun ouvrier à afficher"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {isAr ? "أضف عمالاً أو غيّر فلتر المشروع" : "Ajoutez des ouvriers ou modifiez le filtre"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Grid */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header row */}
        <div
          className={cn(
            "grid sticky top-0 z-20 bg-slate-50 border-b border-slate-200",
            colTemplate
          )}
        >
          <div className="sticky start-0 z-30 bg-slate-50 border-e border-slate-200 px-3 py-3 flex items-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? "العمال" : "Ouvriers"}
            </span>
          </div>

          {weekDates.map((date) => {
            const d = parseISO(date);
            const isToday = date === todayStr;
            return (
              <div
                key={date}
                className={cn(
                  "px-1 py-2 text-center border-e border-slate-100",
                  isToday && "bg-emerald-50"
                )}
              >
                <p className="text-[10px] font-medium text-slate-500 uppercase">
                  {format(d, "EEE", { locale })}
                </p>
                <p
                  className={cn(
                    "text-sm font-bold mt-0.5",
                    isToday ? "text-emerald-700" : "text-slate-800"
                  )}
                >
                  {format(d, "d", { locale })}
                </p>
                <p className="text-[9px] text-slate-400">
                  {format(d, "MMM", { locale })}
                </p>
              </div>
            );
          })}

          <div className="sticky end-0 z-30 px-2 py-2 text-center bg-emerald-50 border-s border-emerald-100 flex flex-col items-center justify-end gap-0.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase">
              {isAr ? "الإجمالي" : "Total"}
            </span>
          </div>
        </div>

        {/* Worker rows */}
        <div>
          {rows.map((row) => (
            <WorkerRow
              key={row.worker.id}
              row={row}
              weekDates={weekDates}
              todayStr={todayStr}
              isAr={isAr}
              compact={compact}
              onCellClick={onCellClick}
            />
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => {
          const { worker, shifts, weekTotalHours, presentDays } = row;
          return (
            <div key={row.worker.id} className="border rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                    {worker.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{worker.full_name}</p>
                    <p className="text-[10px] text-slate-400">{worker.job_title}</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span className="text-base font-bold text-emerald-700">{weekTotalHours.toFixed(1)}</span>
                  </div>
                  <p className="text-[9px] text-slate-400">{presentDays} {isAr ? "أيام" : "j"}</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {weekDates.map((date) => {
                  const d = parseISO(date);
                  const isToday = date === todayStr;
                  const shift = shifts[date];

                  const formatShortTime = (t: string | null | undefined) => {
                    if (!t) return null;
                    if (t.length <= 5) return t;
                    const parts = t.split(":");
                    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
                  };

                  return (
                    <div
                      key={date}
                      onClick={() => onCellClick?.({ worker, date, shift: shift ?? null })}
                      className={cn(
                        "text-center p-1.5 rounded-lg cursor-pointer transition-colors border min-h-[54px] flex flex-col justify-between",
                        isToday
                          ? "bg-emerald-100 border-emerald-300 ring-1 ring-emerald-200 shadow-sm"
                          : "bg-slate-50 border-slate-100",
                        shift && !shift.checkOut
                          ? isToday
                            ? "bg-emerald-200 border-emerald-400"
                            : "bg-yellow-50 border-yellow-300"
                          : shift
                            ? isToday
                              ? "bg-emerald-100 border-emerald-300"
                              : "bg-blue-50 border-blue-200"
                            : ""
                      )}
                    >
                      <div>
                        <p className={cn("text-[8px] font-medium uppercase", isToday ? "text-emerald-700" : "text-slate-400")}>
                          {format(d, "EEE", { locale })}
                        </p>
                        <p className={cn("text-sm font-bold leading-tight", isToday ? "text-emerald-800" : "text-slate-700")}>
                          {format(d, "d", { locale })}
                        </p>
                      </div>
                      {shift && (
                        <div className="mt-0.5">
                          <p className={cn(
                            "text-[9px] font-bold tabular-nums leading-tight",
                            !shift.checkOut ? "text-amber-600" : "text-blue-600"
                          )}>
                            {formatShortTime(shift.checkIn)}
                            {shift.checkOut ? `-${formatShortTime(shift.checkOut)}` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
