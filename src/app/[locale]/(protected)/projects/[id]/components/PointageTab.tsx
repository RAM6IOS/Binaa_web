"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  isAfter,
  startOfDay,
  subDays,
} from "date-fns";
import { arDZ, fr } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Loader2,
  Pencil,
  UserCheck,
  UserX,
  Timer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { pointageService } from "@/lib/services/pointage-service";
import { Project, ProjectWorker } from "@/lib/types/projects";
import { Pointage, PointageWorker } from "@/lib/types/daily-logs";

interface PointageTabProps {
  project: Project;
  isAr: boolean;
}

interface WorkerAttendance {
  projectWorker: ProjectWorker;
  pointageWorker: PointageWorker | null;
  status: "present" | "absent" | "not_registered";
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number;
}

type StatusFilter = "all" | "present" | "absent" | "not_registered";

export function PointageTab({ project, isAr }: PointageTabProps) {
  const dateLocale = isAr ? arDZ : fr;
  const today = startOfDay(new Date());

  const [selectedDate, setSelectedDate] = useState(today);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedDateLabel = format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale });
  const isFuture = isAfter(startOfDay(selectedDate), today);

  const [projectWorkers, setProjectWorkers] = useState<ProjectWorker[]>([]);
  const [dayPointage, setDayPointage] = useState<Pointage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [clockInWorkerId, setClockInWorkerId] = useState<string | null>(null);
  const [clockOutWorkerId, setClockOutWorkerId] = useState<string | null>(null);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<PointageWorker["status"]>("present");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [workers, pointage] = await Promise.all([
        projectWorkersService.fetchProjectWorkers(project.id),
        pointageService.getPointageForDate(project.id, selectedDateStr),
      ]);
      setProjectWorkers(workers || []);
      setDayPointage(pointage);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "خطأ في تحميل البيانات" : "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [project.id, selectedDateStr, isAr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    const unsub = pointageService.subscribe(() => fetchDataRef.current(true), project.id);
    return unsub;
  }, [project.id]);

  const workerAttendances = useMemo<WorkerAttendance[]>(() => {
    const pwList = dayPointage?.pointage_workers || [];
    return projectWorkers.map((pw) => {
      const registered = pwList.find((r: any) => r.worker_id === pw.worker_id);
      if (!registered) {
        return {
          projectWorker: pw,
          pointageWorker: null,
          status: "not_registered" as const,
          checkIn: null,
          checkOut: null,
          hoursWorked: 0,
        };
      }
      const isPresent =
        registered.status !== "absent" &&
        (registered.check_in_time || registered.status === "present");
      return {
        projectWorker: pw,
        pointageWorker: registered,
        status: isPresent ? "present" : "absent",
        checkIn: registered.check_in_time || null,
        checkOut: registered.check_out_time || null,
        hoursWorked: registered.hours_worked || 0,
      };
    });
  }, [projectWorkers, dayPointage]);

  const filteredAttendances = useMemo(() => {
    if (statusFilter === "all") return workerAttendances;
    return workerAttendances.filter((a) => a.status === statusFilter);
  }, [workerAttendances, statusFilter]);

  const stats = useMemo(() => {
    const present = workerAttendances.filter((a) => a.status === "present").length;
    const absent = workerAttendances.filter((a) => a.status === "absent").length;
    const notRegistered = workerAttendances.filter((a) => a.status === "not_registered").length;
    const totalHours = workerAttendances.reduce((sum, a) => sum + a.hoursWorked, 0);
    return { present, absent, notRegistered, totalHours: Math.round(totalHours * 10) / 10 };
  }, [workerAttendances]);

  const previewHours = useMemo(() => {
    if (!editCheckIn || !editCheckOut) return null;
    return pointageService.calculateHours(editCheckIn, editCheckOut, 0);
  }, [editCheckIn, editCheckOut]);

  const goToToday = () => setSelectedDate(today);
  const goToYesterday = () => setSelectedDate(subDays(today, 1));

  const handleClockIn = async (workerId: string) => {
    setClockInWorkerId(workerId);
    setIsSubmitting(true);
    try {
      await pointageService.clockIn(workerId, { projectId: project.id, date: selectedDateStr });
      toast.success(isAr ? "تم تسجيل الدخول بنجاح ✓" : "Entrée enregistrée ✓");
      fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : isAr ? "فشل تسجيل الدخول" : "Échec";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setClockInWorkerId(null);
    }
  };

  const handleClockOut = async (workerId: string) => {
    setClockOutWorkerId(workerId);
    setIsSubmitting(true);
    try {
      await pointageService.clockOut(workerId, { projectId: project.id, date: selectedDateStr });
      toast.success(isAr ? "تم تسجيل الخروج بنجاح ✓" : "Sortie enregistrée ✓");
      fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : isAr ? "فشل تسجيل الخروج" : "Échec";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setClockOutWorkerId(null);
    }
  };

  const handleEdit = (attendance: WorkerAttendance) => {
    setEditWorkerId(attendance.projectWorker.worker_id);
    setEditStatus(
      attendance.status === "not_registered"
        ? "present"
        : attendance.pointageWorker?.status || "present"
    );
    setEditCheckIn(attendance.checkIn || "");
    setEditCheckOut(attendance.checkOut || "");
  };

  const handleSaveEdit = async () => {
    if (!editWorkerId) return;
    if (isFuture) {
      toast.error(isAr ? "لا يمكن تعديل الحضور لتاريخ مستقبلي" : "Modification impossible pour une date future");
      return;
    }
    setIsSubmitting(true);
    try {
      await pointageService.upsertWorkerShift({
        date: selectedDateStr,
        workerId: editWorkerId,
        projectId: project.id,
        status: editStatus,
        checkIn: editCheckIn || null,
        checkOut: editCheckOut || null,
      });
      toast.success(isAr ? "تم الحفظ بنجاح ✓" : "Enregistré ✓");
      setEditWorkerId(null);
      fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : isAr ? "فشل الحفظ" : "Échec";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusConfig = {
    present: {
      label: isAr ? "حاضر" : "Présent",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    absent: {
      label: isAr ? "غائب" : "Absent",
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700 border-red-200",
    },
    not_registered: {
      label: isAr ? "لم يسجل" : "Non pointé",
      icon: AlertTriangle,
      color: "text-slate-500",
      bg: "bg-slate-50",
      border: "border-slate-200",
      badge: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };

  return (
    <div className="animate-in fade-in duration-500 pb-8" dir={isAr ? "rtl" : "ltr"}>

      {/* ════════════════════════════════════════════ */}
      {/* ── MOBILE ── */}
      {/* ════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4">

        {/* ── شريط التاريخ المضغوط ── */}
        <div className="flex items-center gap-2">
          <Button
            variant={isSameDay(selectedDate, today) ? "default" : "outline"}
            size="sm"
            className={`h-9 rounded-full text-xs font-bold px-4 gap-1.5 shrink-0 ${
              isSameDay(selectedDate, today) ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
            onClick={goToToday}
          >
            {isAr ? "اليوم" : "Aujourd'hui"}
          </Button>
          <Button
            variant={isSameDay(selectedDate, subDays(today, 1)) ? "default" : "outline"}
            size="sm"
            className={`h-9 rounded-full text-xs font-bold px-4 gap-1.5 shrink-0 ${
              isSameDay(selectedDate, subDays(today, 1)) ? "bg-slate-800 text-white" : ""
            }`}
            onClick={goToYesterday}
          >
            {isAr ? "أمس" : "Hier"}
          </Button>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => setSelectedDate((d) => subDays(d, -1))}
          >
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 px-3 gap-1.5 font-bold text-xs flex-1 min-w-0 justify-center">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{format(selectedDate, "d MMM", { locale: dateLocale })}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(day) => { if (day) { setSelectedDate(day); setCalendarOpen(false); } }}
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => setSelectedDate((d) => subDays(d, -1))}
            disabled={isFuture}
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {isFuture && (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-[11px] font-semibold text-amber-800">
              {isAr ? "لا يمكن التسجيل لتاريخ مستقبلي" : "Futur impossible"}
            </p>
          </div>
        )}

        {/* ── إحصاءات مضغوطة + فلاتر ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(["all", "present", "absent", "not_registered"] as StatusFilter[]).map((filter) => {
            const count =
              filter === "all"
                ? workerAttendances.length
                : workerAttendances.filter((a) => a.status === filter).length;
            const isActive = statusFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                {filter === "all"
                  ? isAr ? "الكل" : "Tous"
                  : filter === "present"
                  ? isAr ? "حاضر" : "Présent"
                  : filter === "absent"
                  ? isAr ? "غائب" : "Absent"
                  : isAr ? "لم يسجل" : "Non pointé"}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full leading-none ${
                  isActive ? "bg-white/20" : "bg-slate-100"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── قائمة العمال ── */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        ) : filteredAttendances.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <UserX className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-bold">
              {isAr ? "لا يوجد عمال" : "Aucun ouvrier"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAttendances.map((att) => {
              const cfg = statusConfig[att.status];
              const StatusIcon = cfg.icon;
              const pw = att.projectWorker;
              const worker = pw.worker;
              const isClockedIn = att.status === "present" && !att.checkOut;
              const isNotRegistered = att.status === "not_registered";

              return (
                <div
                  key={pw.worker_id}
                  className={`bg-white rounded-2xl border ${cfg.border} px-3.5 py-3 shadow-sm`}
                >
                  {/* صف واحد: معلومات العامل + الحالة */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-1 ring-white shadow-sm shrink-0">
                      {worker?.photo_url && (
                        <AvatarImage src={worker.photo_url} alt={worker.full_name} />
                      )}
                      <AvatarFallback className={`${cfg.bg} ${cfg.color} text-[10px] font-bold`}>
                        {worker?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[13px] text-slate-900 truncate">{worker?.full_name}</p>
                        <Badge variant="outline" className={`${cfg.badge} text-[9px] font-bold gap-1 shrink-0 px-1.5 py-0 h-4`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight truncate">
                        {worker?.job_title}{pw.assigned_role ? ` · ${pw.assigned_role}` : ""}
                      </p>
                      {/* معلومات الوقت مختصرة */}
                      {att.status !== "not_registered" && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold tabular-nums text-slate-500">
                          {att.checkIn && (
                            <span className="flex items-center gap-0.5">
                              <LogIn className="w-2.5 h-2.5 text-emerald-500" />
                              {att.checkIn}
                            </span>
                          )}
                          {att.checkOut && (
                            <span className="flex items-center gap-0.5">
                              <LogOut className="w-2.5 h-2.5 text-amber-500" />
                              {att.checkOut}
                            </span>
                          )}
                          {att.hoursWorked > 0 && (
                            <span className="flex items-center gap-0.5 text-blue-600">
                              <Timer className="w-2.5 h-2.5" />
                              {att.hoursWorked}h
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isFuture && isNotRegistered && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold gap-1 h-10 px-4 shadow-sm shadow-emerald-200"
                          onClick={() => handleClockIn(pw.worker_id)}
                          disabled={isSubmitting && clockInWorkerId === pw.worker_id}
                        >
                          {isSubmitting && clockInWorkerId === pw.worker_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LogIn className="w-4 h-4" />
                          )}
                          {isAr ? "دخول" : "Entrée"}
                        </Button>
                      )}

                      {!isFuture && isClockedIn && (
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold gap-1 h-10 px-4 shadow-sm shadow-amber-200"
                          onClick={() => handleClockOut(pw.worker_id)}
                          disabled={isSubmitting && clockOutWorkerId === pw.worker_id}
                        >
                          {isSubmitting && clockOutWorkerId === pw.worker_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LogOut className="w-4 h-4" />
                          )}
                          {isAr ? "خروج" : "Sortie"}
                        </Button>
                      )}

                      {isFuture && isNotRegistered && (
                        <span className="text-[10px] text-slate-300 italic px-1">
                          {isAr ? " مستقبل" : " futur"}
                        </span>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-50"
                        onClick={() => handleEdit(att)}
                        disabled={isFuture}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* ── DESKTOP ── (بدون تغيير) */}
      {/* ════════════════════════════════════════════ */}
      <div className="hidden md:block space-y-5">
        {/* ── Date Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 capitalize">
                {selectedDateLabel}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isAr ? "حضور العمال لهذا اليوم" : "Présence des ouvriers"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Date Navigator ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setSelectedDate((d) => subDays(d, -1))}
            >
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-4 gap-2 font-bold text-sm">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  {format(selectedDate, "d MMM yyyy", { locale: dateLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(day) => { if (day) { setSelectedDate(day); setCalendarOpen(false); } }}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setSelectedDate((d) => subDays(d, -1))}
              disabled={isFuture}
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <Button
              variant={isSameDay(selectedDate, today) ? "default" : "outline"}
              size="sm"
              className={`h-8 rounded-full text-xs font-bold gap-1 ${
                isSameDay(selectedDate, today) ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
              onClick={goToToday}
            >
              {isAr ? "اليوم" : "Aujourd'hui"}
            </Button>
            <Button
              variant={isSameDay(selectedDate, subDays(today, 1)) ? "default" : "outline"}
              size="sm"
              className={`h-8 rounded-full text-xs font-bold gap-1 ${
                isSameDay(selectedDate, subDays(today, 1)) ? "bg-slate-800 hover:bg-slate-900 text-white" : ""
              }`}
              onClick={goToYesterday}
            >
              {isAr ? "أمس" : "Hier"}
            </Button>
          </div>

          {isFuture && (
            <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-800">
                {isAr
                  ? "لا يمكن تسجيل الحضور لتاريخ مستقبلي"
                  : "Enregistrement impossible pour une date future"}
              </p>
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-3">
          <StatPill
            label={isAr ? "حاضرون" : "Présents"}
            value={stats.present}
            icon={<UserCheck className="w-4 h-4" />}
            color="emerald"
          />
          <StatPill
            label={isAr ? "غائبات" : "Absents"}
            value={stats.absent}
            icon={<UserX className="w-4 h-4" />}
            color="red"
          />
          <StatPill
            label={isAr ? "لم يسجلوا" : "Non pointés"}
            value={stats.notRegistered}
            icon={<AlertTriangle className="w-4 h-4" />}
            color="slate"
          />
          <StatPill
            label={isAr ? "ساعات اليوم" : "Heures"}
            value={`${stats.totalHours}h`}
            icon={<Clock className="w-4 h-4" />}
            color="blue"
          />
        </div>

        {/* ── Filter ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(["all", "present", "absent", "not_registered"] as StatusFilter[]).map((filter) => {
            const count =
              filter === "all"
                ? workerAttendances.length
                : workerAttendances.filter((a) => a.status === filter).length;
            return (
              <Button
                key={filter}
                variant={statusFilter === filter ? "default" : "outline"}
                size="sm"
                className={`rounded-full text-xs font-bold whitespace-nowrap ${
                  statusFilter === filter ? "bg-slate-900 text-white hover:bg-slate-800" : ""
                }`}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === "all"
                  ? isAr ? "الكل" : "Tous"
                  : statusConfig[filter].label}
                <Badge variant="secondary" className="ms-1.5 h-5 px-1.5 text-[10px]">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* ── Worker List ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAttendances.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <UserX className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">
                  {isAr ? "لا يوجد عمال في هذا الفلتر" : "Aucun ouvrier pour ce filtre"}
                </p>
              </div>
            )}

            {filteredAttendances.map((att) => {
              const cfg = statusConfig[att.status];
              const StatusIcon = cfg.icon;
              const pw = att.projectWorker;
              const worker = pw.worker;

              return (
                <div
                  key={pw.worker_id}
                  className={`bg-white rounded-2xl border ${cfg.border} p-4 shadow-sm transition-all hover:shadow-md`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Worker info + status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                          {worker?.photo_url && (
                            <AvatarImage src={worker.photo_url} alt={worker.full_name} />
                          )}
                          <AvatarFallback
                            className={`${cfg.bg} ${cfg.color} text-xs font-bold`}
                          >
                            {worker?.full_name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{worker?.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                            {worker?.job_title} · {pw.assigned_role}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${cfg.badge} text-[10px] font-bold gap-1`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Time details */}
                    {att.status !== "not_registered" && (
                      <div className="grid grid-cols-3 gap-2">
                        <TimeBox
                          label={isAr ? "دخول" : "Entrée"}
                          value={att.checkIn}
                          icon={<LogIn className="w-3 h-3 text-emerald-500" />}
                        />
                        <TimeBox
                          label={isAr ? "خروج" : "Sortie"}
                          value={att.checkOut}
                          icon={<LogOut className="w-3 h-3 text-amber-500" />}
                        />
                        <TimeBox
                          label={isAr ? "ساعات" : "Heures"}
                          value={att.hoursWorked > 0 ? `${att.hoursWorked}h` : "—"}
                          icon={<Timer className="w-3 h-3 text-blue-500" />}
                          highlight
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {!isFuture && att.status === "not_registered" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 h-9"
                          onClick={() => handleClockIn(pw.worker_id)}
                          disabled={isSubmitting && clockInWorkerId === pw.worker_id}
                        >
                          {isSubmitting && clockInWorkerId === pw.worker_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogIn className="w-3.5 h-3.5" />
                          )}
                          {isAr ? "تسجيل دخول" : "Pointer entrée"}
                        </Button>
                      )}

                      {!isFuture && att.status === "present" && !att.checkOut && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-bold gap-1.5 h-9"
                          onClick={() => handleClockOut(pw.worker_id)}
                          disabled={isSubmitting && clockOutWorkerId === pw.worker_id}
                        >
                          {isSubmitting && clockOutWorkerId === pw.worker_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          {isAr ? "تسجيل خروج" : "Pointer sortie"}
                        </Button>
                      )}

                      {isFuture && att.status === "not_registered" && (
                        <span className="text-[10px] text-slate-400 italic">
                          {isAr ? "تاريخ مستقبلي" : "Date future"}
                        </span>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-slate-700 rounded-xl text-xs font-bold gap-1 h-9"
                        onClick={() => handleEdit(att)}
                        disabled={isFuture}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {isAr ? "تعديل" : "Modifier"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* ── Edit Dialog ── (مشترك) */}
      {/* ════════════════════════════════════════════ */}
      <Dialog open={!!editWorkerId} onOpenChange={(open) => !open && setEditWorkerId(null)}>
        <DialogContent className="sm:max-w-md" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              {isAr ? "تعديل الحضور" : "Modifier la présence"}
            </DialogTitle>
            <DialogDescription>
              {editWorkerId &&
                projectWorkers.find((pw) => pw.worker_id === editWorkerId)?.worker?.full_name}
              {" · "}
              {format(selectedDate, "d MMM yyyy", { locale: dateLocale })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isAr ? "الحالة" : "Statut"}</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as PointageWorker["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    {isAr ? "حاضر" : "Présent"}
                  </SelectItem>
                  <SelectItem value="absent">
                    {isAr ? "غائب" : "Absent"}
                  </SelectItem>
                  <SelectItem value="half_day">
                    {isAr ? "نصف يوم" : "Demi journée"}
                  </SelectItem>
                  <SelectItem value="overtime">
                    {isAr ? "إضافي" : "Heures sup"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isAr ? "ساعة الدخول" : "Heure d'entrée"}</Label>
                <Input
                  type="time"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "ساعة الخروج" : "Heure de sortie"}</Label>
                <Input
                  type="time"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                />
              </div>
            </div>

            {previewHours !== null && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                <Timer className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700">
                  {isAr ? "الساعات المحسوبة:" : "Heures calculées:"} {previewHours}h
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditWorkerId(null)}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isAr ? "حفظ" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function StatPill({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <div className={`rounded-2xl border p-3.5 flex items-center gap-3 ${colors[color]}`}>
      <div className="opacity-70">{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase opacity-60">{label}</p>
        <p className="text-lg font-black tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function TimeBox({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-2.5 text-center ${
        highlight ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100"
      }`}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
        <span className="text-[9px] font-bold uppercase text-slate-400">{label}</span>
      </div>
      <p
        className={`text-sm font-bold tabular-nums ${
          highlight ? "text-blue-700" : "text-slate-700"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}
