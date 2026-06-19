"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Users,
  Truck,
  Clock,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  AlertTriangle,
  StickyNote,
  CalendarDays,
  FileText,
  Loader2,
} from "lucide-react";
import { DailyLog, WeatherCondition } from "@/lib/types/daily-logs";
import { AddDailyLogDialog } from "./AddDailyLogDialog";
import { attachmentsService, Attachment } from "@/lib/services/attachments-service";
import { AttachmentsList } from "./AttachmentsList";

interface DailyLogCardProps {
  log: DailyLog;
  isAr: boolean;
  projectId: string;
  onEdit?: () => void;
  onDelete: (id: string) => void;
}

const weatherConfig: Record<WeatherCondition, { icon: React.ReactNode; labelAr: string; labelFr: string; bgColor: string; textColor: string; borderColor: string }> = {
  sunny: {
    icon: <Sun className="w-4 h-4" />,
    labelAr: "مشمس",
    labelFr: "Ensoleillé",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    textColor: "text-yellow-600 dark:text-yellow-400",
    borderColor: "border-yellow-200 dark:border-yellow-900/40",
  },
  cloudy: {
    icon: <Cloud className="w-4 h-4" />,
    labelAr: "غائم",
    labelFr: "Nuageux",
    bgColor: "bg-slate-50 dark:bg-slate-800/40",
    textColor: "text-slate-500 dark:text-slate-400",
    borderColor: "border-slate-200 dark:border-slate-700",
  },
  rainy: {
    icon: <CloudRain className="w-4 h-4" />,
    labelAr: "ممطر",
    labelFr: "Pluvieux",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-900/40",
  },
  stormy: {
    icon: <CloudSnow className="w-4 h-4" />,
    labelAr: "عاصف",
    labelFr: "Orageux",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    textColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-200 dark:border-purple-900/40",
  },
  windy: {
    icon: <Wind className="w-4 h-4" />,
    labelAr: "رياح",
    labelFr: "Venteux",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20",
    textColor: "text-cyan-600 dark:text-cyan-400",
    borderColor: "border-cyan-200 dark:border-cyan-900/40",
  },
  foggy: {
    icon: <Cloud className="w-4 h-4" />,
    labelAr: "ضبابي",
    labelFr: "Brumeux",
    bgColor: "bg-gray-50 dark:bg-gray-800/40",
    textColor: "text-gray-500 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-700",
  },
};

export function DailyLogCard({ log, isAr, projectId, onEdit, onDelete }: DailyLogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);

  useEffect(() => {
    if (!expanded || !log?.id) {
      setAttachments([]);
      setIsAttachmentsLoading(false);
      return;
    }

    setIsAttachmentsLoading(true);

    attachmentsService.getAttachmentsByEntity('daily_log', log.id)
      .then((data) => {
        setAttachments(data || []);
      })
      .catch((err) => {
        console.error("=== FULL ATTACHMENTS FETCH ERROR ===");
        console.error("Error:", err);
        console.error("Message:", err?.message);
        console.error("Details:", err?.details);
        setAttachments([]);
      })
      .finally(() => {
        setIsAttachmentsLoading(false);
      });
  }, [expanded, log?.id]);   // ← أضف ? هنا
  const weather = weatherConfig[log.weather_condition] ?? weatherConfig.sunny;

  const formattedDate = new Date(log.log_date + "T00:00:00").toLocaleDateString(
    isAr ? "ar-DZ" : "fr-FR",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const totalWorkerHours = (log.workers_present || []).reduce(
    (acc, w) => acc + (w.hours_worked || 0),
    0
  );

  return (
    <>
      <Card className={`border-2 ${weather.borderColor} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}>
        {/* Card Top Bar */}
        <div className={`${weather.bgColor} px-5 py-4 flex flex-wrap gap-3 items-center justify-between`}>
          {/* Date + Weather */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-800 dark:text-white text-sm">{formattedDate}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${weather.bgColor} ${weather.textColor} border ${weather.borderColor}`}>
              {weather.icon}
              {isAr ? weather.labelAr : weather.labelFr}
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold ${weather.textColor}`}>
              <Thermometer className="w-3.5 h-3.5" />
              {log.temperature}°C
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <AddDailyLogDialog
              isAr={isAr}
              projectId={projectId}
              log={log}
              onSuccess={onEdit}
              trigger={
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                  <Pencil className="w-3.5 h-3.5" />
                  {isAr ? "تعديل" : "Modifier"}
                </Button>
              }
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDelete(log.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isAr ? "حذف" : "Supprimer"}
            </Button>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Quick stats row */}
          <div className="flex flex-wrap gap-3">
            {(log.workers_present || []).length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-900/40">
                <Users className="w-3.5 h-3.5" />
                {(log.workers_present || []).length} {isAr ? "عامل" : "ouvriers"}
                <span className="text-emerald-500 dark:text-emerald-500 mx-1">·</span>
                <Clock className="w-3.5 h-3.5" />
                {totalWorkerHours}h
              </div>
            )}
            {(log.equipment_used || []).length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-900/40">
                <Truck className="w-3.5 h-3.5" />
                {(log.equipment_used || []).length} {isAr ? "معدة" : "équipements"}
              </div>
            )}
            {(log.photos || []).length > 0 && (
              <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-purple-200 dark:border-purple-900/40">
                <ImageIcon className="w-3.5 h-3.5" />
                {(log.photos || []).length} {isAr ? "صورة" : "photo(s)"}
              </div>
            )}
          </div>

          {/* Work Summary */}
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1.5">
              {isAr ? "ملخص الأعمال:" : "Résumé des travaux:"}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
              {log.work_summary || (isAr ? "لا يوجد ملخص." : "Aucun résumé.")}
            </p>
          </div>

          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            {expanded
              ? isAr ? "إخفاء التفاصيل" : "Masquer les détails"
              : isAr ? "عرض التفاصيل الكاملة" : "Voir les détails complets"}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Expanded Section */}
          {expanded && (
            <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-800">

              {/* Problems */}
              {log.problems_faced && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {isAr ? "المشاكل والعقبات" : "Problèmes rencontrés"}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                    {log.problems_faced}
                  </p>
                </div>
              )}

              {/* Notes */}
              {log.notes && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <StickyNote className="w-3.5 h-3.5" />
                    {isAr ? "ملاحظات إضافية" : "Notes supplémentaires"}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {log.notes}
                  </p>
                </div>
              )}

              {/* Workers */}
              {(log.workers_present || []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    {isAr ? "العمال الحاضرون" : "Ouvriers présents"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(log.workers_present || []).map((w, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold flex-shrink-0">
                            {(w.worker_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{w.worker_name}</p>
                            {w.job_title && (
                              <p className="text-[10px] text-slate-400 truncate">{w.job_title}</p>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] flex-shrink-0 gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {w.hours_worked}h
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {(log.equipment_used || []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                    {isAr ? "المعدات المستخدمة" : "Équipements utilisés"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(log.equipment_used || []).map((e, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                            {e.equipment_name}
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] flex-shrink-0 gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {e.usage_hours}h
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos Grid */}
              {(log.photos || []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                    {isAr ? "الصور الميدانية" : "Photos de terrain"}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {(log.photos || []).map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightboxSrc(photo.url)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group hover:shadow-lg transition-all"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || `صورة ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  {isAr ? "المرفقات والمستندات" : "Pièces jointes & Documents"}
                </p>
                {isAttachmentsLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span className="text-xs">{isAr ? "جاري تحميل المرفقات..." : "Chargement..."}</span>
                  </div>
                ) : (
                  <AttachmentsList
                    attachments={attachments}
                    isAr={isAr}
                    readOnly={true}
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
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
            alt="صورة ميدانية"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
