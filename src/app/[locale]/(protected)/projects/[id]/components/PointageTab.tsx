"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Users,
  CalendarDays,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Filter,
  Truck,
  Clock,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  StickyNote,
  UserCheck,
} from "lucide-react";
import { pointageService } from "@/lib/services/pointage-service";
import { Pointage } from "@/lib/types/daily-logs";
import { Project } from "@/lib/types/projects";
import { AddPointageDialog } from "./AddPointageDialog";
import { toast } from "sonner";

interface PointageTabProps {
  project: Project;
  isAr: boolean;
}

const statusConfig: Record<string, { labelAr: string; labelFr: string; color: string }> = {
  present: {
    labelAr: "حاضر",
    labelFr: "Présent",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30",
  },
  half_day: {
    labelAr: "نصف يوم",
    labelFr: "Demi-journée",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/30",
  },
  overtime: {
    labelAr: "إضافي",
    labelFr: "Heures Sup",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/30",
  },
  absent: {
    labelAr: "غائب",
    labelFr: "Absent",
    color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/30",
  },
};

export function PointageTab({ project, isAr }: PointageTabProps) {
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded card state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const pointageData = await pointageService.getByProjectId(project.id);
        setPointages(pointageData as Pointage[]);
      } catch (err: any) {
        setError(err?.message || (isAr ? "حدث خطأ في تحميل البيانات" : "Erreur de chargement"));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [project.id, isAr]
  );

  useEffect(() => {
    fetchData();
    const unsubscribe = pointageService.subscribe(project.id, () => fetchData(true));
    return unsubscribe;
  }, [fetchData, project.id]);

  const handleDelete = async (id: string) => {
    const confirmed = confirm(
      isAr
        ? "هل أنت متأكد من حذف تسجيل الحضور لهذا اليوم؟"
        : "Confirmer la suppression du pointage de ce jour ?"
    );
    if (!confirmed) return;

    try {
      await pointageService.delete(id);
      setPointages((prev) => prev.filter((p) => p.id !== id));
      toast.success(isAr ? "تم حذف تسجيل الحضور بنجاح" : "Pointage supprimé avec succès");
    } catch (err: any) {
      toast.error(isAr ? "فشل في حذف تسجيل الحضور" : "Échec de la suppression");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter & Search
  const filteredPointages = pointages.filter((p) => {
    const workers = p.pointage_workers || [];
    const matchesSearch =
      !searchQuery ||
      p.pointage_date.includes(searchQuery) ||
      (p.notes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      workers.some((w) => (w.worker_name || "").toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMonth =
      filterMonth === "all" || p.pointage_date.substring(0, 7) === filterMonth;

    return matchesSearch && matchesMonth;
  });

  // Available months from logs
  const availableMonths = Array.from(
    new Set(pointages.map((p) => p.pointage_date.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  // Compute overall stats
  const totalDays = pointages.length;
  const totalHours = pointages.reduce((acc, p) => {
    const workers = p.pointage_workers || [];
    return acc + workers.reduce((sum, w) => sum + (w.hours_worked || 0), 0);
  }, 0);
  const totalPresentCount = pointages.reduce((acc, p) => {
    const workers = p.pointage_workers || [];
    return acc + workers.filter((w) => w.status !== "absent").length;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col py-20 items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <UserCheck className="absolute inset-0 m-auto w-6 h-6 text-emerald-600 animate-pulse" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">
          {isAr ? "جاري تحميل سجلات الحضور اليومي..." : "Chargement des pointages..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col py-20 items-center justify-center gap-6 p-6 text-center">
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero Banner with Stats */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 w-32 h-32 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">
                  {isAr ? "سجل الحضور اليومي (Pointage)" : "Présence Journalière (Pointage)"}
                </h2>
                <p className="text-emerald-100 text-sm mt-0.5">
                  {isAr
                    ? "متابعة الحضور اليومي للعمال وساعات عمل المعدات"
                    : "Suivi quotidien des présences et des heures d'équipement"}
                </p>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-bold">{totalDays}</p>
              <p className="text-xs text-emerald-100">{isAr ? "أيام مسجلة" : "Jours"}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-bold">{totalPresentCount}</p>
              <p className="text-xs text-emerald-100">{isAr ? "إجمالي الحضور" : "Présences"}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-bold">{totalHours}h</p>
              <p className="text-xs text-emerald-100">{isAr ? "ساعات العمل" : "Heures"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={isAr ? "بحث في الحضور والتاريخ..." : "Rechercher..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-10 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Month Filter */}
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

          {(searchQuery || filterMonth !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-slate-400 hover:text-slate-700 gap-1.5"
              onClick={() => {
                setSearchQuery("");
                setFilterMonth("all");
              }}
            >
              <Filter className="w-3.5 h-3.5" />
              {isAr ? "إعادة ضبط" : "Réinitialiser"}
            </Button>
          )}
        </div>

        {/* Add Button */}
        <AddPointageDialog
          isAr={isAr}
          projectId={project.id}
          onSuccess={() => fetchData(true)}
        />
      </div>

      {/* Pointage History List */}
      {filteredPointages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
              <UserCheck className="w-10 h-10 text-emerald-300 dark:text-emerald-700" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {pointages.length === 0
                ? isAr ? "لا توجد سجلات حضور بعد" : "Aucun pointage enregistré"
                : isAr ? "لا توجد نتائج مطابقة" : "Aucun résultat"}
            </h3>
            <p className="text-slate-500 text-sm">
              {pointages.length === 0
                ? isAr
                  ? "ابدأ بتسجيل حضور العمال والعتاد اليومي للمشروع."
                  : "Commencez à enregistrer les présences quotidiennes des ouvriers."
                : isAr
                ? "حاول تعديل معايير البحث أو تصفية الأشهر."
                : "Essayez de modifier vos critères de recherche."}
            </p>
          </div>
          {pointages.length === 0 && (
            <AddPointageDialog
              isAr={isAr}
              projectId={project.id}
              onSuccess={() => fetchData(true)}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-medium">
            {isAr
              ? `عرض ${filteredPointages.length} من ${pointages.length} يوم`
              : `Affichage de ${filteredPointages.length} sur ${pointages.length} jours`}
          </p>

          {/* List of cards */}
          {filteredPointages.map((log) => {
            const isExpanded = !!expandedCards[log.id];
            const workers = log.pointage_workers || [];
            const presentWorkers = workers.filter((w) => w.status !== "absent");
            const absentWorkers = workers.filter((w) => w.status === "absent");
            const equipment = log.equipment_used || [];
            const photosList = log.photos || [];

            const totalDayHours = workers.reduce((acc, w) => acc + (w.hours_worked || 0), 0);

            const dateStr = new Date(log.pointage_date + "T00:00:00").toLocaleDateString(
              isAr ? "ar-DZ" : "fr-FR",
              { weekday: "long", year: "numeric", month: "long", day: "numeric" }
            );

            return (
              <Card
                key={log.id}
                className="border-2 border-slate-150 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                {/* Card Top bar */}
                <div className="bg-slate-50/80 dark:bg-slate-900/40 px-5 py-4 flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-slate-850 dark:text-white text-sm md:text-base">
                      {dateStr}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <AddPointageDialog
                      isAr={isAr}
                      projectId={project.id}
                      log={log}
                      onSuccess={() => fetchData(true)}
                      trigger={
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {isAr ? "تعديل" : "Modifier"}
                        </Button>
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-slate-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isAr ? "حذف" : "Supprimer"}
                    </Button>
                  </div>
                </div>

                {/* Card Content summary */}
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {/* Present Badge */}
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-150 dark:border-emerald-900/40">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {presentWorkers.length} {isAr ? "عمال حاضرين" : "présents"}
                      </span>
                      {absentWorkers.length > 0 && (
                        <span className="text-red-500 dark:text-red-400">
                          ({absentWorkers.length} {isAr ? "غائبين" : "absents"})
                        </span>
                      )}
                      <span className="text-emerald-300 dark:text-emerald-800">·</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{totalDayHours}h</span>
                    </div>

                    {/* Equipment Badge */}
                    {equipment.length > 0 && (
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-blue-150 dark:border-blue-900/40">
                        <Truck className="w-3.5 h-3.5" />
                        <span>
                          {equipment.length} {isAr ? "معدات مستخدمة" : "équipements"}
                        </span>
                      </div>
                    )}

                    {/* Photos Badge */}
                    {photosList.length > 0 && (
                      <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-purple-150 dark:border-purple-900/40">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>
                          {photosList.length} {isAr ? "صور مرفقة" : "photos"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Note block if exists */}
                  {log.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-1">
                      <strong>{isAr ? "ملاحظة: " : "Note: "}</strong>
                      {log.notes}
                    </p>
                  )}

                  {/* Expand / Collapse Button */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                  >
                    {isExpanded
                      ? isAr ? "إخفاء التفاصيل" : "Masquer les détails"
                      : isAr ? "عرض تفاصيل الحضور والعتاد" : "Voir le pointage complet"}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-850 animate-in fade-in duration-200">
                      {/* Workers Detail List */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          {isAr ? "تفاصيل حضور العمال" : "Détails des Ouvriers"}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {workers.map((w, idx) => {
                            const status = w.status || "present";
                            const config = statusConfig[status] || statusConfig.present;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/40 dark:bg-slate-900/20 border-slate-150 dark:border-slate-800"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                    {w.worker_name}
                                  </p>
                                  {w.job_title && (
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{w.job_title}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                  <Badge className={`border px-2 py-0.5 text-[9px] font-bold rounded-lg shadow-none ${config.color}`}>
                                    {isAr ? config.labelAr : config.labelFr}
                                  </Badge>
                                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    {w.hours_worked}h
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Equipment Used List */}
                      {equipment.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 text-blue-500" />
                            {isAr ? "ساعات عمل المعدات" : "Utilisation des Équipements"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {equipment.map((e, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/40 dark:bg-slate-900/20 border-slate-150 dark:border-slate-800"
                              >
                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                  {e.equipment_name}
                                </p>
                                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 text-[10px] font-bold gap-1 shadow-none">
                                  <Clock className="w-2.5 h-2.5" />
                                  {e.usage_hours}h
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes Details */}
                      {log.notes && (
                        <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <StickyNote className="w-3.5 h-3.5 text-emerald-500" />
                            {isAr ? "ملاحظات إضافية" : "Notes"}
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {log.notes}
                          </p>
                        </div>
                      )}

                      {/* Photo attachments details */}
                      {photosList.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                            {isAr ? "الصور والمرفقات الميدانية" : "Photos jointes"}
                          </h4>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {photosList.map((photo, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setLightboxSrc(photo.url)}
                                className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group hover:shadow-lg transition-all"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.caption || `Pointage ${idx + 1}`}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox photo preview */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            ✕
          </button>
          <img
            src={lightboxSrc}
            alt="Proof Pointage"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
