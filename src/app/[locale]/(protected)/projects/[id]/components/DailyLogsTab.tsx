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
  Filter,
  Search,
  Sparkles,
  Sun,
  AlertTriangle,
  Loader2,
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
}

export function DailyLogsTab({ project, isAr }: DailyLogsTabProps) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterWeather, setFilterWeather] = useState<string>("all");

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await dailyLogService.getByProjectId(project.id);
        setLogs(data);
        setNeedsMigration(false);
      } catch (err: any) {
        // If the error is about missing columns or RLS, show migration notice
        if (
          (err?.message?.includes("column") &&
            err?.message?.includes("does not exist")) ||
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
    },
    [project.id]
  );

  useEffect(() => {
    fetchLogs();
    const unsub = dailyLogService.subscribe(project.id, () => fetchLogs(true));
    return unsub;
  }, [fetchLogs, project.id]);

  const handleDelete = async (id: string) => {
    const confirmed = confirm(
      isAr
        ? "هل أنت متأكد من حذف هذا التقرير؟"
        : "Confirmer la suppression de ce rapport?"
    );
    if (!confirmed) return;
    try {
      await dailyLogService.delete(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success(
        isAr ? "تم حذف التقرير بنجاح" : "Rapport supprimé avec succès"
      );
    } catch {
      toast.error(isAr ? "فشل في حذف التقرير" : "Échec de la suppression");
    }
  };

  // Filtering
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      (log.work_summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.log_date.includes(searchQuery) ||
      (log.problems_faced || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.workers_present || []).some((w) =>
        w.worker_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesMonth =
      filterMonth === "all" || log.log_date.substring(0, 7) === filterMonth;
    const matchesWeather =
      filterWeather === "all" || log.weather_condition === filterWeather;
    return matchesSearch && matchesMonth && matchesWeather;
  });

  const availableMonths = Array.from(
    new Set(logs.map((l) => l.log_date.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const totalWorkers = logs.reduce(
    (acc, l) => acc + (l.workers_present || []).length,
    0
  );
  const totalPhotos = logs.reduce(
    (acc, l) => acc + (l.photos || []).length,
    0
  );

  // ── Migration notice ──────────────────────────────────────────────────────
  if (needsMigration) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-amber-800 dark:text-amber-300 text-lg">
                {isAr
                  ? "يلزم تحديث قاعدة البيانات"
                  : "Mise à jour de la base de données requise"}
              </h3>
              <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed">
                {isAr
                  ? "جدول التقارير اليومية يحتاج تحديثاً (أعمدة أو صلاحيات RLS). يرجى تشغيل الـ SQL التالي في Supabase Dashboard ← SQL Editor:"
                  : "La table daily_logs nécessite une mise à jour (colonnes ou politiques RLS). Exécutez ce SQL dans Supabase Dashboard → SQL Editor:"}
              </p>
              <pre className="bg-amber-900/10 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs font-mono overflow-x-auto text-amber-800 dark:text-amber-200 leading-relaxed select-all">
{`ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS problems_faced TEXT;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS workers_present JSONB DEFAULT '[]';
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS equipment_used JSONB DEFAULT '[]';
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow all on daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow insert daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow update daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow delete daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow select daily_logs for authenticated" ON daily_logs;

CREATE POLICY "Allow select daily_logs for authenticated"
  ON daily_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert daily_logs for authenticated"
  ON daily_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update daily_logs for authenticated"
  ON daily_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete daily_logs for authenticated"
  ON daily_logs FOR DELETE TO authenticated USING (true);`}
              </pre>
              <div className="flex gap-3">
                <a
                  href={`https://supabase.com/dashboard/project/sazpcswwafnqanbsyhon/sql/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {isAr ? "فتح Supabase SQL Editor" : "Ouvrir SQL Editor"}
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs()}
                  className="gap-2"
                >
                  <Loader2 className="w-3.5 h-3.5" />
                  {isAr ? "إعادة المحاولة" : "Réessayer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          <BookOpen className="absolute inset-0 m-auto w-5 h-5 text-orange-600" />
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          {isAr ? "جاري تحميل التقارير..." : "Chargement des rapports..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400 rounded-2xl p-6 text-white overflow-hidden shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 w-32 h-32 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                {isAr ? "التقارير اليومية" : "Rapports journaliers"}
              </h2>
              <p className="text-orange-100 text-sm mt-0.5">
                {isAr
                  ? "توثيق يومي لسير الأشغال في الموقع"
                  : "Documentation quotidienne des travaux sur le chantier"}
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[64px]">
              <p className="text-xl font-bold">{logs.length}</p>
              <p className="text-[11px] text-orange-100">
                {isAr ? "تقرير" : "Rapports"}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[64px]">
              <p className="text-xl font-bold">{totalWorkers}</p>
              <p className="text-[11px] text-orange-100">
                {isAr ? "حضور" : "Présences"}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[64px]">
              <p className="text-xl font-bold">{totalPhotos}</p>
              <p className="text-[11px] text-orange-100">
                {isAr ? "صورة" : "Photos"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={isAr ? "بحث في التقارير..." : "Rechercher..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-10 focus-visible:ring-orange-500"
            />
          </div>

          {/* Month filter */}
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-10 w-[150px]">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 me-1" />
              <SelectValue placeholder={isAr ? "الشهر" : "Mois"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {isAr ? "كل الأشهر" : "Tous les mois"}
              </SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {new Date(m + "-01").toLocaleDateString(
                    isAr ? "ar-DZ" : "fr-FR",
                    { year: "numeric", month: "long" }
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Weather filter */}
          <Select value={filterWeather} onValueChange={setFilterWeather}>
            <SelectTrigger className="h-10 w-[130px]">
              <Sun className="w-3.5 h-3.5 text-slate-400 me-1" />
              <SelectValue placeholder={isAr ? "الطقس" : "Météo"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {isAr ? "كل الأحوال" : "Tous"}
              </SelectItem>
              <SelectItem value="sunny">
                {isAr ? "مشمس" : "Ensoleillé"}
              </SelectItem>
              <SelectItem value="cloudy">
                {isAr ? "غائم" : "Nuageux"}
              </SelectItem>
              <SelectItem value="rainy">
                {isAr ? "ممطر" : "Pluvieux"}
              </SelectItem>
              <SelectItem value="stormy">
                {isAr ? "عاصف" : "Orageux"}
              </SelectItem>
              <SelectItem value="windy">
                {isAr ? "رياح" : "Venteux"}
              </SelectItem>
              <SelectItem value="foggy">
                {isAr ? "ضبابي" : "Brumeux"}
              </SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || filterMonth !== "all" || filterWeather !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-slate-400 hover:text-slate-700 gap-1.5"
              onClick={() => {
                setSearchQuery("");
                setFilterMonth("all");
                setFilterWeather("all");
              }}
            >
              <Filter className="w-3.5 h-3.5" />
              {isAr ? "مسح" : "Réinitialiser"}
            </Button>
          )}
        </div>

        {/* Add button */}
        <AddDailyLogDialog
          isAr={isAr}
          projectId={project.id}
          onSuccess={() => fetchLogs(true)}
        />
      </div>

      {/* Logs */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
              <BookOpen className="w-9 h-9 text-orange-300 dark:text-orange-700" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            </div>
          </div>
          <div className="max-w-xs space-y-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {logs.length === 0
                ? isAr
                  ? "لا توجد تقارير بعد"
                  : "Aucun rapport pour l'instant"
                : isAr
                ? "لا توجد نتائج"
                : "Aucun résultat"}
            </h3>
            <p className="text-slate-500 text-sm">
              {logs.length === 0
                ? isAr
                  ? "ابدأ بتوثيق الأعمال اليومية بإضافة أول تقرير."
                  : "Commencez par ajouter le premier rapport journalier."
                : isAr
                ? "حاول تعديل معايير البحث أو الفلترة."
                : "Essayez de modifier vos critères de recherche."}
            </p>
          </div>
          {logs.length === 0 && (
            <AddDailyLogDialog
              isAr={isAr}
              projectId={project.id}
              onSuccess={() => fetchLogs(true)}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-medium">
            {isAr
              ? `عرض ${filteredLogs.length} من ${logs.length} تقرير`
              : `${filteredLogs.length} / ${logs.length} rapports`}
          </p>
          {filteredLogs.map((log) => (
            <DailyLogCard
              key={log.id}
              log={log}
              isAr={isAr}
              projectId={project.id}
              onEdit={() => fetchLogs(true)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
