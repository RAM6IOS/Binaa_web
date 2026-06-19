"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  Calendar,
  Thermometer,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  CloudSnow,
  Users,
  Truck,
  ImagePlus,
  X,
  FileText,
  AlertTriangle,
  StickyNote,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { dailyLogService } from "@/lib/services/daily-log-service";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import {
  DailyLog,
  WeatherCondition,
  DailyLogWorker,
  DailyLogEquipment,
  DailyLogPhoto,
} from "@/lib/types/daily-logs";
import { ProjectWorker, ProjectEquipment } from "@/lib/types/projects";
import { attachmentsService, Attachment } from "@/lib/services/attachments-service";
import { AttachmentsList } from "./AttachmentsList";

interface Props {
  isAr: boolean;
  projectId: string;
  onSuccess?: () => void;
  log?: DailyLog;
  trigger?: React.ReactNode;
}

const weatherOptions: { value: WeatherCondition; labelAr: string; labelFr: string; icon: React.ReactNode; color: string }[] = [
  { value: "sunny", labelAr: "مشمس", labelFr: "Ensoleillé", icon: <Sun className="w-4 h-4" />, color: "text-yellow-500" },
  { value: "cloudy", labelAr: "غائم", labelFr: "Nuageux", icon: <Cloud className="w-4 h-4" />, color: "text-slate-400" },
  { value: "rainy", labelAr: "ممطر", labelFr: "Pluvieux", icon: <CloudRain className="w-4 h-4" />, color: "text-blue-500" },
  { value: "stormy", labelAr: "عاصف", labelFr: "Orageux", icon: <CloudSnow className="w-4 h-4" />, color: "text-purple-500" },
  { value: "windy", labelAr: "رياح", labelFr: "Venteux", icon: <Wind className="w-4 h-4" />, color: "text-cyan-500" },
  { value: "foggy", labelAr: "ضبابي", labelFr: "Brumeux", icon: <Cloud className="w-4 h-4" />, color: "text-gray-400" },
];

const defaultForm = {
  log_date: new Date().toISOString().split("T")[0],
  weather_condition: "sunny" as WeatherCondition,
  temperature: 25,
  work_summary: "",
  problems_faced: "",
  notes: "",
};

export function AddDailyLogDialog({ isAr, projectId, onSuccess, log, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState(defaultForm);
  const [selectedWorkers, setSelectedWorkers] = useState<DailyLogWorker[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<DailyLogEquipment[]>([]);
  const [photos, setPhotos] = useState<DailyLogPhoto[]>([]);

  const [projectWorkers, setProjectWorkers] = useState<ProjectWorker[]>([]);
  const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!log;

  // المرفقات الإضافية
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; id: string; progress: number; status: 'queued' | 'uploading' | 'success' | 'error' }[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      addPendingFiles(files);
    }
  };

  const addPendingFiles = (files: File[]) => {
    const newFiles = files.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'queued' as const
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await attachmentsService.deleteAttachment(attachmentId);
      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
      toast.success(isAr ? "تم حذف المرفق بنجاح" : "Pièce jointe supprimée");
    } catch (err) {
      toast.error(isAr ? "فشل حذف المرفق" : "Échec de suppression");
    }
  };

  // تحميل الموارد عند فتح الـ Dialog
  useEffect(() => {
    if (!open) return;

    const fetchResources = async () => {
      setIsResourcesLoading(true);
      try {
        const [workers, equipment] = await Promise.all([
          projectWorkersService.getByProjectId(projectId),
          projectEquipmentService.fetchProjectEquipment(projectId),
        ]);
        setProjectWorkers(workers);
        setProjectEquipment(equipment);
      } catch (err) {
        console.error("Error fetching resources:", err);
      } finally {
        setIsResourcesLoading(false);
      }
    };

    fetchResources();

    // تهيئة النموذج
    if (log) {
      setFormData({
        log_date: log.log_date,
        weather_condition: log.weather_condition,
        temperature: log.temperature,
        work_summary: log.work_summary,
        problems_faced: log.problems_faced || "",
        notes: log.notes || "",
      });
      setSelectedWorkers(log.workers_present || []);
      setSelectedEquipment(log.equipment_used || []);
      setPhotos(log.photos || []);

      // تحميل المرفقات
      attachmentsService.getAttachmentsByEntity('daily_log', log.id)
        .then(setExistingAttachments)
        .catch(err => console.error("Error fetching attachments:", err));
    } else {
      setFormData(defaultForm);
      setSelectedWorkers([]);
      setSelectedEquipment([]);
      setPhotos([]);
      setExistingAttachments([]);
    }
    setPendingFiles([]);
  }, [open, projectId, log]);

  const handleWorkerToggle = (pw: ProjectWorker) => {
    const workerId = pw.worker_id;
    const exists = selectedWorkers.find((w) => w.worker_id === workerId);
    if (exists) {
      setSelectedWorkers((prev) => prev.filter((w) => w.worker_id !== workerId));
    } else {
      setSelectedWorkers((prev) => [
        ...prev,
        {
          worker_id: workerId,
          worker_name: pw.worker?.full_name || "",
          job_title: pw.worker?.job_title || "",
          hours_worked: pw.daily_hours || 8,
        },
      ]);
    }
  };

  const handleWorkerHoursChange = (workerId: string, hours: number) => {
    setSelectedWorkers((prev) =>
      prev.map((w) => (w.worker_id === workerId ? { ...w, hours_worked: hours } : w))
    );
  };

  const handleEquipmentToggle = (pe: ProjectEquipment) => {
    const equipmentId = pe.equipment_id;
    const exists = selectedEquipment.find((e) => e.equipment_id === equipmentId);
    if (exists) {
      setSelectedEquipment((prev) => prev.filter((e) => e.equipment_id !== equipmentId));
    } else {
      setSelectedEquipment((prev) => [
        ...prev,
        {
          equipment_id: equipmentId,
          equipment_name: pe.equipment?.name || "",
          usage_hours: pe.usage_hours_per_day || 8,
        },
      ]);
    }
  };

  const handleEquipmentHoursChange = (equipmentId: string, hours: number) => {
    setSelectedEquipment((prev) =>
      prev.map((e) =>
        e.equipment_id === equipmentId ? { ...e, usage_hours: hours } : e
      )
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const uploadedPhotos: DailyLogPhoto[] = [];
      for (const file of files) {
        try {
          const url = await dailyLogService.uploadPhoto(file, projectId);
          uploadedPhotos.push({ url, caption: "" });
        } catch {
          // Fallback: use object URL for preview if bucket not configured
          const url = URL.createObjectURL(file);
          uploadedPhotos.push({ url, caption: file.name });
        }
      }
      setPhotos((prev) => [...prev, ...uploadedPhotos]);
      toast.success(isAr ? `تم رفع ${uploadedPhotos.length} صورة` : `${uploadedPhotos.length} photo(s) ajoutée(s)`);
    } catch (err) {
      toast.error(isAr ? "فشل رفع الصور" : "Échec du téléchargement");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.work_summary.trim()) {
      toast.error(isAr ? "ملخص الأعمال مطلوب" : "Le résumé des travaux est requis");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        project_id: projectId,
        log_date: formData.log_date,
        weather_condition: formData.weather_condition,
        temperature: formData.temperature,
        work_summary: formData.work_summary,
        problems_faced: formData.problems_faced || undefined,
        notes: formData.notes || undefined,
        workers_present: selectedWorkers,
        equipment_used: selectedEquipment,
        photos,
      };

      let savedLog;
      if (isEdit && log) {
        savedLog = await dailyLogService.update(log.id, payload);
      } else {
        savedLog = await dailyLogService.create(payload);
      }

      // رفع المرفقات المعلقة
      if (pendingFiles.length > 0) {
        for (const pf of pendingFiles) {
          setPendingFiles(prev => prev.map(f => f.id === pf.id ? { ...f, status: 'uploading' } : f));
          
          let progress = 0;
          const interval = setInterval(() => {
            progress = Math.min(progress + 15, 90);
            setPendingFiles(prev => prev.map(f => f.id === pf.id ? { ...f, progress } : f));
          }, 100);

          try {
            await attachmentsService.uploadAttachment(pf.file, 'daily_log', savedLog.id);
            clearInterval(interval);
            setPendingFiles(prev => prev.map(f => f.id === pf.id ? { ...f, status: 'success', progress: 100 } : f));
          } catch (uploadErr) {
            clearInterval(interval);
            setPendingFiles(prev => prev.map(f => f.id === pf.id ? { ...f, status: 'error', progress: 0 } : f));
            throw uploadErr;
          }
        }
      }

      toast.success(
        isEdit
          ? isAr
            ? "تم تحديث التقرير بنجاح ✓"
            : "Rapport mis à jour avec succès ✓"
          : isAr
          ? "تم حفظ التقرير اليومي بنجاح ✓"
          : "Rapport journalier enregistré ✓"
      );

      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Erreur lors de l'enregistrement");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWeather = weatherOptions.find((w) => w.value === formData.weather_condition);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700 shadow-md transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            {isAr ? "إضافة تقرير يومي" : "Nouveau rapport"}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className={`sm:max-w-[780px] max-h-[95vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl ${isAr ? "rtl" : "ltr"}`}
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-orange-600 to-amber-500 p-6 text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -ml-20 -mt-20 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mb-10 blur-xl" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              {isEdit
                ? isAr ? "تعديل التقرير اليومي" : "Modifier le rapport journalier"
                : isAr ? "تقرير يومي جديد" : "Nouveau rapport journalier"}
            </DialogTitle>
            <p className="text-orange-100 text-sm mt-1">
              {isAr ? "توثيق الأعمال اليومية للمشروع" : "Documentation quotidienne des travaux du projet"}
            </p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-7 bg-white dark:bg-slate-950">
          {/* Section 1: المعلومات الأساسية */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              {isAr ? "المعلومات الأساسية" : "Informations de base"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* التاريخ */}
              <div className="space-y-2">
                <Label htmlFor="log_date" className="text-sm font-semibold">
                  {isAr ? "التاريخ" : "Date"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="log_date"
                  type="date"
                  required
                  value={formData.log_date}
                  onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                  className="h-11 focus-visible:ring-orange-500"
                />
              </div>

              {/* حالة الطقس */}
              <div className="space-y-2">
                <Label htmlFor="weather_condition" className="text-sm font-semibold">
                  {isAr ? "حالة الطقس" : "Météo"}
                </Label>
                <Select
                  value={formData.weather_condition}
                  onValueChange={(v: WeatherCondition) =>
                    setFormData({ ...formData, weather_condition: v })
                  }
                >
                  <SelectTrigger id="weather_condition" className="h-11">
                    <SelectValue>
                      {selectedWeather && (
                        <span className={`flex items-center gap-2 ${selectedWeather.color}`}>
                          {selectedWeather.icon}
                          {isAr ? selectedWeather.labelAr : selectedWeather.labelFr}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {weatherOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={`flex items-center gap-2 ${opt.color}`}>
                          {opt.icon}
                          {isAr ? opt.labelAr : opt.labelFr}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* درجة الحرارة */}
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-sm font-semibold flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-400" />
                  {isAr ? "درجة الحرارة (°C)" : "Température (°C)"}
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  min="-20"
                  max="55"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: Number(e.target.value) })
                  }
                  className="h-11 focus-visible:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: الأعمال والمشاكل */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              {isAr ? "تفاصيل العمل" : "Détails des travaux"}
            </h3>

            <div className="space-y-2">
              <Label htmlFor="work_summary" className="text-sm font-semibold">
                {isAr ? "ملخص الأعمال المنجزة" : "Résumé des travaux réalisés"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="work_summary"
                rows={4}
                required
                placeholder={
                  isAr
                    ? "صف الأعمال التي تمت إنجازها خلال هذا اليوم..."
                    : "Décrivez les travaux réalisés ce jour..."
                }
                value={formData.work_summary}
                onChange={(e) =>
                  setFormData({ ...formData, work_summary: e.target.value })
                }
                className="resize-none focus-visible:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="problems_faced" className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {isAr ? "المشاكل التي واجهتها" : "Problèmes rencontrés"}
                </Label>
                <Textarea
                  id="problems_faced"
                  rows={3}
                  placeholder={
                    isAr
                      ? "ذكر أي عقبات أو مشاكل واجهتها..."
                      : "Mentionnez les obstacles ou problèmes rencontrés..."
                  }
                  value={formData.problems_faced}
                  onChange={(e) =>
                    setFormData({ ...formData, problems_faced: e.target.value })
                  }
                  className="resize-none focus-visible:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-slate-400" />
                  {isAr ? "ملاحظات إضافية" : "Notes supplémentaires"}
                </Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder={
                    isAr
                      ? "أي ملاحظات أو معلومات إضافية..."
                      : "Toute information ou note supplémentaire..."
                  }
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="resize-none focus-visible:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: العمال الحاضرون */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              {isAr ? "العمال الحاضرون" : "Ouvriers présents"}
              {selectedWorkers.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                  {selectedWorkers.length}
                </Badge>
              )}
            </h3>

            {isResourcesLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{isAr ? "جاري تحميل العمال..." : "Chargement..."}</span>
              </div>
            ) : projectWorkers.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                {isAr ? "لا يوجد عمال مخصصون لهذا المشروع." : "Aucun ouvrier assigné à ce projet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-1">
                {projectWorkers.map((pw) => {
                  const isSelected = selectedWorkers.some((w) => w.worker_id === pw.worker_id);
                  const selectedEntry = selectedWorkers.find((w) => w.worker_id === pw.worker_id);
                  return (
                    <div
                      key={pw.id}
                      onClick={() => handleWorkerToggle(pw)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0 text-sm font-bold uppercase">
                        {(pw.worker?.full_name || "?").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {pw.worker?.full_name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{pw.worker?.job_title}</p>
                      </div>
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <input
                            type="number"
                            min="1"
                            max="24"
                            step="0.5"
                            value={selectedEntry?.hours_worked ?? 8}
                            onChange={(e) =>
                              handleWorkerHoursChange(pw.worker_id, Number(e.target.value))
                            }
                            className="w-12 h-6 text-xs border border-emerald-300 rounded text-center bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-slate-400">h</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: المعدات المستخدمة */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500" />
              {isAr ? "المعدات المستخدمة" : "Équipements utilisés"}
              {selectedEquipment.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                  {selectedEquipment.length}
                </Badge>
              )}
            </h3>

            {isResourcesLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{isAr ? "جاري التحميل..." : "Chargement..."}</span>
              </div>
            ) : projectEquipment.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                {isAr ? "لا توجد معدات مخصصة لهذا المشروع." : "Aucun équipement assigné à ce projet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                {projectEquipment.map((pe) => {
                  const isSelected = selectedEquipment.some((e) => e.equipment_id === pe.equipment_id);
                  const selectedEntry = selectedEquipment.find((e) => e.equipment_id === pe.equipment_id);
                  return (
                    <div
                      key={pe.id}
                      onClick={() => handleEquipmentToggle(pe)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {pe.equipment?.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{pe.equipment?.type}</p>
                      </div>
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-blue-600" />
                          <input
                            type="number"
                            min="1"
                            max="24"
                            step="0.5"
                            value={selectedEntry?.usage_hours ?? 8}
                            onChange={(e) =>
                              handleEquipmentHoursChange(pe.equipment_id, Number(e.target.value))
                            }
                            className="w-12 h-6 text-xs border border-blue-300 rounded text-center bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-slate-400">h</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 5: الصور الميدانية */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-purple-500" />
              {isAr ? "الصور الميدانية" : "Photos de terrain"}
              {photos.length > 0 && (
                <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                  {photos.length}
                </Badge>
              )}
            </h3>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                    <img
                      src={photo.url}
                      alt={photo.caption || `Photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              ) : (
                <ImagePlus className="w-8 h-8" />
              )}
              <span className="text-sm font-medium">
                {isUploadingPhoto
                  ? isAr ? "جاري الرفع..." : "Téléchargement..."
                  : isAr ? "انقر لرفع صور ميدانية" : "Cliquez pour ajouter des photos"}
              </span>
              <span className="text-xs text-slate-400">
                {isAr ? "PNG, JPG, WEBP — متعددة مسموحة" : "PNG, JPG, WEBP — Plusieurs fichiers acceptés"}
              </span>
            </button>
          </div>

          {/* Section 6: المرفقات والمستندات */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              {isAr ? "المرفقات والمستندات" : "Pièces jointes & Documents"}
              {(existingAttachments.length + pendingFiles.length) > 0 && (
                <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                  {existingAttachments.length + pendingFiles.length}
                </Badge>
              )}
            </h3>

            {/* عرض المرفقات الحالية عند التعديل */}
            {isEdit && existingAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500">
                  {isAr ? "المرفقات الحالية:" : "Pièces jointes existantes :"}
                </p>
                <AttachmentsList
                  attachments={existingAttachments}
                  isAr={isAr}
                  onDelete={handleDeleteAttachment}
                  readOnly={false}
                />
              </div>
            )}

            {/* منطقة السحب والإفلات */}
            <input
              ref={fileInputRef2}
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                addPendingFiles(files);
                if (fileInputRef2.current) fileInputRef2.current.value = "";
              }}
            />

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef2.current?.click()}
              className={`w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                isDragActive
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/10 text-orange-500"
                  : "border-slate-200 dark:border-slate-800 text-slate-400 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/5"
              }`}
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm font-semibold">
                {isAr
                  ? "اسحب الملفات هنا أو انقر لاختيارها"
                  : "Glissez-déposez des fichiers ici ou cliquez pour sélectionner"}
              </span>
              <span className="text-xs text-slate-400">
                {isAr
                  ? "الصور، PDF، Word، Excel، Text (متعدد)"
                  : "Images, PDF, Word, Excel, Text (Plusieurs)"}
              </span>
            </div>

            {/* قائمة الملفات المحددة للرفع */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500">
                  {isAr ? "الملفات المحددة للرفع:" : "Fichiers sélectionnés :"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingFiles.map((pf) => (
                    <div
                      key={pf.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                          {pf.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(pf.file.size)}
                        </p>
                        {pf.status === 'uploading' && (
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full transition-all duration-100"
                              style={{ width: `${pf.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {pf.status === 'success' && (
                          <span className="text-emerald-500 text-xs font-bold">✓</span>
                        )}
                        {pf.status === 'error' && (
                          <span className="text-red-500 text-xs font-bold">✗</span>
                        )}
                        {pf.status === 'queued' && (
                          <button
                            type="button"
                            onClick={() => setPendingFiles(prev => prev.filter(f => f.id !== pf.id))}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="flex flex-row gap-3 sm:justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 sm:flex-none"
            >
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 min-w-[140px] shadow-md"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {isEdit
                ? isAr ? "حفظ التعديلات" : "Enregistrer les modifications"
                : isAr ? "حفظ التقرير" : "Enregistrer le rapport"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
