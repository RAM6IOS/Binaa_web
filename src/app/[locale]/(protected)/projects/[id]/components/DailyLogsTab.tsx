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
  Plus,
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

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterWeather, setFilterWeather] = useState<string>("all");

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

  // ────── التصحيح البرمجي لـ useEffect ──────
  useEffect(() => {
    // 1. جلب البيانات عند التحميل الأول
    fetchLogs();

    // 2. البدء بالاشتراك في التغييرات اللحظية
    const subscription = dailyLogService.subscribe(project.id, () => {
      fetchLogs(true); // جلب البيانات "بصمت" عند حدوث تغيير
    });

    // 3. دالة التنظيف: نقوم بتغليف الاستدعاء ليكون متزامناً
    return () => {
      // نقوم باستدعاء الدالة لكننا لا نعيد الـ Promise الخاص بها لـ React
      // React يتوقع () => void وليس () => Promise<void>
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

    return matchesSearch && matchesMonth && matchesWeather;
  });

  const availableMonths = Array.from(new Set(logs.map((l) => l.log_date.substring(0, 7)))).sort((a, b) => b.localeCompare(a));

  const totalWorkers = logs.reduce((acc, l) => acc + (l.workers_present || []).length, 0);
  const totalPhotos = logs.reduce((acc, l) => acc + (l.photos || []).length, 0);

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
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-2xl p-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">التقارير اليومية</h2>
          <p className="text-orange-100">توثيق يومي لسير الأعمال</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{logs.length}</div>
          <div className="text-sm opacity-75">تقرير</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-xl border">
        <div className="flex gap-3 flex-1">
          {/* Search + Filters (keep your existing code) */}
        </div>

        <AddDailyLogDialog
          isAr={isAr}
          projectId={project.id}
          onSuccess={() => { fetchLogs(true); onRefresh?.(); }}
          trigger={
            <Button size="lg" className="gap-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700">
              <Plus className="w-5 h-5" />
              {isAr ? "تقرير يومي جديد" : "Nouveau rapport"}
            </Button>
          }
        />
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="mx-auto w-16 h-16 text-slate-300 mb-4" />
          <p className="text-slate-500">لا توجد تقارير بعد</p>
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