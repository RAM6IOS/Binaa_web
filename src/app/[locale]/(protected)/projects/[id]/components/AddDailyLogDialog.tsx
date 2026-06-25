"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Loader2, Calendar, Thermometer, Sun, Cloud, CloudRain, Wind, CloudSnow,
  Users, Truck, ImagePlus, X, FileText, AlertTriangle, StickyNote, Ruler, Package, Trash2, CheckCircle, MapPin, Activity, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { dailyLogService } from "@/lib/services/daily-log-service";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import {
  DailyLog, WeatherCondition, DailyLogWorker, DailyLogEquipment,
  DailyLogPhoto, DailyLogMaterial, DailyLogQuantity
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

const units = ["m³", "m²", "ml", "kg", "t", "unité", "lot", "m", "m³/j"];

export function AddDailyLogDialog({ isAr, projectId, onSuccess, log, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split("T")[0],
    weather_condition: "sunny" as WeatherCondition,
    temperature: 25,
    work_summary: "",
    problems_faced: "",
    notes: "",
    overall_progress: 0,
    status: "draft" as "draft" | "pending" | "validated",
    location_details: "",
    estimated_value: 0,
  });

  const [selectedWorkers, setSelectedWorkers] = useState<DailyLogWorker[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<DailyLogEquipment[]>([]);
  const [quantities, setQuantities] = useState<DailyLogQuantity[]>([]);
  const [materials, setMaterials] = useState<DailyLogMaterial[]>([]);
  const [photos, setPhotos] = useState<DailyLogPhoto[]>([]);

  const [projectWorkers, setProjectWorkers] = useState<ProjectWorker[]>([]);
  const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);

  const isEdit = !!log;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ────── Quantities Functions ──────
  const addQuantity = () => setQuantities([...quantities, { description: "", unit: "m³", achieved_quantity: 0 }]);
  const updateQuantity = (index: number, field: keyof DailyLogQuantity, value: any) => {
    const updated = [...quantities];
    updated[index] = { ...updated[index], [field]: value };
    setQuantities(updated);
  };
  const removeQuantity = (index: number) => setQuantities(quantities.filter((_, i) => i !== index));

  // ────── Materials Functions ──────
  const addMaterial = () => setMaterials([...materials, { material_name: "", quantity: 0, unit: "kg" }]);
  const updateMaterial = (index: number, field: keyof DailyLogMaterial, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };
  const removeMaterial = (index: number) => setMaterials(materials.filter((_, i) => i !== index));

  // Load resources and form data
  useEffect(() => {
    if (!open) return;

    const fetchResources = async () => {
      setIsResourcesLoading(true);
      try {
        const [workersRes, equipmentRes] = await Promise.all([
          projectWorkersService.getByProjectId(projectId),
          projectEquipmentService.fetchProjectEquipment(projectId),
        ]);
        setProjectWorkers(workersRes);
        setProjectEquipment(equipmentRes);
      } catch (err) {
        console.error(err);
      } finally {
        setIsResourcesLoading(false);
      }
    };

    fetchResources();

    if (log) {
      setFormData({
        log_date: log.log_date,
        weather_condition: log.weather_condition,
        temperature: log.temperature,
        work_summary: log.work_summary,
        problems_faced: log.problems_faced || "",
        notes: log.notes || "",
        overall_progress: log.overall_progress || 0,
        status: "draft" as "draft" | "pending" | "validated", // حالة الاعتماد
        location_details: "", // النقطة الكيلومترية أو الطابق
        estimated_value: 0, // القيمة المالية التقديرية لهذا اليوم

      });
      setSelectedWorkers(log.workers_present || []);
      setSelectedEquipment(log.equipment_used || []);
      setQuantities(log.quantities || []);
      setMaterials(log.materials || []);
      setPhotos(log.photos || []);
    } else {
      setFormData({
        log_date: new Date().toISOString().split("T")[0],
        weather_condition: "sunny",
        temperature: 25,
        work_summary: "",
        problems_faced: "",
        notes: "",
        overall_progress: 0,
        status: "draft" as "draft" | "pending" | "validated", // حالة الاعتماد
        location_details: "", // النقطة الكيلومترية أو الطابق
        estimated_value: 0, // القيمة المالية التقديرية لهذا اليوم
      });
      setSelectedWorkers([]);
      setSelectedEquipment([]);
      setQuantities([]);
      setMaterials([]);
      setPhotos([]);
    }
  }, [open, projectId, log]);

  const handleWorkerToggle = (pw: ProjectWorker) => {
    const workerId = pw.worker_id;
    const exists = selectedWorkers.some(w => w.worker_id === workerId);
    if (exists) {
      setSelectedWorkers(prev => prev.filter(w => w.worker_id !== workerId));
    } else {
      setSelectedWorkers(prev => [...prev, {
        worker_id: workerId,
        worker_name: pw.worker?.full_name || "",
        job_title: pw.worker?.job_title || "",
        hours_worked: 8,
      }]);
    }
  };

  const handleEquipmentToggle = (pe: ProjectEquipment) => {
    const eqId = pe.equipment_id;
    const exists = selectedEquipment.some(e => e.equipment_id === eqId);
    if (exists) {
      setSelectedEquipment(prev => prev.filter(e => e.equipment_id !== eqId));
    } else {
      setSelectedEquipment(prev => [...prev, {
        equipment_id: eqId,
        equipment_name: pe.equipment?.name || "",
        usage_hours: 8,
      }]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const uploaded: DailyLogPhoto[] = [];
      for (const file of files) {
        try {
          const url = await dailyLogService.uploadPhoto(file, projectId);
          uploaded.push({ url, caption: file.name });
        } catch {
          const url = URL.createObjectURL(file);
          uploaded.push({ url, caption: file.name });
        }
      }
      setPhotos(prev => [...prev, ...uploaded]);
      toast.success(`تم رفع ${uploaded.length} صورة`);
    } catch (err) {
      toast.error("فشل رفع الصور");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.work_summary.trim()) {
      toast.error(isAr ? "ملخص الأعمال مطلوب" : "Résumé des travaux requis");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        project_id: projectId,
        workers_present: selectedWorkers,
        equipment_used: selectedEquipment,
        quantities,
        materials,
        photos,
      };

      if (isEdit && log?.id) {
        await dailyLogService.update(log.id, payload);
        toast.success(isAr ? "تم تحديث التقرير بنجاح ✓" : "Rapport mis à jour ✓");
      } else {
        await dailyLogService.create(payload);
        toast.success(isAr ? "تم إنشاء التقرير بنجاح ✓" : "Rapport créé ✓");
      }

      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      // ────── التحقق من خطأ تكرار التاريخ (23505) ──────
      const isDuplicateError =
        err?.code === "23505" ||
        err?.message?.includes("already exists") ||
        err?.message?.includes("unique_project_log_date");

      if (isDuplicateError) {
        toast.error(
          isAr
            ? `تنبيه: تم إنشاء تقرير لهذا اليوم (${formData.log_date}) مسبقاً.`
            : `Attention : Un rapport existe déjà pour le (${formData.log_date}).`,
          {
            description: isAr
              ? "لا يمكنك إضافة تقريرين في نفس اليوم، يمكنك البحث عن التقرير الموجود وتعديله."
              : "Vous ne pouvez pas créer deux rapports pour le même jour. Veuillez modifier le rapport existant.",
            duration: 6000, // ستبقى الرسالة واضحة للمستخدم لفترة أطول
          }
        );
      } else {
        // أي خطأ آخر غير متوقع
        toast.error(isAr ? "حدث خطأ غير متوقع أثناء الحفظ" : "Erreur lors de l'enregistrement");
        console.error("Submit Error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[980px] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="p-6 border-b bg-gradient-to-r from-orange-600 to-amber-500 text-white">
          <DialogTitle className="text-2xl">
            {isEdit ? (isAr ? "تعديل التقرير اليومي" : "Modifier le rapport") : (isAr ? "تقرير يومي جديد" : "Nouveau rapport journalier")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* Basic Info */}
          {/* Basic Info - وضعية الأشغال المتقدمة */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200">
            {/* التاريخ */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> {isAr ? "تاريخ اليومية" : "Date"}</Label>
              <Input type="date" value={formData.log_date} onChange={(e) => setFormData({ ...formData, log_date: e.target.value })} />
            </div>

            {/* مكان العمل الدقيق - مهم جداً للأشغال العمومية */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-blue-600">
                <MapPin className="w-4 h-4" /> {isAr ? "موقع العمل (PK/Zone)" : "Localisation"}
              </Label>
              <Input
                placeholder={isAr ? "مثال: PK 12+500 أو الطابق 03" : "ex: PK 12+500 or Etage 3"}
                value={formData.location_details}
                onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
              />
            </div>

            {/* حالة الاعتماد (Workflow) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-emerald-600"><CheckCircle className="w-4 h-4" /> {isAr ? "حالة الاعتماد" : "Statut Workflow"}</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{isAr ? "مسودة (داخلية)" : "Brouillon"}</SelectItem>
                  <SelectItem value="pending">{isAr ? "جاهز للمراجعة" : "En attente"}</SelectItem>
                  <SelectItem value="validated">{isAr ? "مصادق عليه ✓" : "Validé ✓"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* نسبة التقدم الفني */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" /> {isAr ? "تقدم الإنجاز (%)" : "Progrès (%)"}</Label>
              <Input type="number" min={0} max={100} value={formData.overall_progress} onChange={(e) => setFormData({ ...formData, overall_progress: Number(e.target.value) })} />
            </div>
          </div>
          {/* Work Summary */}
          <div className="space-y-2">
            <Label>{isAr ? "ملخص الأعمال *" : "Résumé des travaux *"}</Label>
            <Textarea rows={4} value={formData.work_summary} onChange={(e) => setFormData({ ...formData, work_summary: e.target.value })} required />
          </div>

          {/* Problems & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isAr ? "المشاكل التي واجهتها" : "Problèmes rencontrés"}</Label>
              <Textarea rows={3} value={formData.problems_faced} onChange={(e) => setFormData({ ...formData, problems_faced: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "ملاحظات إضافية" : "Notes supplémentaires"}</Label>
              <Textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>

          {/* Quantities */}
          {/* Quantities - قسم الكميات المطور ليكون Situation */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Ruler className="w-5 h-5 text-orange-600" />
                {isAr ? "بيان الأشغال المنجزة (Métré)" : "Situation des Métrés"}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addQuantity} className="border-orange-500 text-orange-600 hover:bg-orange-50">
                <Plus className="w-4 h-4 ml-1" /> {isAr ? "إضافة بند" : "Ajouter article"}
              </Button>
            </div>

            <div className="space-y-3">
              {quantities.map((q, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-3 items-start border p-4 rounded-xl bg-white shadow-sm relative group">
                  <button type="button" onClick={() => removeQuantity(i)} className="absolute top-2 left-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* وصف البند (تمهيداً للـ Article ID) */}
                  <div className="flex-1 w-full space-y-1">
                    <Label className="text-[10px] text-slate-400">{isAr ? "بيان البند / الأشغال" : "Désignation"}</Label>
                    <Input
                      placeholder={isAr ? "مثال: حفر القواعد أو صب الخرسانة" : "Désignation des travaux"}
                      value={q.description}
                      onChange={(e) => updateQuantity(i, 'description', e.target.value)}
                    />
                  </div>

                  {/* الكمية */}
                  <div className="w-full md:w-24 space-y-1">
                    <Label className="text-[10px] text-slate-400">{isAr ? "الكمية" : "Qté"}</Label>
                    <Input type="number" value={q.achieved_quantity} onChange={(e) => updateQuantity(i, 'achieved_quantity', Number(e.target.value))} />
                  </div>

                  {/* الوحدة */}
                  <div className="w-full md:w-32 space-y-1">
                    <Label className="text-[10px] text-slate-400">{isAr ? "الوحدة" : "Unité"}</Label>
                    <Select value={q.unit} onValueChange={(v) => updateQuantity(i, 'unit', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            {/* خانة القيمة المالية التقديرية */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center justify-between border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white"><CreditCard className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-bold">{isAr ? "القيمة التقديرية للأشغال المنجزة (دج)" : "Valeur estimée des travaux (DZD)"}</p>
                  <p className="text-[10px] text-blue-500">{isAr ? "لحساب الـ Situation تلقائياً" : "Pour calcul automatique"}</p>
                </div>
              </div>
              <Input
                type="number"
                className="w-40 bg-white border-blue-200 text-right font-bold text-blue-600"
                placeholder="0.00"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
              />
            </div>
          </div>
          {/* Materials */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Package className="w-5 h-5" /> {isAr ? "استهلاك المواد" : "Matériaux consommés"}</h3>
              <Button type="button" variant="outline" onClick={addMaterial}><Plus className="w-4 h-4" /></Button>
            </div>
            {materials.map((m, i) => (
              <div key={i} className="flex gap-3 items-end border p-4 rounded-xl">
                <Input className="flex-1" placeholder="اسم المادة" value={m.material_name} onChange={(e) => updateMaterial(i, 'material_name', e.target.value)} />
                <Input className="w-24" type="number" value={m.quantity} onChange={(e) => updateMaterial(i, 'quantity', Number(e.target.value))} />
                <Select value={m.unit} onValueChange={(v) => updateMaterial(i, 'unit', v)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="ghost" onClick={() => removeMaterial(i)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
            ))}
          </div>

          {/* Workers Section */}
          <div className="space-y-4">

            {/* Paste your previous workers section code here */}
            {/* العمال الحاضرون */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                {isAr ? "العمال الحاضرون" : "Ouvriers présents"}
                {selectedWorkers.length > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 ml-2">
                    {selectedWorkers.length}
                  </Badge>
                )}
              </h3>

              {isResourcesLoading ? (
                <div className="flex items-center gap-2 text-slate-400 py-4 italic text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جاري تحميل العمال..." : "Chargement..."}
                </div>
              ) : projectWorkers.length === 0 ? (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border">
                  {isAr ? "لا يوجد عمال مخصصون لهذا المشروع." : "Aucun ouvrier assigné."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                  {projectWorkers.map((pw) => {
                    const isSelected = selectedWorkers.some((w) => w.worker_id === pw.worker_id);
                    const selectedEntry = selectedWorkers.find((w) => w.worker_id === pw.worker_id);
                    return (
                      <div
                        key={pw.id}
                        onClick={() => handleWorkerToggle(pw)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                          }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase text-xs">
                          {(pw.worker?.full_name || "?").charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">{pw.worker?.full_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{pw.worker?.job_title}</p>
                        </div>
                        {isSelected && (
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 border-l pl-2">
                            <input
                              type="number"
                              min="1" max="24"
                              value={selectedEntry?.hours_worked ?? 8}
                              onChange={(e) => {
                                const hours = Number(e.target.value);
                                setSelectedWorkers(prev => prev.map(w => w.worker_id === pw.worker_id ? { ...w, hours_worked: hours } : w));
                              }}
                              className="w-10 h-7 text-xs border rounded text-center bg-white"
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
          </div>

          {/* Equipment Section */}
          <div className="space-y-4">

            {/* Paste your previous equipment section code here */}
            {/* المعدات المستخدمة */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                {isAr ? "المعدات المستخدمة" : "Équipements utilisés"}
                {selectedEquipment.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 ml-2">
                    {selectedEquipment.length}
                  </Badge>
                )}
              </h3>

              {isResourcesLoading ? (
                <div className="flex items-center gap-2 text-slate-400 py-4 italic text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جاري التحميل..." : "Chargement..."}
                </div>
              ) : projectEquipment.length === 0 ? (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border">
                  {isAr ? "لا توجد معدات مخصصة لهذا المشروع." : "Aucun équipement assigné."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {projectEquipment.map((pe) => {
                    const isSelected = selectedEquipment.some((e) => e.equipment_id === pe.equipment_id);
                    const selectedEntry = selectedEquipment.find((e) => e.equipment_id === pe.equipment_id);
                    return (
                      <div
                        key={pe.id}
                        onClick={() => handleEquipmentToggle(pe)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                          }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">{pe.equipment?.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{pe.equipment?.type}</p>
                        </div>
                        {isSelected && (
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 border-l pl-2">
                            <input
                              type="number"
                              min="1" max="24"
                              value={selectedEntry?.usage_hours ?? 8}
                              onChange={(e) => {
                                const hours = Number(e.target.value);
                                setSelectedEquipment(prev => prev.map(eq => eq.equipment_id === pe.equipment_id ? { ...eq, usage_hours: hours } : eq));
                              }}
                              className="w-10 h-7 text-xs border rounded text-center bg-white"
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
          </div>

          {/* Photos & Attachments Section */}
          <div className="space-y-4">

            {/* Paste your previous photos and attachments code here */}
            {/* الصور والمرفقات */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-bold flex items-center gap-2">
                  <ImagePlus className="w-5 h-5 text-purple-500" />
                  {isAr ? "الصور الميدانية" : "Photos du terrain"}
                </h3>

                {/* معرض الصور الحالي */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square shadow-sm">
                        <img src={photo.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <button
                          type="button"
                          onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all border-slate-200"
                >
                  {isUploadingPhoto ? <Loader2 className="animate-spin text-purple-500" /> : <Plus className="text-slate-400" />}
                  <span className="text-sm font-medium text-slate-600">{isAr ? "انقر لإضافة صور من الميدان" : "Ajouter des photos de terrain"}</span>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </div>

              <div className="space-y-3 border-t pt-6">
                <h3 className="font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  {isAr ? "المرفقات (PDF, Excel...)" : "Pièces jointes"}
                </h3>

                {isEdit && existingAttachments.length > 0 && (
                  <AttachmentsList attachments={existingAttachments} isAr={isAr} onDelete={(id) => { }} readOnly={false} />
                )}

                {/* هنا تضع منطقة السحب والإفلات للمرفقات كما في النسخة الأصلية */}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? (isAr ? "حفظ التعديلات" : "Enregistrer les modifications") : (isAr ? "حفظ التقرير" : "Enregistrer le rapport")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!isEdit || !log) {
                  toast.error(isAr ? "احفظ التقرير أولاً" : "Save the report first");
                  return;
                }
                try {
                  await dailyLogService.generatePDF(log, isAr);
                  toast.success(isAr ? "تم تحميل التقرير PDF" : "PDF downloaded");
                } catch (err) {
                  toast.error("فشل إنشاء PDF");
                }
              }}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              {isAr ? "تصدير PDF" : "Export PDF"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}