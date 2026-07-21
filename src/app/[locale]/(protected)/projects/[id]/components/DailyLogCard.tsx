"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Thermometer, Users, Truck, Ruler, Package,
  ImageIcon, ChevronDown, ChevronUp, Pencil, Trash2,
  AlertTriangle, StickyNote, Loader2, FileDown, MapPin, CheckCircle, HardHat
} from "lucide-react";
import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { DailyLog } from "@/lib/types/daily-logs";
import { Project } from "@/lib/types/projects";
import { dailyLogService } from "@/lib/services/daily-log-service";
import { AttachmentsList } from "./AttachmentsList";
import { attachmentsService } from "@/lib/services/attachments-service";
import { AddDailyLogDialog } from "./AddDailyLogDialog";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { DailyLogPDFDownload } from "@/components/daily-log/DailyLogPDF";
import { toast } from "sonner";

interface DailyLogCardProps {
  log: DailyLog;
  project: Project;
  isAr: boolean;
  projectId: string;
  onEdit?: () => void;
  onDelete: (id: string) => void;
}

export function DailyLogCard({ log, project, isAr, projectId, onEdit, onDelete }: DailyLogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // ─── إدارة حالة الحذف الموحد ───
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // تنفيذ الحذف الفعلي
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(log.id);
      // الإغلاق يتم تلقائياً لأن الكارت سيختفي من القائمة عند التحديث في الأب
    } catch (error) {
      toast.error(isAr ? "حدث خطأ أثناء الحذف" : "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await dailyLogService.generatePDF(log, isAr);
      toast.success(isAr ? "تم تحميل التقرير PDF" : "PDF téléchargé");
    } catch (err) {
      toast.error(isAr ? "فشل إنشاء PDF" : "Échec de la création PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const totalWorkers = log.workers_present?.length || 0;
  const totalEquipment = log.equipment_used?.length || 0;
  const totalQuantities = log.quantities?.length || 0;
  const totalMaterials = log.materials?.length || 0;

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all shadow-sm rounded-2xl group">

      {/* ─── الديالوج الموحد لتأكيد الحذف ─── */}
      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف التقرير اليومي" : "Supprimer le rapport"}
        description={isAr
          ? `هل أنت متأكد من حذف تقرير يوم ${formattedDate}؟ هذا الإجراء سيؤثر على بيانات التقدم اليومية ولا يمكن التراجع عنه.`
          : `Êtes-vous sûr de vouloir supprimer le rapport du ${formattedDate} ?`}
      />

      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex items-center gap-4 text-start">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-slate-900 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Calendar className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-xl tracking-tight text-slate-900 dark:text-white capitalize">{formattedDate}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs mt-1.5">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-400">
                  <Thermometer className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-mono font-bold">{log.temperature}°C</span>
                  {log.temperature_min != null && (
                    <>
                      <span className="text-slate-400 mx-0.5">/</span>
                      <span className="font-mono font-bold text-blue-500">{log.temperature_min}°C</span>
                    </>
                  )}
                </div>
                <Badge variant="outline" className="rounded-full bg-white dark:bg-slate-950 font-bold uppercase tracking-wider text-[10px]">
                  {log.weather_condition === "sunny" ? (isAr ? "مشمس" : "Sunny") : log.weather_condition}
                </Badge>
                {log.site_status && (
                  <Badge variant="outline" className={`rounded-full font-bold uppercase tracking-wider text-[10px] ${
                    log.site_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                    log.site_status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    log.site_status === 'delayed' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    log.site_status === 'inactive' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <HardHat className="w-3 h-3 me-1" />
                    {log.site_status === 'active' ? (isAr ? "نشطة" : "Active") :
                     log.site_status === 'in_progress' ? (isAr ? "في تقدم" : "En cours") :
                     log.site_status === 'delayed' ? (isAr ? "مؤجلة" : "Retardée") :
                     log.site_status === 'inactive' ? (isAr ? "متوقفة" : "Inactive") :
                     (isAr ? "مكتملة" : "Terminée")}
                  </Badge>
                )}
                {log.location_details && (
                  <div className="flex items-center gap-1 text-slate-500 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-full border">
                    <MapPin className="w-3 h-3" />
                    <span className="font-medium">{log.location_details}</span>
                  </div>
                )}
                {log.status === "validated" && (
                  <Badge className="bg-blue-600 text-white border-0 gap-1 h-6">
                    <CheckCircle className="w-3 h-3" /> {isAr ? "معتمد" : "Validé"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-start">

            <DailyLogPDFDownload dailyLog={log} project={project} isAr={isAr}>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-full h-9 w-9"
                aria-label={isAr ? "تصدير PDF" : "Exporter PDF"}
              >
                <FileDown className="w-4.5 h-4.5" />
              </Button>
            </DailyLogPDFDownload>

            <AddDailyLogDialog
              isAr={isAr}
              projectId={projectId}
              log={log}
              onSuccess={onEdit}
              trigger={
                <Button variant="ghost" size="icon" className="hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full h-9 w-9" aria-label={isAr ? "تعديل" : "Modifier"}>
                  <Pencil className="w-4.5 h-4.5" />
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full h-9 w-9"
              onClick={() => setDeleteModalOpen(true)}
              aria-label={isAr ? "حذف" : "Supprimer"}
            >
              <Trash2 className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>

        {/* ملخص الإنجاز */}
        <div className="relative mb-8 text-start group-hover:bg-slate-50/50 p-2 -mx-2 rounded-xl transition-colors">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {log.work_summary}
          </p>
        </div>

        {/* شبكة الإحصائيات (Stat Boxes) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox icon={<Users className="w-4.5 h-4.5" />} color="emerald" count={totalWorkers} label={isAr ? "عامل" : "Effectif"} />
          <StatBox icon={<Truck className="w-4.5 h-4.5" />} color="blue" count={totalEquipment} label={isAr ? "معدة" : "Engins"} />
          <StatBox icon={<Ruler className="w-4.5 h-4.5" />} color="purple" count={totalQuantities} label={isAr ? "بند منجز" : "Métrés"} />
          <StatBox icon={<Package className="w-4.5 h-4.5" />} color="amber" count={totalMaterials} label={isAr ? "مواد" : "Matériaux"} />
        </div>

        {/* Expand/Collapse Section */}
        <div className="flex flex-col items-center">
          <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />
          <Button
            variant="ghost"
            className="text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-slate-900 -mt-5 bg-white dark:bg-slate-950 px-6 h-10 border rounded-full transition-all active:scale-95"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (isAr ? "إخفاء التفاصيل" : "Cacher") : (isAr ? "عرض التفاصيل الكاملة" : "Détails")}
            {expanded ? <ChevronUp className="ms-2 w-4 h-4 animate-bounce" /> : <ChevronDown className="ms-2 w-4 h-4" />}
          </Button>
        </div>

        {/* المحتوى المفصل (تخلصنا من التكرار) */}
        {expanded && (
          <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-top-3 duration-300">

            {/* 1. المشاكل والملحوظات */}
            {(log.problems_faced || log.notes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-dashed pb-6">
                {log.problems_faced && (
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <h4 className="text-xs font-black text-red-700 uppercase flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" /> {isAr ? "عقبات ميدانية" : "Incidents"}
                    </h4>
                    <p className="text-sm text-red-900/80 dark:text-red-300 font-medium leading-relaxed">{log.problems_faced}</p>
                  </div>
                )}
                {log.notes && (
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border">
                    <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 mb-2">
                      <StickyNote className="w-4 h-4" /> {isAr ? "ملاحظات وتوصيات" : "Notes"}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"{log.notes}"</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. جدول الكميات المنجزة */}
            {totalQuantities > 0 && (
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Ruler className="w-4 h-4" /> {isAr ? "الكميات والقياسات (Situation)" : "Situations techniques"}
                </h4>
                <div className="space-y-2.5">
                  {log.quantities?.map((q, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800 transition-hover hover:border-purple-300 shadow-sm">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{q.description}</span>
                      <div className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-purple-200">
                        <span className="text-sm font-black text-purple-600">{q.achieved_quantity}</span>
                        <span className="text-[10px] text-slate-400 ms-1 uppercase">{q.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. العمال الحاضرون */}
            {totalWorkers > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> {isAr ? "بوانتاج العمال" : "Effectifs présents"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {log.workers_present?.map((w, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-2xl border bg-white dark:bg-slate-900 hover:shadow-md transition-shadow group/item">
                      <div className="flex items-center gap-3 text-start min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 flex items-center justify-center font-black text-[10px] uppercase shadow-sm">
                          {w.worker_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{w.worker_name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{w.job_title}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 px-2 py-1 rounded text-[10px] font-black font-mono group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">{w.hours_worked}H</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. المعدات والعتاد */}
            {totalEquipment > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-4 h-4" /> {isAr ? "العتاد المستهلك" : "Utilisation engins"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
                  {log.equipment_used?.map((e, idx) => (
                    <div key={idx} className="flex justify-between p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-900/60 font-bold text-xs group-hover:bg-white transition-colors">
                      <span className="text-slate-600 truncate"># {e.equipment_name}</span>
                      <span className="text-blue-600">{e.usage_hours} H <span className="text-[8px] opacity-60">USAGE</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. المرفقات والصور */}
            <div className="pt-8 border-t dark:border-slate-800">
              <div className="flex items-center justify-between mb-4 px-2 text-start">
                <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> {isAr ? "الألبوم الصوري والمستندات" : "Media & Attachments"}
                </h4>
                {log.overall_progress > 0 && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black italic">{log.overall_progress}% الإنجاز</span>}
              </div>
              {isAttachmentsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-600 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-tighter">Sync Media...</p>
                </div>
              ) : (
                <AttachmentsList attachments={attachments} isAr={isAr} readOnly />
              )}
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

// مكون مساعدة محسّن (Semantic Stats)
function StatBox({ icon, color, count, label }: { icon: any, color: string, count: number, label: string }) {
  const styles: any = {
    emerald: "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 border-blue-100",
    purple: "bg-purple-50/60 dark:bg-purple-950/20 text-purple-600 border-purple-100",
    amber: "bg-amber-50/60 dark:bg-amber-950/20 text-amber-600 border-amber-100"
  };

  return (
    <div className={`p-4 rounded-2xl flex flex-col items-center justify-center border-2 border-transparent transition-all hover:scale-105 active:scale-95 group ${styles[color]}`}>
      <div className="mb-2 p-1.5 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-50 transition-transform group-hover:rotate-12">{icon}</div>
      <p className="font-black text-xl leading-none tabular-nums mb-1">{count}</p>
      <p className="text-[10px] uppercase font-black opacity-50 tracking-wider text-center">{label}</p>
    </div>
  );
}