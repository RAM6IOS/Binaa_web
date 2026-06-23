"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { arDZ, fr } from "date-fns/locale";
import { Loader2, LogIn, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { pointageService } from "@/lib/services/pointage-service";
import { getShiftVariant, ShiftCellContext, STATUS_STYLES } from "./schedule-types";
import { PointageWorker } from "@/lib/types/daily-logs";

type AttendanceStatus = PointageWorker["status"];

interface ShiftEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ShiftCellContext | null;
  projects: { id: string; name: string }[];
  defaultProjectId: string;
  todayStr: string;
  isAr: boolean;
  onSuccess: () => void;
}

function toTimeInput(val?: string | null) {
  if (!val) return "";
  const parts = val.split(":");
  return `${parts[0]?.padStart(2, "0") ?? "08"}:${parts[1]?.padStart(2, "0") ?? "00"}`;
}

function resolveProjectId(selectValue: string): string | null | undefined {
  if (selectValue === "none" || selectValue === "general") return null;
  return selectValue;
}

export function ShiftEditDialog({
  open,
  onOpenChange,
  context,
  projects,
  defaultProjectId,
  todayStr,
  isAr,
  onSuccess,
}: ShiftEditDialogProps) {
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("08:00");
  const [checkOut, setCheckOut] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState("60");
  const [projectId, setProjectId] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shift = context?.shift ?? null;
  const isToday = context?.date === todayStr;
  const isEmpty = !shift?.status;
  const isActive = !!(shift?.checkIn && !shift?.checkOut && isToday);
  const variant = getShiftVariant(shift, isToday);

  useEffect(() => {
    if (!open || !context) return;

    const s = context.shift;
    setStatus(s?.status ?? "present");
    setCheckIn(toTimeInput(s?.checkIn) || "08:00");
    setCheckOut(toTimeInput(s?.checkOut) || "17:00");
    setBreakMinutes("60");

    if (s?.projectId) {
      setProjectId(s.projectId);
    } else if (defaultProjectId !== "all") {
      setProjectId(defaultProjectId);
    } else {
      setProjectId("none");
    }
  }, [open, context, defaultProjectId]);

  if (!context) return null;

  const dateLabel = format(parseISO(context.date), "EEEE d MMMM yyyy", {
    locale: isAr ? arDZ : fr,
  });

  const styles = STATUS_STYLES[variant];

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await pointageService.upsertWorkerShift({
        date: context.date,
        workerId: context.worker.id,
        projectId: resolveProjectId(projectId),
        status,
        checkIn: status === "absent" ? null : checkIn || null,
        checkOut: status === "absent" ? null : checkOut || null,
        breakMinutes: parseInt(breakMinutes, 10) || 0,
      });
      toast.success(isAr ? "تم حفظ الوردية ✓" : "Shift enregistré ✓");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : isAr ? "فشل الحفظ" : "Échec");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockIn = async () => {
    setIsSubmitting(true);
    try {
      const pid = resolveProjectId(projectId);
      await pointageService.clockIn(context.worker.id, {
        projectId: pid ?? undefined,
      });
      toast.success(isAr ? "تم تسجيل الدخول ✓" : "Entrée enregistrée ✓");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : isAr ? "فشل" : "Échec");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    setIsSubmitting(true);
    try {
      const pid = resolveProjectId(projectId);
      await pointageService.clockOut(context.worker.id, {
        projectId: pid ?? undefined,
      });
      toast.success(isAr ? "تم تسجيل الخروج ✓" : "Sortie enregistrée ✓");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : isAr ? "فشل" : "Échec");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAr ? "تعديل الوردية" : "Modifier le shift"}
            {!isEmpty && (
              <Badge className={`${styles.bg} ${styles.text} ${styles.border} border shadow-none`}>
                {isAr ? styles.labelAr : styles.labelFr}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-0.5 pt-1">
              <p className="font-semibold text-slate-800">{context.worker.full_name}</p>
              <p className="text-xs">{context.worker.job_title}</p>
              <p className="text-xs text-slate-500">{dateLabel}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* إجراءات سريعة لليوم الحالي */}
        {isToday && (
          <div className="flex gap-2">
            {(isEmpty || isActive) && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={handleClockIn}
                disabled={isSubmitting || isActive}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {isAr ? "تسجيل دخول" : "Entrée"}
              </Button>
            )}
            {isActive && (
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-yellow-950 gap-2"
                onClick={handleClockOut}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                {isAr ? "تسجيل خروج" : "Sortie"}
              </Button>
            )}
          </div>
        )}

        <div className="space-y-4 py-1 border-t border-slate-100 pt-4">
          <div className="space-y-1.5">
            <Label>{isAr ? "الحالة" : "Statut"}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">{isAr ? "حاضر" : "Présent"}</SelectItem>
                <SelectItem value="half_day">{isAr ? "نصف يوم" : "Demi-journée"}</SelectItem>
                <SelectItem value="overtime">{isAr ? "ساعات إضافية" : "Heures sup."}</SelectItem>
                <SelectItem value="absent">{isAr ? "غائب" : "Absent"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status !== "absent" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{isAr ? "وقت الدخول" : "Entrée"}</Label>
                  <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{isAr ? "وقت الخروج" : "Sortie"}</Label>
                  <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "استراحة (دقيقة)" : "Pause (min)"}</Label>
                <Input
                  type="number"
                  min="0"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>{isAr ? "المشروع" : "Projet"}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isAr ? "بدون مشروع" : "Sans projet"}</SelectItem>
                <SelectItem value="general">{isAr ? "وضع عام" : "Général"}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAr ? "إلغاء" : "Annuler"}
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isAr ? "حفظ" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
