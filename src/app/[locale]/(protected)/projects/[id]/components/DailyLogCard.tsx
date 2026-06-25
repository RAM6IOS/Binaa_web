"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Thermometer, Users, Truck, Ruler, Package,
  ImageIcon, ChevronDown, ChevronUp, Pencil, Trash2,
  AlertTriangle,
  StickyNote,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { DailyLog } from "@/lib/types/daily-logs";
import { AttachmentsList } from "./AttachmentsList";
import { attachmentsService } from "@/lib/services/attachments-service";
// استيراد مكون الديالوج هنا مهم جداً
import { AddDailyLogDialog } from "./AddDailyLogDialog";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, FileDown } from "lucide-react";


interface DailyLogCardProps {
  log: DailyLog;
  isAr: boolean;
  projectId: string;
  onEdit?: () => void; // هذا سيصبح لإعادة تحميل البيانات بعد النجاح
  onDelete: (id: string) => void;
}

export function DailyLogCard({ log, isAr, projectId, onEdit, onDelete }: DailyLogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);

  const locale = isAr ? ar : fr;
  const formattedDate = format(new Date(log.log_date), "EEEE dd MMMM yyyy", { locale });

  useEffect(() => {
    if (!expanded) return;
    setIsAttachmentsLoading(true);
    attachmentsService.getAttachmentsByEntity('daily_log', log.id)
      .then(setAttachments)
      .catch(console.error)
      .finally(() => setIsAttachmentsLoading(false));
  }, [expanded, log.id]);

  const totalWorkers = log.workers_present?.length || 0;
  const totalEquipment = log.equipment_used?.length || 0;
  const totalQuantities = log.quantities?.length || 0;
  const totalMaterials = log.materials?.length || 0;

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-xl">{formattedDate}</p>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <div className="flex items-center gap-1">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  {log.temperature}°C
                </div>
                <Badge variant="outline" className="capitalize">
                  {log.weather_condition === "sunny" ? (isAr ? "مشمس" : "Sunny") : log.weather_condition}
                </Badge>
                {log.overall_progress !== undefined && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                    {log.overall_progress}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* الحل: نقوم بتغليف زر القلم بداخل الديالوج */}
            <AddDailyLogDialog
              isAr={isAr}
              projectId={projectId}
              log={log} // نمرر الـ log هنا ليتحول الوضع إلى "تعديل"
              onSuccess={onEdit} // تحديث البيانات عند الحفظ
              trigger={
                <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                  <Pencil className="w-4 h-4 text-slate-600" />
                </Button>
              }
            />

            <Button variant="ghost" size="icon" onClick={() => onDelete(log.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>

          </div>
        </div>

        {/* العمل المنجز */}
        <div className="mb-5">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {log.work_summary}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatBox icon={<Users className="w-4 h-4" />} color="emerald" count={totalWorkers} label={isAr ? "عامل" : "Ouvriers"} />
          <StatBox icon={<Truck className="w-4 h-4" />} color="blue" count={totalEquipment} label={isAr ? "معدة" : "Engins"} />
          <StatBox icon={<Ruler className="w-4 h-4" />} color="purple" count={totalQuantities} label={isAr ? "كمية" : "Métré"} />
          <StatBox icon={<Package className="w-4 h-4" />} color="amber" count={totalMaterials} label={isAr ? "مادة" : "Articles"} />
        </div>

        {/* Expand Button */}
        <Button
          variant="ghost"
          className="w-full text-slate-500 hover:text-slate-900 border-t border-slate-50 dark:border-slate-800 rounded-none h-12"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (isAr ? "إخفاء التفاصيل" : "Cacher") : (isAr ? "عرض التفاصيل الكاملة" : "Voir plus")}
          {expanded ? <ChevronUp className="mr-2 w-4 h-4" /> : <ChevronDown className="mr-2 w-4 h-4" />}
        </Button>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 space-y-6 animate-in fade-in duration-300">
            {/* هنا نضع تفاصيل العمال، المعدات، الكميات بنفس طريقتك السابقة */}
            {/* Expanded Content */}
            {expanded && (
              <div className="mt-4 pt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">

                {/* 1. المشاكل والملحوظات (تظهر في البداية لأهميتها) */}
                {(log.problems_faced || log.notes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-6">
                    {log.problems_faced && (
                      <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                        <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          {isAr ? "المشاكل التي واجهتها" : "Problèmes rencontrés"}
                        </h4>
                        <p className="text-sm text-red-800 dark:text-red-200">{log.problems_faced}</p>
                      </div>
                    )}
                    {log.notes && (
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                          <StickyNote className="w-4 h-4" />
                          {isAr ? "ملاحظات إضافية" : "Notes"}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{log.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. تفاصيل العمال */}
                {totalWorkers > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-emerald-600 uppercase tracking-wider">
                      <Users className="w-4 h-4" />
                      {isAr ? "تفاصيل العمال الحاضرين" : "Détails du personnel"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {log.workers_present?.map((w, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg border bg-white dark:bg-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold uppercase">
                              {w.worker_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate max-w-[120px]">{w.worker_name}</p>
                              <p className="text-[10px] text-slate-500">{w.job_title}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1 h-5 font-mono">
                            {w.hours_worked}h
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. تفاصيل المعدات */}
                {totalEquipment > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-blue-600 uppercase tracking-wider">
                      <Truck className="w-4 h-4" />
                      {isAr ? "تفاصيل استخدام المعدات" : "Utilisation des engins"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {log.equipment_used?.map((e, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg border bg-white dark:bg-slate-900">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="p-1 bg-blue-50 text-blue-600 rounded">#</span>
                            {e.equipment_name}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {e.usage_hours}h {isAr ? "تشغيل" : "Service"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. تفاصيل الكميات المنجزة (L'unité d'œuvre) */}
                {totalQuantities > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-purple-600 uppercase tracking-wider">
                      <Ruler className="w-4 h-4" />
                      {isAr ? "قياس الأعمال المنجزة" : "Métrés réalisés"}
                    </h4>
                    <div className="space-y-2">
                      {log.quantities?.map((q, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/20">
                          <span className="text-sm font-medium">{q.description}</span>
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                            {q.achieved_quantity} <span className="text-xs font-normal opacity-80">{q.unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. تفاصيل استهلاك المواد */}
                {totalMaterials > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-amber-600 uppercase tracking-wider">
                      <Package className="w-4 h-4" />
                      {isAr ? "جرد استهلاك المواد" : "Consommation matériaux"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {log.materials?.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/30">
                          <span className="text-xs font-bold">{m.material_name}</span>
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                            {m.quantity} {m.unit}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. المرفقات والصور */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-700">
                    <ImageIcon className="w-4 h-4" />
                    {isAr ? "الصور والمستندات الملحقة" : "Attachments & Médias"}
                  </h4>
                  {isAttachmentsLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <p className="text-xs text-slate-500">{isAr ? "جاري تحميل المرفقات..." : "Chargement..."}</p>
                    </div>
                  ) : (
                    <AttachmentsList attachments={attachments} isAr={isAr} readOnly />
                  )}
                </div>

              </div>
            )}
            {/* ... */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// مكون مساعد لتنسيق الصناديق الإحصائية
function StatBox({ icon, color, count, label }: { icon: any, color: string, count: number, label: string }) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600"
  };

  return (
    <div className={`${colors[color]} dark:bg-slate-900/40 rounded-xl p-3 flex flex-col items-center justify-center`}>
      <div className="mb-1">{icon}</div>
      <p className="font-bold text-lg leading-tight">{count}</p>
      <p className="text-[10px] uppercase font-bold opacity-80 tracking-wider">{label}</p>
    </div>
  );
}