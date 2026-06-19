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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  Calendar,
  Users,
  Truck,
  ImagePlus,
  X,
  StickyNote,
  Clock,
  Check,
  AlertTriangle,
  Coffee,
  LogIn,
  LogOut,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { pointageService } from "@/lib/services/pointage-service";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import {
  Pointage,
  PointageWorker,
  DailyLogEquipment,
  DailyLogPhoto,
  CreatePointageDto,
} from "@/lib/types/daily-logs";
import { ProjectWorker, ProjectEquipment } from "@/lib/types/projects";
import { attachmentsService, Attachment } from "@/lib/services/attachments-service";
import { AttachmentsList } from "./AttachmentsList";

const SimpleTimePicker = ({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) => {
  const [hours, minutes] = (value || "08:00").split(":");

  return (
    <div className={`flex items-center h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 pointer-events-none" : ""}`}>
      <select
        disabled={disabled}
        value={hours}
        onChange={(e) => onChange(`${e.target.value}:${minutes}`)}
        className="flex-1 bg-transparent border-none text-center text-xs font-semibold focus:ring-0 cursor-pointer outline-none h-full hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        {Array.from({ length: 24 }).map((_, i) => {
          const val = i.toString().padStart(2, "0");
          return <option key={val} value={val}>{val}</option>;
        })}
      </select>
      <span className="text-slate-300 font-bold pointer-events-none select-none">:</span>
      <select
        disabled={disabled}
        value={minutes}
        onChange={(e) => onChange(`${hours}:${e.target.value}`)}
        className="flex-1 bg-transparent border-none text-center text-xs font-semibold focus:ring-0 cursor-pointer outline-none h-full hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const val = i.toString().padStart(2, "0");
          return <option key={val} value={val}>{val}</option>;
        })}
      </select>
    </div>
  );
};

interface Props {
  isAr: boolean;
  projectId: string;
  onSuccess?: () => void;
  log?: Pointage;
  trigger?: React.ReactNode;
}

const defaultForm = {
  log_date: new Date().toISOString().split("T")[0],
  notes: "",
};

type AttendanceStatus = "present" | "absent" | "half_day" | "overtime";

const statusConfig: Record<AttendanceStatus, { labelAr: string; labelFr: string; color: string; bgColor: string; defaultHours: number }> = {
  present: {
    labelAr: "حاضر",
    labelFr: "Présent",
    color: "text-emerald-700 border-emerald-300 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    defaultHours: 8,
  },
  half_day: {
    labelAr: "نصف يوم",
    labelFr: "Demi-journée",
    color: "text-amber-700 border-amber-300 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    defaultHours: 4,
  },
  overtime: {
    labelAr: "إضافي",
    labelFr: "Heures Sup",
    color: "text-blue-700 border-blue-300 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    defaultHours: 10,
  },
  absent: {
    labelAr: "غائب",
    labelFr: "Absent",
    color: "text-red-700 border-red-300 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    defaultHours: 0,
  },
};

export function AddPointageDialog({ isAr, projectId, onSuccess, log, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState(defaultForm);
  const [selectedWorkers, setSelectedWorkers] = useState<PointageWorker[]>([]);
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

  // تحميل عمال وعتاد المشروع
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
        console.error("Error fetching resources for Pointage Dialog:", err);
        toast.error(isAr ? "فشل في تحميل الموارد المخصصة للمشروع" : "Échec du chargement des ressources");
      } finally {
        setIsResourcesLoading(false);
      }
    };

    fetchResources();

    if (log) {
      setFormData({
        log_date: log.pointage_date,
        notes: log.notes || "",
      });
      setSelectedWorkers(log.pointage_workers || []);
      setSelectedEquipment(log.equipment_used || []);
      setPhotos(log.photos || []);

      // تحميل المرفقات
      attachmentsService.getAttachmentsByEntity('pointage', log.id)
        .then(setExistingAttachments)
        .catch(err => console.error("Error fetching attachments:", err));
    } else {
      setFormData({
        log_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setSelectedWorkers([]);
      setSelectedEquipment([]);
      setPhotos([]);
      setExistingAttachments([]);
    }
    setPendingFiles([]);
  }, [open, projectId, log]);

  // دالة لحساب ساعات العمل وتحديث الحالة
  const updateWorkerCalculatedHours = (
    workerId: string,
    checkIn: string | null | undefined,
    checkOut: string | null | undefined,
    breakMin: number,
    status: AttendanceStatus
  ) => {
    let finalHours = statusConfig[status].defaultHours;

    if (status !== "absent") {
      const calculated = pointageService.calculateHours(checkIn, checkOut, breakMin);
      if (calculated > 0) {
        finalHours = calculated;
      }
    } else {
      finalHours = 0;
    }

    setSelectedWorkers((prev) =>
      prev.map((w) =>
        w.worker_id === workerId
          ? {
              ...w,
              check_in_time: checkIn,
              check_out_time: checkOut,
              break_duration_minutes: breakMin,
              hours_worked: finalHours,
            }
          : w
      )
    );
  };

  // معالجة اختيار العامل
  const handleWorkerToggle = (pw: ProjectWorker) => {
    const workerId = pw.worker_id;
    const exists = selectedWorkers.find((w) => w.worker_id === workerId);
    if (exists) {
      setSelectedWorkers((prev) => prev.filter((w) => w.worker_id !== workerId));
    } else {
      const defaultStatus = "present" as AttendanceStatus;
      const defaultCheckIn = "08:00";
      const defaultCheckOut = "17:00";
      const defaultBreak = 60;
      const initialHours = pointageService.calculateHours(defaultCheckIn, defaultCheckOut, defaultBreak);

      setSelectedWorkers((prev) => [
        ...prev,
        {
          worker_id: workerId,
          worker_name: pw.worker?.full_name || "",
          job_title: pw.worker?.job_title || "",
          status: defaultStatus,
          check_in_time: defaultCheckIn,
          check_out_time: defaultCheckOut,
          break_duration_minutes: defaultBreak,
          hours_worked: initialHours || 8,
        },
      ]);
    }
  };

  const handleWorkerStatusChange = (workerId: string, status: AttendanceStatus) => {
    setSelectedWorkers((prev) => {
      return prev.map((w) => {
        if (w.worker_id === workerId) {
          const defaultHours = statusConfig[status].defaultHours;
          let checkIn = w.check_in_time;
          let checkOut = w.check_out_time;
          let breakMin = w.break_duration_minutes;

          if (status === "absent") {
            checkIn = null;
            checkOut = null;
            breakMin = 0;
          } else {
            if (!checkIn) checkIn = "08:00";
            if (!checkOut) checkOut = "17:00";
            if (breakMin === undefined) breakMin = 60;
          }

          const calculated = status === "absent" ? 0 : pointageService.calculateHours(checkIn, checkOut, breakMin);

          return {
            ...w,
            status,
            check_in_time: checkIn,
            check_out_time: checkOut,
            break_duration_minutes: breakMin,
            hours_worked: calculated || defaultHours,
          };
        }
        return w;
      });
    });
  };

  const handleWorkerTimeChange = (workerId: string, type: "in" | "out", value: string) => {
    const worker = selectedWorkers.find((w) => w.worker_id === workerId);
    if (!worker) return;

    const checkIn = type === "in" ? value : worker.check_in_time;
    const checkOut = type === "out" ? value : worker.check_out_time;
    const breakMin = worker.break_duration_minutes || 0;
    const status = worker.status;

    updateWorkerCalculatedHours(workerId, checkIn, checkOut, breakMin, status);
  };

  const handleWorkerBreakChange = (workerId: string, breakMinutes: number) => {
    const worker = selectedWorkers.find((w) => w.worker_id === workerId);
    if (!worker) return;

    const checkIn = worker.check_in_time;
    const checkOut = worker.check_out_time;
    const status = worker.status;

    updateWorkerCalculatedHours(workerId, checkIn, checkOut, breakMinutes, status);
  };

  const handleWorkerHoursOverride = (workerId: string, hours: number) => {
    setSelectedWorkers((prev) =>
      prev.map((w) => (w.worker_id === workerId ? { ...w, hours_worked: hours } : w))
    );
  };

  // معالجة اختيار العتاد
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

  // رفع الصور الميدانية
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const uploadedPhotos: DailyLogPhoto[] = [];
      for (const file of files) {
        try {
          const url = await pointageService.uploadPhoto(file, projectId);
          uploadedPhotos.push({ url, caption: "" });
        } catch {
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

  // حفظ الاستمارة
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedWorkers.length === 0) {
      toast.error(isAr ? "يجب تسجيل حضور عامل واحد على الأقل" : "Sélectionnez au moins un ouvrier");
      return;
    }

    setIsLoading(true);
    try {
      const payload: CreatePointageDto = {
        id: log?.id,
        project_id: projectId,
        pointage_date: formData.log_date,
        notes: formData.notes || undefined,
        equipment_used: selectedEquipment,
        photos,
        pointage_workers: selectedWorkers.map((w) => ({
          worker_id: w.worker_id,
          status: w.status,
          check_in_time: w.status === "absent" ? null : w.check_in_time || "08:00",
          check_out_time: w.status === "absent" ? null : w.check_out_time || "17:00",
          break_duration_minutes: w.status === "absent" ? 0 : w.break_duration_minutes || 0,
          hours_worked: w.hours_worked,
        })),
      };

      const savedPointage = await pointageService.save(payload);

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
            await attachmentsService.uploadAttachment(pf.file, 'pointage', savedPointage.id);
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
            ? "تم تحديث سجل الحضور بنجاح ✓"
            : "Pointage mis à jour avec succès ✓"
          : isAr
          ? "تم تسجيل الحضور والغياب بنجاح ✓"
          : "Pointage journalier enregistré avec succès ✓"
      );

      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Erreur de sauvegarde"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            {isAr ? "تسجيل الحضور اليومي" : "Enregistrer le Pointage"}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className={`sm:max-w-[820px] max-h-[95vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl ${isAr ? "rtl" : "ltr"}`}
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Banner */}
        <div className="bg-gradient-to-l from-emerald-600 to-teal-500 p-6 text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -ml-20 -mt-20 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mb-10 blur-xl" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl animate-pulse">
                <Users className="w-6 h-6" />
              </div>
              {isEdit
                ? isAr ? "تعديل حضور اليوم (Pointage)" : "Modifier le Pointage du Jour"
                : isAr ? "تسجيل حضور جديد (ساعة الدخول والخروج)" : "Nouveau Pointage (Heures d'Entrée/Sortie)"}
            </DialogTitle>
            <p className="text-emerald-100 text-sm mt-1">
              {isAr ? "تسجيل وتعديل أوقات الحضور والانصراف وحساب الساعات تلقائياً" : "Suivi précis des temps de présence des équipes"}
            </p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 bg-white dark:bg-slate-950">
          {/* Section 1: التاريخ */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              {isAr ? "التاريخ" : "Date du Pointage"}
            </h3>
            <div className="max-w-[240px] space-y-2">
              <Input
                id="pointage_date"
                type="date"
                required
                value={formData.log_date}
                onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                className="h-11 focus-visible:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Section 2: عمال المشروع وأوقات الحضور */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              {isAr ? "حضور عمال المشروع بالتفصيل" : "Présences & Heures des Ouvriers"}
              {selectedWorkers.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0 text-xs">
                  {selectedWorkers.length} {isAr ? "محددين" : "sélectionnés"}
                </Badge>
              )}
            </h3>

            {isResourcesLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="text-sm">{isAr ? "جاري تحميل العمال..." : "Chargement des équipes..."}</span>
              </div>
            ) : projectWorkers.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                {isAr ? "لا يوجد عمال مخصصون لهذا المشروع." : "Aucun ouvrier assigné à ce projet."}
              </p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4">
                  {projectWorkers.map((pw) => {
                    const isSelected = selectedWorkers.some((w) => w.worker_id === pw.worker_id);
                    const selectedEntry = selectedWorkers.find((w) => w.worker_id === pw.worker_id);
                    const currentStatus = (selectedEntry?.status as AttendanceStatus) || "present";
                    const config = statusConfig[currentStatus];

                    return (
                      <div
                        key={pw.id}
                        onClick={() => handleWorkerToggle(pw)}
                        className={`flex flex-col gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/5"
                            : "border-slate-150 dark:border-slate-850 hover:border-slate-350"
                        }`}
                      >
                        {/* Worker Header Info */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase transition-colors ${
                              isSelected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              {(pw.worker?.full_name || "?").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {pw.worker?.full_name}
                              </p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{pw.worker?.job_title}</p>
                            </div>
                          </div>

                          {/* Attendance Status Buttons */}
                          {isSelected && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-150 dark:border-slate-850"
                            >
                              {(Object.keys(statusConfig) as AttendanceStatus[]).map((st) => {
                                const active = currentStatus === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleWorkerStatusChange(pw.worker_id, st)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                      active
                                        ? "bg-white dark:bg-slate-800 border-current shadow-sm scale-[1.02]"
                                        : "bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                    } ${active ? statusConfig[st].color : ""}`}
                                  >
                                    {isAr ? statusConfig[st].labelAr : statusConfig[st].labelFr}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Extended Time Details */}
                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-850/60 items-end"
                          >
                            {/* Check In Time */}
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                                <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                                {isAr ? "ساعة الدخول" : "Heure d'Entrée"}
                              </Label>
                              <SimpleTimePicker
                                disabled={currentStatus === "absent"}
                                value={selectedEntry?.check_in_time || ""}
                                onChange={(val) => handleWorkerTimeChange(pw.worker_id, "in", val)}
                              />
                            </div>

                            {/* Check Out Time */}
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                                <LogOut className="w-3.5 h-3.5 text-red-500" />
                                {isAr ? "ساعة الخروج" : "Heure de Sortie"}
                              </Label>
                              <SimpleTimePicker
                                disabled={currentStatus === "absent"}
                                value={selectedEntry?.check_out_time || ""}
                                onChange={(val) => handleWorkerTimeChange(pw.worker_id, "out", val)}
                              />
                            </div>

                            {/* Break Duration */}
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                                {isAr ? "الاستراحة (دقائق)" : "Pause (min)"}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max="180"
                                step="5"
                                disabled={currentStatus === "absent"}
                                value={selectedEntry?.break_duration_minutes ?? 0}
                                onChange={(e) => handleWorkerBreakChange(pw.worker_id, Number(e.target.value))}
                                className="h-9 focus-visible:ring-emerald-500 text-xs font-semibold text-center"
                              />
                            </div>

                            {/* Working Hours Display */}
                            <div className="space-y-1.5 flex flex-col justify-end">
                              <Label className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                {isAr ? "إجمالي ساعات العمل" : "Total Heures"}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.1"
                                  disabled={currentStatus === "absent"}
                                  value={selectedEntry?.hours_worked ?? 8}
                                  onChange={(e) => handleWorkerHoursOverride(pw.worker_id, Number(e.target.value))}
                                  className="h-9 focus-visible:ring-emerald-500 text-xs font-bold text-center bg-slate-50 dark:bg-slate-900 border-dashed"
                                />
                                <span className="text-xs text-slate-400 font-medium">{isAr ? "ساعة" : "hrs"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: المعدات وساعات عملها */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-500" />
              {isAr ? "المعدات والعتاد المستخدم" : "Équipements du Projet"}
              {selectedEquipment.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-0 text-xs">
                  {selectedEquipment.length} {isAr ? "محددة" : "sélectionnées"}
                </Badge>
              )}
            </h3>

            {isResourcesLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="text-sm">{isAr ? "جاري التحميل..." : "Chargement..."}</span>
              </div>
            ) : projectEquipment.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                {isAr ? "لا توجد معدات مخصصة لهذا المشروع." : "Aucun équipement assigné à ce projet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1">
                {projectEquipment.map((pe) => {
                  const isSelected = selectedEquipment.some((e) => e.equipment_id === pe.equipment_id);
                  const selectedEntry = selectedEquipment.find((e) => e.equipment_id === pe.equipment_id);
                  return (
                    <div
                      key={pe.id}
                      onClick={() => handleEquipmentToggle(pe)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-sm ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-350"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        }`}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {pe.equipment?.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{pe.equipment?.type}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 flex-shrink-0"
                        >
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <input
                            type="number"
                            min="1"
                            max="24"
                            step="0.5"
                            value={selectedEntry?.usage_hours ?? 8}
                            onChange={(e) =>
                              handleEquipmentHoursChange(pe.equipment_id, Number(e.target.value))
                            }
                            className="w-14 h-7 text-xs font-bold border border-slate-200 dark:border-slate-850 rounded-lg text-center bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[11px] text-slate-400">h</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: الملاحظات */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-emerald-500" />
              {isAr ? "ملاحظات وتوجيهات اليوم" : "Notes & Remarques"}
            </h3>
            <Textarea
              id="notes"
              rows={3}
              placeholder={
                isAr
                  ? "اكتب أي تفاصيل بخصوص الحضور أو الأحداث الخاصة بالعمال..."
                  : "Saisissez les notes, retards, incidents ou remarques..."
              }
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="resize-none focus-visible:ring-emerald-500"
            />
          </div>

          {/* Section 5: الصور الميدانية */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-emerald-500" />
              {isAr ? "المرفقات والصور الميدانية" : "Pièces Jointes & Preuves"}
              {photos.length > 0 && (
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-0 text-xs">
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
                      alt={photo.caption || `Proof ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-650"
                    >
                      <X className="w-3.5 h-3.5" />
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
              className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              ) : (
                <ImagePlus className="w-8 h-8" />
              )}
              <span className="text-sm font-semibold">
                {isUploadingPhoto
                  ? isAr ? "جاري رفع الملفات..." : "Importation..."
                  : isAr ? "انقر لرفع مستندات أو صور الحضور اليومي" : "Cliquez pour charger les pièces jointes"}
              </span>
              <span className="text-xs text-slate-400">
                {isAr ? "PNG, JPG, WEBP — ملفات متعددة" : "PNG, JPG, WEBP — Fichiers multiples supportés"}
              </span>
            </button>
          </div>

          {/* Section 6: المرفقات والمستندات */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              {isAr ? "المرفقات ومستندات الإثبات" : "Pièces jointes & Preuves"}
              {(existingAttachments.length + pendingFiles.length) > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0 text-xs">
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
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-500"
                  : "border-slate-200 dark:border-slate-800 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/5"
              }`}
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm font-semibold">
                {isAr
                  ? "اسحب الملفات هنا أو انقر لاختيارها"
                  : "Glissez-deposez des fichiers ici ou cliquez pour sélectionner"}
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
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-100"
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
          <DialogFooter className="flex flex-row gap-3 sm:justify-end pt-4 border-t border-slate-100 dark:border-slate-850/60">
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
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] font-semibold shadow-md"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {isEdit
                ? isAr ? "حفظ التعديلات" : "Enregistrer"
                : isAr ? "تسجيل الحضور اليومي" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
