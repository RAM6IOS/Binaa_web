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
  /** حذف التقرير = manage_projects؛ member إضافة/تعديل فقط. */
  canDelete?: boolean;
}

export function DailyLogCard({ log, project, isAr, projectId, onEdit, onDelete, canDelete = true }: DailyLogCardProps) {
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
  const totalConsumptions = log.material_consumptions?.length || 0;

  return (
    <Card className="overflow-hidden border hover:shadow-sm transition-all shadow-sm rounded-lg group">

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
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 dark:from-warning/20 dark:to-card flex items-center justify-center flex-shrink-0">
              <Calendar className="w-7 h-7 text-warning" />
            </div>
            <div>
              <p className="font-bold text-xl tracking-tight text-foreground capitalize">{formattedDate}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs mt-1.5">
                <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
                  <Thermometer className="w-3.5 h-3.5 text-destructive" />
                  <span className="font-mono font-bold">{log.temperature}°C</span>
                  {log.temperature_min != null && (
                    <>
                      <span className="text-muted-foreground mx-0.5">/</span>
                      <span className="font-mono font-bold text-primary">{log.temperature_min}°C</span>
                    </>
                  )}
                </div>
                <Badge variant="outline" className="rounded-full bg-card font-bold uppercase tracking-wider text-xs">
                  {log.weather_condition === "sunny" ? (isAr ? "مشمس" : "Sunny") : log.weather_condition}
                </Badge>
                {log.site_status && (
                  <Badge variant="outline" className={`rounded-full font-bold uppercase tracking-wider text-xs ${
                    log.site_status === 'active' ? 'bg-success/10 text-success border-success/20' :
                    log.site_status === 'in_progress' ? 'bg-primary/10 text-primary border-primary/20' :
                    log.site_status === 'delayed' ? 'bg-warning/10 text-warning border-warning/20' :
                    log.site_status === 'inactive' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-muted text-foreground border-border'
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
                  <div className="flex items-center gap-1 text-muted-foreground bg-muted dark:bg-card px-2.5 py-1 rounded-full border">
                    <MapPin className="w-3 h-3" />
                    <span className="font-medium">{log.location_details}</span>
                  </div>
                )}
                {log.status === "validated" && (
                  <Badge className="bg-primary text-primary-foreground border-0 gap-1 h-6">
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
                className="hover:bg-warning/10 text-muted-foreground hover:text-warning rounded-full h-9 w-9"
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
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full h-9 w-9" aria-label={isAr ? "تعديل" : "Modifier"}>
                  <Pencil className="w-4.5 h-4.5" />
                </Button>
              }
            />

            {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full h-9 w-9"
              onClick={() => setDeleteModalOpen(true)}
              aria-label={isAr ? "حذف" : "Supprimer"}
            >
              <Trash2 className="w-4.5 h-4.5" />
            </Button>
          )}
          </div>
        </div>

        {/* ملخص الإنجاز */}
        <div className="relative mb-8 text-start group-hover:bg-muted p-2 -mx-2 rounded-lg transition-colors">
          <p className="text-foreground leading-relaxed font-medium">
            {log.work_summary}
          </p>
        </div>

        {/* شبكة الإحصائيات (Stat Boxes) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox icon={<Users className="w-4.5 h-4.5" />} color="success" count={totalWorkers} label={isAr ? "عامل" : "Effectif"} />
          <StatBox icon={<Truck className="w-4.5 h-4.5" />} color="primary" count={totalEquipment} label={isAr ? "معدة" : "Engins"} />
          <StatBox icon={<Ruler className="w-4.5 h-4.5" />} color="info" count={totalQuantities} label={isAr ? "بند منجز" : "Métrés"} />
          <StatBox icon={<Package className="w-4.5 h-4.5" />} color="warning" count={totalConsumptions} label={isAr ? "مادة مستهلكة" : "Consommation"} />
        </div>

        {/* Expand/Collapse Section */}
        <div className="flex flex-col items-center">
          <div className="w-full h-px bg-muted" />
          <Button
            variant="ghost"
            className="text-xs uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground -mt-5 bg-card dark:bg-card px-6 h-10 border rounded-full transition-all active:scale-95"
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
                  <div className="bg-destructive/10 dark:bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                    <h4 className="text-xs font-bold text-destructive uppercase flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" /> {isAr ? "عقبات ميدانية" : "Incidents"}
                    </h4>
                    <p className="text-sm text-destructive dark:text-destructive font-medium leading-relaxed">{log.problems_faced}</p>
                  </div>
                )}
                {log.notes && (
                  <div className="bg-muted dark:bg-muted p-4 rounded-lg border">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                      <StickyNote className="w-4 h-4" /> {isAr ? "ملاحظات وتوصيات" : "Notes"}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">"{log.notes}"</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. جدول الكميات المنجزة */}
            {totalQuantities > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-info uppercase tracking-widest flex items-center gap-2 px-1">
                  <Ruler className="w-4 h-4" /> {isAr ? "الكميات والقياسات (Situation)" : "Situations techniques"}
                </h4>
                <div className="space-y-2.5">
                  {log.quantities?.map((q, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 rounded-lg bg-info/5 dark:bg-info/10 border border-info/20 dark:border-info/20 transition-hover hover:border-info/40 shadow-sm">
                      <span className="text-sm font-bold text-foreground">{q.description}</span>
                      <div className="bg-card dark:bg-card px-3 py-1 rounded-lg border border-info/20">
                        <span className="text-sm font-bold text-info">{q.achieved_quantity}</span>
                        <span className="text-xs text-muted-foreground ms-1 uppercase">{q.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. العمال الحاضرون */}
            {totalWorkers > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-success uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> {isAr ? "بوانتاج العمال" : "Effectifs présents"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {log.workers_present?.map((w, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg border bg-card dark:bg-card hover:shadow-sm transition-shadow group/item">
                      <div className="flex items-center gap-3 text-start min-w-0">
                        <div className="w-8 h-8 rounded-full bg-success/10 dark:bg-success/20 text-success flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {w.worker_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate uppercase tracking-tight">{w.worker_name}</p>
                          <p className="text-xs text-muted-foreground font-bold uppercase truncate">{w.job_title}</p>
                        </div>
                      </div>
                      <div className="bg-muted px-2 py-1 rounded text-xs font-bold font-mono group-hover/item:bg-success group-hover/item:text-success-foreground transition-colors">{w.hours_worked}H</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. المعدات والعتاد */}
            {totalEquipment > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-4 h-4" /> {isAr ? "العتاد المستهلك" : "Utilisation engins"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
                  {log.equipment_used?.map((e, idx) => (
                    <div key={idx} className="flex justify-between p-3.5 rounded-lg border bg-muted dark:bg-muted font-bold text-xs group-hover:bg-card transition-colors">
                      <span className="text-muted-foreground truncate"># {e.equipment_name}</span>
                      <span className="text-primary">{e.usage_hours} H <span className="text-xs opacity-60">USAGE</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. استهلاك المواد من المخزون */}
            {totalConsumptions > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-warning uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-4 h-4" /> {isAr ? "استهلاك المواد" : "Consommation de matériaux"}
                </h4>
                <div className="space-y-2.5">
                  {log.material_consumptions?.map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 rounded-lg bg-warning/5 dark:bg-warning/10 border border-warning/20 dark:border-warning/20 transition-hover hover:border-warning/40 shadow-sm">
                      <span className="text-sm font-bold text-foreground">{c.material_name}</span>
                      <div className="bg-card dark:bg-card px-3 py-1 rounded-lg border border-warning/20">
                        <span className="text-sm font-bold text-warning">{c.consumed_quantity}</span>
                        {c.notes && <span className="text-xs text-muted-foreground ms-2 italic">({c.notes})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. المرفقات والصور */}
            <div className="pt-8 border-t">
              <div className="flex items-center justify-between mb-4 px-2 text-start">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> {isAr ? "الألبوم الصوري والمستندات" : "Media & Attachments"}
                </h4>
                {log.overall_progress > 0 && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-bold italic">{log.overall_progress}% الإنجاز</span>}
              </div>
              {isAttachmentsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                  <Loader2 className="w-6 h-6 animate-spin text-warning mb-2" />
                  <p className="text-xs font-bold uppercase tracking-tighter">Sync Media...</p>
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
    success: "bg-success/5 dark:bg-success/10 text-success border-success/20",
    primary: "bg-primary/5 dark:bg-primary/10 text-primary border-primary/20",
    info: "bg-info/5 dark:bg-info/10 text-info border-info/20",
    warning: "bg-warning/5 dark:bg-warning/10 text-warning border-warning/20"
  };

  return (
    <div className={`p-4 rounded-lg flex flex-col items-center justify-center border-2 border-transparent transition-all hover:scale-105 active:scale-95 group ${styles[color]}`}>
      <div className="mb-2 p-1.5 bg-card dark:bg-card rounded-lg shadow-sm border border-border transition-transform group-hover:rotate-12">{icon}</div>
      <p className="font-bold text-xl leading-none tabular-nums mb-1">{count}</p>
      <p className="text-xs uppercase font-bold opacity-50 tracking-wider text-center">{label}</p>
    </div>
  );
}