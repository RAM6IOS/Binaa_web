"use client";

import { use, useCallback, useEffect, useState } from "react";
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
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Loader2,
  RefreshCcw,
  Search,
  Sun,
  Sparkles,
  Filter,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { projectsService } from "@/lib/services/projects-service";
import { dailyLogService } from "@/lib/services/daily-log-service";
import { DailyLog } from "@/lib/types/daily-logs";
import { Project } from "@/lib/types/projects";
import { AddDailyLogDialog } from "../components/AddDailyLogDialog";
import { DailyLogCard } from "../components/DailyLogCard";
import { toast } from "sonner";

interface PageParams {
  locale: string;
  id: string;
}

export default function DailyLogsPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, id: projectId } = use(params);
  const isAr = locale === "ar";
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterWeather, setFilterWeather] = useState<string>("all");

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [projectData, logsData] = await Promise.all([
          projectsService.getById(projectId).then((data) => data as Project),
          dailyLogService.getByProjectId(projectId),
        ]);
        setProject(projectData);
        setLogs(logsData);
      } catch (err: any) {
        setError(err?.message || (isAr ? "حدث خطأ في تحميل البيانات" : "Erreur de chargement"));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [projectId, isAr]
  );


  useEffect(() => {
    fetchData();

    const unsubscribePromise = dailyLogService.subscribe(projectId, () => fetchData(true));


    return () => {

      if (typeof unsubscribePromise === 'function') {
        unsubscribePromise();
      }
    };
  }, [fetchData, projectId]);
  const handleDelete = async (id: string) => {
    const confirmed = confirm(
      isAr ? "هل أنت متأكد من حذف هذا التقرير؟" : "Confirmer la suppression de ce rapport?"
    );
    if (!confirmed) return;

    try {
      await dailyLogService.delete(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success(isAr ? "تم حذف التقرير بنجاح" : "Rapport supprimé avec succès");
    } catch (err: any) {
      toast.error(isAr ? "فشل في حذف التقرير" : "Échec de la suppression");
    }
  };

  // Filter & Search
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.work_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Available months from logs
  const availableMonths = Array.from(
    new Set(logs.map((l) => l.log_date.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  // Stats
  const totalWorkers = logs.reduce((acc, l) => acc + (l.workers_present || []).length, 0);
  const totalPhotos = logs.reduce((acc, l) => acc + (l.photos || []).length, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          <BookOpen className="absolute inset-0 m-auto w-6 h-6 text-orange-600" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">
          {isAr ? "جاري تحميل التقارير اليومية..." : "Chargement des rapports journaliers..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-6 p-6 text-center">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{isAr ? "حدث خطأ" : "Une erreur est survenue"}</h2>
          <p className="text-slate-500 text-sm max-w-md">{error}</p>
        </div>
        <Button onClick={() => fetchData()} className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          {isAr ? "إعادة المحاولة" : "Réessayer"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push(`/projects/${projectId}`)}
        className="gap-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {isAr ? "العودة إلى المشروع" : "Retour au projet"}
      </Button>

      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 w-32 h-32 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {isAr ? "التقارير اليومية" : "Rapports journaliers"}
                </h1>
                {project && (
                  <p className="text-orange-100 text-sm mt-0.5">
                    {project.name} · {project.wilaya}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-orange-100">{isAr ? "تقرير" : "Rapports"}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{totalWorkers}</p>
              <p className="text-xs text-orange-100">{isAr ? "حضور" : "Présences"}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
              <p className="text-2xl font-bold">{totalPhotos}</p>
              <p className="text-xs text-orange-100">{isAr ? "صورة" : "Photos"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={isAr ? "بحث في التقارير..." : "Rechercher..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-10 focus-visible:ring-orange-500"
            />
          </div>

          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-10 w-[160px] gap-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <SelectValue placeholder={isAr ? "الشهر" : "Mois"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? "كل الأشهر" : "Tous les mois"}</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {new Date(month + "-01").toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", {
                    year: "numeric",
                    month: "long",
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterWeather} onValueChange={setFilterWeather}>
            <SelectTrigger className="h-10 w-[140px] gap-2">
              <Sun className="w-4 h-4 text-slate-400" />
              <SelectValue placeholder={isAr ? "الطقس" : "Météo"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? "كل الأحوال" : "Tous"}</SelectItem>
              <SelectItem value="sunny">{isAr ? "مشمس" : "Ensoleillé"}</SelectItem>
              <SelectItem value="cloudy">{isAr ? "غائم" : "Nuageux"}</SelectItem>
              <SelectItem value="rainy">{isAr ? "ممطر" : "Pluvieux"}</SelectItem>
              <SelectItem value="stormy">{isAr ? "عاصف" : "Orageux"}</SelectItem>
              <SelectItem value="windy">{isAr ? "رياح" : "Venteux"}</SelectItem>
              <SelectItem value="foggy">{isAr ? "ضبابي" : "Brumeux"}</SelectItem>
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
              {isAr ? "إعادة ضبط" : "Réinitialiser"}
            </Button>
          )}
        </div>

        {/* Add Button */}
        <AddDailyLogDialog
          isAr={isAr}
          projectId={projectId}
          onSuccess={() => fetchData(true)}
        />
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-orange-300 dark:text-orange-700" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {logs.length === 0
                ? isAr ? "لا توجد تقارير بعد" : "Aucun rapport pour l'instant"
                : isAr ? "لا توجد نتائج" : "Aucun résultat"}
            </h3>
            <p className="text-slate-500 text-sm">
              {logs.length === 0
                ? isAr
                  ? "ابدأ بإضافة أول تقرير يومي لهذا المشروع لتوثيق سير العمل."
                  : "Commencez par ajouter le premier rapport journalier pour ce projet."
                : isAr
                  ? "لا توجد تقارير مطابقة للبحث. حاول تغيير معايير التصفية."
                  : "Aucun rapport ne correspond à votre recherche. Modifiez vos filtres."}
            </p>
          </div>
          {logs.length === 0 && (
            <AddDailyLogDialog
              isAr={isAr}
              projectId={projectId}
              onSuccess={() => fetchData(true)}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Result count */}
          <p className="text-sm text-slate-500 font-medium">
            {isAr
              ? `عرض ${filteredLogs.length} من ${logs.length} تقرير`
              : `Affichage de ${filteredLogs.length} sur ${logs.length} rapports`}
          </p>

          {filteredLogs.map((log) => (
            <DailyLogCard
              key={log.id}
              log={log}
              isAr={isAr}
              projectId={projectId}
              onEdit={() => fetchData(true)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
