"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  CalendarDays,
  Calendar,
  Filter,
  Search,
  Sparkles,
  Sun,
  AlertTriangle,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { dailyLogService } from "@/lib/services/daily-log-service";
import { DailyLog } from "@/lib/types/daily-logs";
import { Project } from "@/lib/types/projects";
import { AddDailyLogDialog } from "./AddDailyLogDialog";
import { DailyLogCard } from "./DailyLogCard";
import { toast } from "sonner";

interface DailyLogsTabProps {
  project: Project;
  isAr: boolean;
  onRefresh?: () => void;
}

export function DailyLogsTab({ project, isAr, onRefresh }: DailyLogsTabProps) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  // ── الفلاتر والبحث ──
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterWeather, setFilterWeather] = useState<string>("all");

  const isFiltered = Boolean(
    searchQuery ||
    dateFrom ||
    dateTo ||
    (filterMonth && filterMonth !== "all") ||
    (filterWeather && filterWeather !== "all")
  );

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setFilterMonth("all");
    setFilterWeather("all");
  };

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await dailyLogService.getByProjectId(project.id);
      setLogs(data);
      setNeedsMigration(false);
    } catch (err: any) {
      if (
        (err?.message?.includes("column") && err?.message?.includes("does not exist")) ||
        err?.code === "42501" ||
        err?.message?.includes("Permission denied")
      ) {
        setNeedsMigration(true);
      } else {
        console.error("Failed to fetch daily logs:", err);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchLogs();

    const subscription = dailyLogService.subscribe(project.id, () => {
      fetchLogs(true);
    });

    return () => {
      if (typeof subscription === 'function') {
        subscription();
      }
    };
  }, [fetchLogs, project.id]);

  const handleDelete = async (id: string) => {
    const confirmed = confirm(isAr ? "هل أنت متأكد من حذف هذا التقرير؟" : "Confirmer la suppression ?");
    if (!confirmed) return;
    try {
      await dailyLogService.delete(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success(isAr ? "تم حذف التقرير بنجاح" : "Rapport supprimé");
      onRefresh?.();
    } catch {
      toast.error(isAr ? "فشل الحذف" : "Échec de suppression");
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = !searchQuery ||
      (log.work_summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.log_date.includes(searchQuery) ||
      (log.problems_faced || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMonth = filterMonth === "all" || log.log_date.substring(0, 7) === filterMonth;
    const matchesWeather = filterWeather === "all" || log.weather_condition === filterWeather;

    // ── فلتر نطاق التاريخ (YYYY-MM-DD) ──
    const matchesDateFrom = !dateFrom || log.log_date >= dateFrom;
    const matchesDateTo = !dateTo || log.log_date <= dateTo;

    return matchesSearch && matchesMonth && matchesWeather && matchesDateFrom && matchesDateTo;
  });

  const availableMonths = Array.from(new Set(logs.map((l) => l.log_date.substring(0, 7)))).sort((a, b) => b.localeCompare(a));

  if (needsMigration) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto w-12 h-12 text-amber-500 mb-4" />
        <h3 className="font-bold text-lg mb-2">يلزم تحديث قاعدة البيانات</h3>
        <p className="text-sm text-slate-600">يرجى تشغيل SQL Migration لجدول daily_logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            {isAr ? "التقارير اليومية" : "Rapports Journaliers"}
          </h2>
          <p className="text-orange-100 mt-1">
            {isAr ? "توثيق يومي لسير الأشغال، حالة الطقس، العمالة والمواد" : "Suivi quotidien du chantier, météo, effectifs et matériaux"}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
          <div className="text-center">
            <div className="text-2xl font-black">{filteredLogs.length}</div>
            <div className="text-[10px] uppercase font-bold text-orange-100">{isAr ? "تقرير معروض" : "Affichés"}</div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-black">{logs.length}</div>
            <div className="text-[10px] uppercase font-bold text-orange-100">{isAr ? "الإجمالي" : "Total"}</div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "بحث في الملخص أو المشاكل..." : "Rechercher..."}
              className="pl-9 pr-9 text-xs h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range Filters (من / إلى) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-orange-500 mx-1" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">{isAr ? "من:" : "Du:"}</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="h-7 w-32 text-[11px] bg-white dark:bg-slate-900 border-none shadow-none px-1"
                />
              </div>
              <span className="text-slate-300 dark:text-slate-600">-</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">{isAr ? "إلى:" : "Au:"}</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="h-7 w-32 text-[11px] bg-white dark:bg-slate-900 border-none shadow-none px-1"
                />
              </div>
            </div>

            {/* Weather Filter */}
            <Select value={filterWeather} onValueChange={setFilterWeather}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder={isAr ? "الطقس" : "Météo"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "كل الحالات" : "Toutes météos"}</SelectItem>
                <SelectItem value="مشمس">{isAr ? "مشمس ☀️" : "Ensoleillé ☀️"}</SelectItem>
                <SelectItem value="غائم">{isAr ? "غائم ☁️" : "Nuageux ☁️"}</SelectItem>
                <SelectItem value="ممطر">{isAr ? "ممطر 🌧️" : "Pluvieux 🌧️"}</SelectItem>
                <SelectItem value="عاصف">{isAr ? "عاصف 💨" : "Venteux 💨"}</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
              >
                <X className="w-3.5 h-3.5" />
                {isAr ? "إلغاء الفلتر" : "Effacer"}
              </Button>
            )}
          </div>

          {/* New Daily Log Button */}
          <AddDailyLogDialog
            isAr={isAr}
            projectId={project.id}
            onSuccess={() => { fetchLogs(true); onRefresh?.(); }}
            trigger={
              <Button size="sm" className="h-9 gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shrink-0">
                <Plus className="w-4 h-4" />
                {isAr ? "تقرير يومي جديد" : "Nouveau rapport"}
              </Button>
            }
          />
        </div>

        {/* Active Filter Notice Banner */}
        {isFiltered && (
          <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-xs px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>
                {isAr
                  ? `تم تصفية التقارير: يظهر ${filteredLogs.length} تقارير من أصل ${logs.length}`
                  : `Filtré : ${filteredLogs.length} sur ${logs.length} rapports affichés`}
                {dateFrom && (isAr ? ` (من ${dateFrom})` : ` (du ${dateFrom})`)}
                {dateTo && (isAr ? ` (إلى ${dateTo})` : ` (au ${dateTo})`)}
              </span>
            </div>
            <button
              onClick={clearFilters}
              className="text-orange-600 dark:text-orange-400 font-bold hover:underline text-[11px]"
            >
              {isAr ? "إعادة الضبط" : "Réinitialiser"}
            </button>
          </div>
        )}
      </div>

      {/* Logs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <BookOpen className="mx-auto w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-1">
            {isAr ? "لا توجد تقارير مطابقة" : "Aucun rapport trouvé"}
          </h3>
          <p className="text-slate-400 text-sm">
            {isFiltered
              ? (isAr ? "جرب تغيير نطاق التاريخ أو كلمات البحث" : "Essayez de modifier les dates ou la recherche")
              : (isAr ? "قم بإضافة أول تقرير يومي للمشروع" : "Ajoutez le premier rapport journalier")}
          </p>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 gap-1.5 text-xs">
              <X className="w-3.5 h-3.5" />
              {isAr ? "مسح جميع الفلاتر" : "Réinitialiser les filtres"}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <DailyLogCard
              key={log.id}
              log={log}
              project={project}
              isAr={isAr}
              projectId={project.id}
              onEdit={() => { fetchLogs(true); onRefresh?.(); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}