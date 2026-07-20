"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameWeek,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { arDZ, fr } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createClient } from "@/lib/supabase/client";
import { workersService } from "@/lib/services/workers-service";
import { projectsService } from "@/lib/services/projects-service";
import { pointageService } from "@/lib/services/pointage-service";
import { Worker } from "@/lib/types/projects";
import { WeeklyScheduleGrid } from "@/components/pointage/WeeklyScheduleGrid";
import { ShiftEditDialog } from "@/components/pointage/ShiftEditDialog";
import {
  DayShift,
  ShiftCellContext,
  WEEK_STARTS_ON,
  WorkerScheduleRow,
} from "@/components/pointage/schedule-types";

function buildScheduleRows(
  workers: Worker[],
  weekPointages: any[],
  projects: { id: string; name: string }[],
  weekDates: string[],
  generalLabel: string
): WorkerScheduleRow[] {
  const shiftMap = new Map<string, DayShift>();

  for (const pointage of weekPointages) {
    const projectName =
      projects.find((p) => p.id === pointage.project_id)?.name || generalLabel;

    for (const pw of pointage.pointage_workers || []) {
      const key = `${pw.worker_id}-${pointage.pointage_date}`;
      const newShift: DayShift = {
        workerId: pw.worker_id,
        date: pointage.pointage_date,
        status: pw.status,
        checkIn: pw.check_in_time,
        checkOut: pw.check_out_time,
        hours: pw.hours_worked || 0,
        projectId: pointage.project_id,
        projectName,
        pointageId: pointage.id,
        pointageWorkerId: pw.id,
      };

      const existing = shiftMap.get(key);
      if (
        !existing ||
        newShift.hours > existing.hours ||
        (newShift.status !== "absent" && existing.status === "absent")
      ) {
        shiftMap.set(key, newShift);
      }
    }
  }

  return workers.map((worker) => {
    const shifts: Record<string, DayShift | null> = {};
    let weekTotalHours = 0;
    let presentDays = 0;

    for (const date of weekDates) {
      const shift = shiftMap.get(`${worker.id}-${date}`) ?? null;
      shifts[date] = shift;
      if (shift && shift.status !== "absent") {
        weekTotalHours += shift.hours;
        presentDays++;
      }
    }

    return { worker, shifts, weekTotalHours, presentDays };
  });
}

export default function PointagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const dateLocale = isAr ? arDZ : fr;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON })
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
  const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [weekPointages, setWeekPointages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [isCompact, setIsCompact] = useState(false);

  const [isClockInOpen, setIsClockInOpen] = useState(false);
  const [isClockOutOpen, setIsClockOutOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("none");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [shiftEditContext, setShiftEditContext] = useState<ShiftCellContext | null>(null);
  const [isShiftEditOpen, setIsShiftEditOpen] = useState(false);

  const startDateStr = format(weekStart, "yyyy-MM-dd");
  const endDateStr = format(weekEnd, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allWorkers, allProjects, weekData] = await Promise.all([
        workersService.getAll(),
        projectsService.getAll(),
        pointageService.getWeekPointages(startDateStr, endDateStr, projectFilter),
      ]);
      setWorkers(allWorkers || []);
      setProjects(allProjects || []);
      setWeekPointages(weekData || []);
    } catch (error) {
      console.error(error);
      toast.error(isAr ? "خطأ في تحميل البيانات" : "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [startDateStr, endDateStr, projectFilter, isAr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const generalLabel = isAr ? "وضع عام" : "Général";

  const scheduleRows = useMemo(() => {
    const rows = buildScheduleRows(
      workers,
      weekPointages,
      projects,
      weekDates,
      generalLabel
    );
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.worker.full_name.toLowerCase().includes(q) ||
        r.worker.job_title.toLowerCase().includes(q)
    );
  }, [workers, weekPointages, projects, weekDates, generalLabel, searchQuery]);

  const weekStats = useMemo(() => {
    let totalHours = 0;
    let presentSlots = 0;
    let absentSlots = 0;
    let activeNow = 0;
    const workersWithPresence = new Set<string>();

    for (const row of scheduleRows) {
      for (const date of weekDates) {
        const shift = row.shifts[date];
        if (!shift) continue;
        if (shift.status === "absent") {
          absentSlots++;
        } else {
          totalHours += shift.hours;
          presentSlots++;
          workersWithPresence.add(row.worker.id);
        }
        if (date === todayStr && shift.checkIn && !shift.checkOut) {
          activeNow++;
        }
      }
    }

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      presentSlots,
      absentSlots,
      activeNow,
      workersCount: workersWithPresence.size,
    };
  }, [scheduleRows, weekDates, todayStr]);

  const isCurrentWeek = isSameWeek(today, weekStart, { weekStartsOn: WEEK_STARTS_ON });

  const weekLabel = `${format(weekStart, "d MMM", { locale: dateLocale })} – ${format(weekEnd, "d MMM yyyy", { locale: dateLocale })}`;

  const resetForm = () => {
    setSelectedWorkerId("");
    setSelectedProjectId("none");
    setLocation("");
    setNotes("");
  };

  const resolveProjectOptions = () => {
    if (selectedProjectId === "none" || selectedProjectId === "general") {
      return { projectId: undefined, location: location || undefined };
    }
    return { projectId: selectedProjectId, location: location || undefined };
  };

  const handleClockIn = async () => {
    if (!selectedWorkerId) {
      toast.error(isAr ? "يرجى اختيار عامل" : "Veuillez sélectionner un ouvrier");
      return;
    }
    setIsSubmitting(true);
    try {
      await pointageService.clockIn(selectedWorkerId, {
        ...resolveProjectOptions(),
        notes: notes || undefined,
      });
      toast.success(isAr ? "تم تسجيل الدخول بنجاح ✓" : "Entrée enregistrée ✓");
      setIsClockInOpen(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : isAr ? "فشل تسجيل الدخول" : "Échec";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!selectedWorkerId) {
      toast.error(isAr ? "يرجى اختيار عامل" : "Veuillez sélectionner un ouvrier");
      return;
    }
    setIsSubmitting(true);
    try {
      await pointageService.clockOut(selectedWorkerId, resolveProjectOptions());
      toast.success(isAr ? "تم تسجيل الخروج بنجاح ✓" : "Sortie enregistrée ✓");
      setIsClockOutOpen(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : isAr ? "فشل تسجيل الخروج" : "Échec";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCellClick = (ctx: ShiftCellContext) => {
    setShiftEditContext(ctx);
    setIsShiftEditOpen(true);
  };

  const activeWorkersToday = useMemo(() => {
    const active: { worker: Worker; shift: DayShift }[] = [];
    for (const row of scheduleRows) {
      const shift = row.shifts[todayStr];
      if (shift?.checkIn && !shift.checkOut) {
        active.push({ worker: row.worker, shift });
      }
    }
    return active;
  }, [scheduleRows, todayStr]);

  return (
    <div className="space-y-5 p-4 md:p-6" dir={isAr ? "rtl" : "ltr"}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {isAr ? "جدولة الحضور الأسبوعية" : "Planning Hebdomadaire"}
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            {isAr
              ? "إدارة ورديات العمال — عرض أسبوعي مثل Skello"
              : "Gestion des shifts — vue hebdomadaire type Skello"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-md shadow-emerald-200 flex-1 sm:flex-none"
            onClick={() => {
              resetForm();
              setIsClockInOpen(true);
            }}
          >
            <LogIn className="w-4 h-4" />
            {isAr ? "تسجيل دخول سريع" : "Pointage Entrée"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-2 flex-1 sm:flex-none"
            onClick={() => {
              resetForm();
              setIsClockOutOpen(true);
            }}
          >
            <LogOut className="w-4 h-4" />
            {isAr ? "تسجيل خروج" : "Pointage Sortie"}
          </Button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: isAr ? "ساعات الأسبوع" : "Heures semaine",
            value: `${weekStats.totalHours}h`,
            icon: Clock,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: isAr ? "حضور مسجل" : "Présences",
            value: weekStats.presentSlots,
            icon: UserCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: isAr ? "عمال نشطون" : "Actifs maintenant",
            value: weekStats.activeNow,
            icon: Timer,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: isAr ? "عمال هذا الأسبوع" : "Ouvriers actifs",
            value: weekStats.workersCount,
            icon: Users,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar: week nav + filters ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>

            <div className="text-center min-w-[180px]">
              <p className="font-bold text-slate-800 text-sm">{weekLabel}</p>
              {isCurrentWeek && (
                <Badge variant="outline" className="text-[10px] mt-0.5 border-emerald-300 text-emerald-700">
                  {isAr ? "الأسبوع الحالي" : "Semaine en cours"}
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            >
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            {!isCurrentWeek && (
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 text-xs"
                onClick={() => setWeekStart(startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }))}
              >
                {isAr ? "اليوم" : "Aujourd'hui"}
              </Button>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5 text-slate-500">
            <RefreshCw className="w-3.5 h-3.5" />
            {isAr ? "تحديث" : "Actualiser"}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={isAr ? "بحث عن عامل..." : "Rechercher un ouvrier..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-9"
            />
          </div>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[220px]">
              <SelectValue placeholder={isAr ? "المشروع" : "Projet"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? "كل العمال / كل المشاريع" : "Tous les projets"}</SelectItem>
              <SelectItem value="general">{isAr ? "وضع عام" : "Général"}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legend — 3 couleurs unifiées */}
        <div className="flex flex-wrap gap-4 pt-1 border-t border-slate-100">
          {[
            { color: "bg-emerald-400", label: isAr ? "حاضر (مكتمل)" : "Présent" },
            { color: "bg-yellow-400", label: isAr ? "وردية (جارية)" : "Shift (en cours)" },
            { color: "bg-slate-300", label: isAr ? "غائب" : "Absent" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${item.color}`} />
              <span className="text-[11px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active workers today banner ── */}
      {activeWorkersToday.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
          <Timer className="w-4 h-4 text-yellow-700 shrink-0" />
          <span className="text-sm font-semibold text-yellow-900">
            {isAr ? "ورديات نشطة:" : "Shifts en cours:"}
          </span>
          {activeWorkersToday.map(({ worker, shift }) => (
            <Badge
              key={worker.id}
              className="bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-100 cursor-pointer"
              onClick={() => handleCellClick({ worker, date: todayStr, shift })}
            >
              {worker.full_name}
              {shift.checkIn && ` · ${shift.checkIn.slice(0, 5)}`}
            </Badge>
          ))}
        </div>
      )}

      {/* ── Weekly Schedule Grid ── */}
      <WeeklyScheduleGrid
        rows={scheduleRows}
        weekDates={weekDates}
        todayStr={todayStr}
        isAr={isAr}
        isLoading={isLoading}
        compact={isCompact}
        onCellClick={handleCellClick}
      />

      <ShiftEditDialog
        open={isShiftEditOpen}
        onOpenChange={setIsShiftEditOpen}
        context={shiftEditContext}
        projects={projects}
        defaultProjectId={projectFilter}
        todayStr={todayStr}
        isAr={isAr}
        onSuccess={fetchData}
      />

      {/* ── Clock In Dialog ── */}
      <Dialog open={isClockInOpen} onOpenChange={setIsClockInOpen}>
        <DialogContent className="sm:max-w-md" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowRight className="w-5 h-5" />
              {isAr ? "تسجيل دخول سريع" : "Pointage Entrée"}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? "سجّل دخول العامل وابدأ نوبة العمل"
                : "Enregistrer l'entrée et démarrer le shift"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isAr ? "العامل *" : "Ouvrier *"}</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر عاملاً..." : "Sélectionner..."} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.full_name} — {w.job_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "المشروع (اختياري)" : "Projet (optionnel)"}</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {isAr ? "الموقع (اختياري)" : "Lieu (optionnel)"}
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isAr ? "مثال: موقع البناء أ" : "Ex: Chantier A"}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "ملاحظات" : "Notes"}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={isAr ? "ملاحظات إضافية..." : "Notes..."}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsClockInOpen(false)}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={handleClockIn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isAr ? "تسجيل الدخول" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clock Out Dialog ── */}
      <Dialog open={isClockOutOpen} onOpenChange={setIsClockOutOpen}>
        <DialogContent className="sm:max-w-md" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ArrowLeft className="w-5 h-5" />
              {isAr ? "تسجيل خروج" : "Pointage Sortie"}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? "أنهِ نوبة العمل واحسب الساعات تلقائياً"
                : "Terminer le shift et calculer les heures"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isAr ? "العامل *" : "Ouvrier *"}</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر عاملاً..." : "Sélectionner..."} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.full_name} — {w.job_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "المشروع" : "Projet"}</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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
            <Button variant="outline" onClick={() => setIsClockOutOpen(false)}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 gap-2"
              onClick={handleClockOut}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isAr ? "تسجيل الخروج" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
