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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Info,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Timer,
  UserCheck,
  Users,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { workersService } from "@/lib/services/workers-service";
import { projectsService } from "@/lib/services/projects-service";
import { pointageService } from "@/lib/services/pointage-service";
import { Worker } from "@/lib/types/projects";
import { WeeklyScheduleGrid } from "@/components/pointage/WeeklyScheduleGrid";
import {
  DayShift,
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

  const [statsOpen, setStatsOpen] = useState(true);

  const isCurrentWeek = isSameWeek(today, weekStart, { weekStartsOn: WEEK_STARTS_ON });

  const weekLabel = `${format(weekStart, "d MMM", { locale: dateLocale })} – ${format(weekEnd, "d MMM yyyy", { locale: dateLocale })}`;

  return (
    <div className="space-y-5 p-4 md:p-6" dir={isAr ? "rtl" : "ltr"}>
      {/* ── Read-only Banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm font-semibold text-blue-800">
          {isAr
            ? "هذه الصفحة للعرض فقط. لتسجيل الحضور ادخل إلى المشروع"
            : "Cette page est en lecture seule. Pour pointer, accédez au projet."}
        </p>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {isAr ? "سجل الحضور الأسبوعي" : "Registre de Présence"}
            </h1>
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {isAr
              ? "عرض فقط — للتسجيل ادخل إلى المشروع"
              : "Lecture seule — pour pointer, allez dans le projet"}
          </p>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <button
          type="button"
          className="w-full flex items-center justify-between p-3.5 md:cursor-default md:pointer-events-none"
          onClick={() => setStatsOpen((v) => !v)}
        >
          <span className="text-xs font-bold text-slate-500 uppercase">
            {isAr ? "إحصاءات الأسبوع" : "Statistiques"}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 md:hidden ${statsOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 px-3.5 pb-3.5 overflow-hidden transition-all duration-200 ${statsOpen ? 'block' : 'hidden md:grid'}`}>
          {[
            { label: isAr ? "ساعات الأسبوع" : "Heures", value: `${weekStats.totalHours}h`, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
            { label: isAr ? "حضور" : "Présences", value: weekStats.presentSlots, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: isAr ? "نشطون الآن" : "Actifs", value: weekStats.activeNow, icon: Timer, color: "text-amber-600", bg: "bg-amber-50" },
            { label: isAr ? "عمال" : "Ouvriers", value: weekStats.workersCount, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-50 rounded-xl border border-slate-100 p-3 flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar: week nav + filters ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <div className="text-center min-w-[140px] sm:min-w-[180px]">
              <p className="font-bold text-slate-800 text-sm">{weekLabel}</p>
              {isCurrentWeek && (
                <Badge variant="outline" className="text-[10px] mt-0.5 border-emerald-300 text-emerald-700">
                  {isAr ? "الأسبوع الحالي" : "En cours"}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            {!isCurrentWeek && (
              <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 text-xs hidden sm:inline-flex"
                onClick={() => setWeekStart(startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }))}>
                {isAr ? "اليوم" : "Aujourd'hui"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5 text-slate-500 hidden sm:inline-flex">
              <RefreshCw className="w-3.5 h-3.5" />
              {isAr ? "تحديث" : "Actualiser"}
            </Button>
            {/* mobile: filter sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:hidden relative">
                  <SlidersHorizontal className="w-4 h-4" />
                  {projectFilter !== "all" && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl" dir={isAr ? "rtl" : "ltr"}>
                <SheetHeader className="pb-4">
                  <SheetTitle className="font-black text-lg">{isAr ? "فلتر المشروع" : "Filtre projet"}</SheetTitle>
                </SheetHeader>
                <div className="pb-6 space-y-3">
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isAr ? "المشروع" : "Projet"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل المشاريع" : "Tous les projets"}</SelectItem>
                      <SelectItem value="general">{isAr ? "وضع عام" : "Général"}</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {[
                      { color: "bg-emerald-400", label: isAr ? "حاضر" : "Présent" },
                      { color: "bg-yellow-400", label: isAr ? "وردية" : "Shift" },
                      { color: "bg-slate-300", label: isAr ? "غائب" : "Absent" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-sm ${item.color}`} />
                        <span className="text-[11px] text-slate-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop: inline filters */}
        <div className="hidden sm:flex flex-col sm:flex-row gap-3">
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
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden sm:flex flex-wrap gap-4 pt-1 border-t border-slate-100">
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

        {/* Mobile: search always visible */}
        <div className="relative sm:hidden">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={isAr ? "بحث عن عامل..." : "Rechercher un ouvrier..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 h-9"
          />
        </div>
      </div>

      {/* ── Weekly Schedule Grid (Read-Only — no onCellClick) ── */}
      <WeeklyScheduleGrid
        rows={scheduleRows}
        weekDates={weekDates}
        todayStr={todayStr}
        isAr={isAr}
        isLoading={isLoading}
        compact={isCompact}
      />
    </div>
  );
}
