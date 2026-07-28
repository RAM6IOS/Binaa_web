"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import {
  Search,
  Loader2,
  Plus,
  Users,
  Truck,
  Check,
  UserPlus,
  ArrowLeft,
  Frown,
  CheckCircle2,
} from "lucide-react";
import { workersService } from "@/lib/services/workers-service";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { equipmentService } from "@/lib/services/equipment-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import {
  Worker,
  WorkerStatus,
  Equipment,
  EquipmentStatus,
  OwnerType,
} from "@/lib/types/projects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface AssignResourceModalProps {
  type: "worker" | "equipment";
  projectId: string;
  isAr: boolean;
  onSuccess: () => void;
  excludeIds: string[];
}

export function AssignResourceModal({
  type,
  projectId,
  isAr,
  onSuccess,
  excludeIds,
}: AssignResourceModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [allResources, setAllResources] = useState<Worker[] | Equipment[]>([]);
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<Set<string>>(
    new Set()
  );
  const [assignedEquipmentIds, setAssignedEquipmentIds] = useState<
    Set<string>
  >(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [assignedRole, setAssignedRole] = useState("");
  const [hours, setHours] = useState("8");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddEquipment, setShowAddEquipment] = useState(false);

  // ── جلب البيانات ──
  const fetchAvailable = useCallback(async () => {
    setIsLoading(true);
    try {
      if (type === "worker") {
        const [allWorkers, projectWorkers] = await Promise.all([
          workersService.getAll(),
          projectWorkersService.getByProjectId(projectId),
        ]);
        setAllResources(allWorkers);
        setAssignedWorkerIds(
          new Set(projectWorkers.map((pw) => pw.worker_id))
        );
      } else {
        const [allEquipment, projectEquipment] = await Promise.all([
          equipmentService.getAll(),
          projectEquipmentService.getByProjectId(projectId),
        ]);
        setAllResources(allEquipment);
        setAssignedEquipmentIds(
          new Set(projectEquipment.map((pe) => pe.equipment_id))
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [type, projectId]);

  useEffect(() => {
    if (open) fetchAvailable();
  }, [open, fetchAvailable]);

  // ── حساب المتاحين ──
  const isWorkerType = type === "worker";

  const availableWorkers = allResources.filter(
    (w) => !assignedWorkerIds.has(w.id)
  );

  const availableEquipment = allResources.filter(
    (e) => !assignedEquipmentIds.has(e.id)
  );

  const totalCount = allResources.length;
  const availableCount = isWorkerType
    ? availableWorkers.length
    : availableEquipment.length;
  const allAssigned = totalCount > 0 && availableCount === 0;

  const listToShow = isWorkerType ? availableWorkers : availableEquipment;

  const filtered = listToShow.filter((r) => {
    const term = searchQuery.toLowerCase();
    const name = isWorkerType ? (r as Worker).full_name : (r as Equipment).name;
    return name?.toLowerCase().includes(term);
  });

  const toggleSelection = (id: string) => {
    if (!isWorkerType) {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      if (isWorkerType) {
        const assignments = selectedIds.map((workerId) => ({
          project_id: projectId,
          worker_id: workerId,
          assigned_role: assignedRole || "Ouvrier",
          daily_hours: Number(hours),
          start_date: startDate,
          status: "active" as const,
        }));
        await projectWorkersService.assign(assignments);
        toast.success(
          isAr ? "تم تعيين العمال بنجاح" : "Ouvriers assignés avec succès"
        );
      } else {
        await projectEquipmentService.assign({
          project_id: projectId,
          equipment_id: selectedIds[0],
          usage_hours_per_day: Number(hours),
        });
        toast.success(isAr ? "تمت إضافة العتاد" : "Équipement ajouté");
      }
      setOpen(false);
      onSuccess();
      setSelectedIds([]);
      setAssignedRole("");
      setHours("8");
      setSearchQuery("");
    } catch {
      toast.error(isAr ? "حدث خطأ ما" : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkerCreated = async (newWorker?: Worker) => {
    setSearchQuery("");
    await fetchAvailable();
    setShowAddWorker(false);
    if (newWorker) {
      setSelectedIds([newWorker.id]);
    }
  };

  const handleEquipmentCreated = async (newEquipment?: Equipment) => {
    setSearchQuery("");
    await fetchAvailable();
    setShowAddEquipment(false);
    if (newEquipment) {
      setSelectedIds([newEquipment.id]);
    }
  };

  const handleCloseDialog = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
      setSelectedIds([]);
    }
  };

  // ── نصوص الحالات ──
  const emptyStateTitle = isWorkerType
    ? isAr
      ? "لا يوجد عمال في المنصة بعد"
      : "Aucun ouvrier sur la plateforme"
    : isAr
      ? "لا توجد معدات في المنصة بعد"
      : "Aucun équipement sur la plateforme";

  const emptyStateDesc = isWorkerType
    ? isAr
      ? "أضف العامل أولاً إلى قائمة الموارد البشرية، ثم عيّنه لهذا المشروع."
      : "Ajoutez d'abord l'ouvrier à la base de données, puis assignez-le à ce projet."
    : isAr
      ? "أضف المعدة أولاً إلى قائمة العتاد، ثم عيّنها لهذا المشروع."
      : "Ajoutez d'abord l'équipement, puis assignez-le à ce projet.";

  const allAssignedTitle = isWorkerType
    ? isAr
      ? "جميع العمال موجودون بالفعل في هذا المشروع"
      : "Tous les ouvriers sont déjà assignés à ce projet"
    : isAr
      ? "جميع المعدات موجودة بالفعل في هذا المشروع"
      : "Tous les équipements sont déjà assignés à ce projet";

  const allAssignedDesc = isWorkerType
    ? isAr
      ? "يمكنك إضافة عامل جديد إلى القائمة الرئيسية ثم تعيينه هنا."
      : "Vous pouvez ajouter un nouvel ouvrier puis l'assigner ici."
    : isAr
      ? "يمكنك إضافة معدة جديدة إلى القائمة الرئيسية ثم تعيينها هنا."
      : "Vous pouvez ajouter un nouvel équipement puis l'assigner ici.";

  const noResultsText = isAr
    ? "لا توجد نتائج مطابقة لبحثك"
    : "Aucun résultat ne correspond à votre recherche";

  const addNewLabel = isWorkerType
    ? isAr
      ? "إضافة عامل جديد"
      : "Ajouter un ouvrier"
    : isAr
      ? "إضافة عتاد جديد"
      : "Ajouter un équipement";

  const manageLabel = isWorkerType
    ? isAr
      ? "إدارة العمال"
      : "Gestion ouvriers"
    : isAr
      ? "إدارة العتاد"
      : "Gestion équipement";

  const manageHref = isWorkerType
    ? `/${isAr ? "ar" : "fr"}/projects/workers`
    : `/${isAr ? "ar" : "fr"}/projects/equipment`;

  const showAddForm = isWorkerType ? showAddWorker : showAddEquipment;

  const handleAddNewClick = () => {
    if (isWorkerType) {
      setShowAddWorker(true);
    } else {
      setShowAddEquipment(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {isAr
            ? isWorkerType
              ? "تعيين عمال"
              : "إضافة عتاد"
            : isWorkerType
              ? "Assigner ouvriers"
              : "Ajouter équipement"}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[600px] flex flex-col h-[85vh]"
        dir={isAr ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle>
            {isAr
              ? isWorkerType
                ? "تعيين عمال للمشروع"
                : "تخصيص عتاد للمشروع"
              : isWorkerType
                ? "Assigner des ouvriers"
                : "Affecter un équipement"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 py-4 gap-4">
          {/* ── شريط البحث ── */}
          {!isLoading && !showAddForm && !allAssigned && availableCount > 0 && (
            <div className="relative">
              <Search
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400",
                  isAr ? "right-3" : "left-3"
                )}
              />
              <Input
                placeholder={isAr ? "ابحث..." : "Rechercher..."}
                className={cn(isAr ? "pl-3 pr-10" : "pl-10")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dir={isAr ? "rtl" : "ltr"}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              /* ── تحميل ── */
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : totalCount === 0 ? (
              /* ── الحالة A: لا يوجد أي مورد في المنصة ── */
              <div className="flex flex-col items-center justify-center h-full gap-5 py-10 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Frown className="w-8 h-8 text-slate-400" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                    {emptyStateTitle}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {emptyStateDesc}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <Button
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700 flex-1"
                    onClick={handleAddNewClick}
                  >
                    <UserPlus className="w-4 h-4" />
                    {addNewLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 flex-1"
                    asChild
                  >
                    <Link href={manageHref}>
                      <ArrowLeft className="w-4 h-4" />
                      {manageLabel}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : allAssigned ? (
              /* ── الحالة C: جميع الموارد معيّنة ── */
              <div className="flex flex-col items-center justify-center h-full gap-5 py-10 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                    {allAssignedTitle}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {allAssignedDesc}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <Button
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700 flex-1"
                    onClick={handleAddNewClick}
                  >
                    <UserPlus className="w-4 h-4" />
                    {addNewLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 flex-1"
                    asChild
                  >
                    <Link href={manageHref}>
                      <ArrowLeft className="w-4 h-4" />
                      {manageLabel}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : showAddWorker && isWorkerType ? (
              /* ── نموذج إضافة عامل مدمج ── */
              <div className="p-4">
                <AddWorkerInlineForm
                  isAr={isAr}
                  onDone={handleWorkerCreated}
                  onCancel={() => setShowAddWorker(false)}
                />
              </div>
            ) : showAddEquipment && !isWorkerType ? (
              /* ── نموذج إضافة معدة مدمج ── */
              <div className="p-4">
                <AddEquipmentInlineForm
                  isAr={isAr}
                  onDone={handleEquipmentCreated}
                  onCancel={() => setShowAddEquipment(false)}
                />
              </div>
            ) : filtered.length === 0 ? (
              /* ── لا نتائج بحث ── */
              <div className="flex flex-col items-center justify-center h-32 gap-3 text-center px-4">
                <Search className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-500">{noResultsText}</p>
              </div>
            ) : (
              /* ── قائمة العمال/العتاد المتاح ── */
              <div className="divide-y">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors",
                      selectedIds.includes(item.id) &&
                        "bg-blue-50 dark:bg-blue-900/20",
                      !isAr &&
                        selectedIds.includes(item.id) &&
                        "border-l-4 border-l-blue-500",
                      isAr &&
                        selectedIds.includes(item.id) &&
                        "border-r-4 border-r-blue-500"
                    )}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {isWorkerType && (item as Worker).photo_url ? (
                          <img
                            src={(item as Worker).photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : isWorkerType ? (
                          <Users className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Truck className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {isWorkerType
                            ? (item as Worker).full_name
                            : (item as Equipment).name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {isWorkerType
                            ? (item as Worker).job_title
                            : (item as Equipment).type}
                        </div>
                      </div>
                    </div>
                    {selectedIds.includes(item.id) && (
                      <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── نموذج تفاصيل التعيين (عمال فقط) ── */}
          {isWorkerType && selectedIds.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>
                    {isAr ? "الدور المخصص" : "Rôle assigné"}
                  </Label>
                  <Input
                    value={assignedRole}
                    onChange={(e) => setAssignedRole(e.target.value)}
                    placeholder={
                      isAr ? "بناء، رئيس ورشة..." : "Maçon, Chef..."
                    }
                    dir={isAr ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {isAr ? "تاريخ البدء" : "Date de début"}
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {isAr ? "ساعات العمل اليومية" : "Heures / jour"}
                  </Label>
                  <Input
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── ساعات العتاد ── */}
          {!isWorkerType && selectedIds.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>
                  {isAr ? "ساعات العمل اليومية" : "Heures / jour"}
                </Label>
                <Input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleCloseDialog(false)}>
            {isAr ? "إلغاء" : "Annuler"}
          </Button>
          <Button
            disabled={selectedIds.length === 0 || isSubmitting}
            onClick={handleAssign}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isAr
              ? `تأكيد تعيين (${selectedIds.length})`
              : `Confirmer (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────
   AddWorkerInlineForm — pure form, no Dialog wrapper
   ──────────────────────────────────────────────────────────────── */

interface AddWorkerInlineFormProps {
  isAr: boolean;
  onDone: (createdWorker?: Worker) => void;
  onCancel: () => void;
}

function AddWorkerInlineForm({
  isAr,
  onDone,
  onCancel,
}: AddWorkerInlineFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Worker>>({
    full_name: "",
    cin: "",
    phone: "",
    job_title: "",
    daily_rate: undefined,
    hourly_rate: undefined,
    wilaya: "",
    availability: "available",
    photo_url: "",
    skills: "",
    emergency_contact: "",
    date_of_birth: "",
    contract_type: undefined,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          isAr ? "يجب تسجيل الدخول أولاً" : "Authentication required"
        );
      }

      const cleanData: any = { ...formData, user_id: user.id };

      const optionalFields = [
        "hourly_rate",
        "photo_url",
        "skills",
        "emergency_contact",
        "date_of_birth",
        "contract_type",
        "notes",
      ];
      optionalFields.forEach((field) => {
        if (cleanData[field] === "" || cleanData[field] === undefined) {
          cleanData[field] = null;
        }
      });

      if (
        !cleanData.full_name ||
        !cleanData.cin ||
        !cleanData.phone ||
        !cleanData.job_title ||
        !cleanData.daily_rate ||
        !cleanData.wilaya
      ) {
        throw new Error(
          isAr
            ? "يرجى ملء جميع الحقول المطلوبة"
            : "Please fill all required fields"
        );
      }

      const createdWorker = await workersService.create(cleanData);
      toast.success(
        isAr
          ? "تمت إضافة العامل بنجاح ✓"
          : "Ouvrier ajouté avec succès ✓"
      );
      onDone(createdWorker);
    } catch (error: any) {
      if (error?.code === "23505") {
        toast.error(
          isAr
            ? "رقم التعريف الوطني (CIN) مسجل مسبقاً"
            : "CIN déjà enregistré"
        );
      } else {
        const msg =
          error?.message ||
          (isAr
            ? "حدث خطأ أثناء الحفظ"
            : "Erreur lors de la sauvegarde");
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      dir={isAr ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {isAr ? "العودة للقائمة" : "Retour à la liste"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الاسم الكامل" : "Nom complet"}
          </Label>
          <Input
            required
            value={formData.full_name || ""}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            placeholder={isAr ? "مثال: أحمد منصور" : "Ex: Ahmed Mansouri"}
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            CIN
          </Label>
          <Input
            required
            value={formData.cin || ""}
            onChange={(e) =>
              setFormData({ ...formData, cin: e.target.value })
            }
            placeholder="123456789"
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "رقم الهاتف" : "Téléphone"}
          </Label>
          <Input
            required
            value={formData.phone || ""}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="05xx xx xx xx"
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "المسمى الوظيفي" : "Poste"}
          </Label>
          <Select
            value={formData.job_title}
            onValueChange={(val) =>
              setFormData({ ...formData, job_title: val })
            }
            required
          >
            <SelectTrigger>
              <SelectValue
                placeholder={isAr ? "اختر الوظيفة" : "Choisir le poste"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Maçon">
                {isAr ? "بناء" : "Maçon"}
              </SelectItem>
              <SelectItem value="Charpentier">
                {isAr ? "نجار" : "Charpentier"}
              </SelectItem>
              <SelectItem value="Ferrailleur">
                {isAr ? "حداد تسليح" : "Ferrailleur"}
              </SelectItem>
              <SelectItem value="Plombier">
                {isAr ? "سباك" : "Plombier"}
              </SelectItem>
              <SelectItem value="Électricien">
                {isAr ? "كهربائي" : "Électricien"}
              </SelectItem>
              <SelectItem value="Peintre">
                {isAr ? "صباغ" : "Peintre"}
              </SelectItem>
              <SelectItem value="Ingénieur Civil">
                {isAr ? "مهندس مدني" : "Ingénieur Civil"}
              </SelectItem>
              <SelectItem value="Chef de Chantier">
                {isAr ? "رئيس ورشة" : "Chef de Chantier"}
              </SelectItem>
              <SelectItem value="Chauffeur">
                {isAr ? "سائق" : "Chauffeur"}
              </SelectItem>
              <SelectItem value="Manoeuvre">
                {isAr ? "عامل عادي" : "Manoeuvre"}
              </SelectItem>
              <SelectItem value="Autre">
                {isAr ? "أخرى" : "Autre"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الأجر اليومي (دج)" : "Taux journalier (DZD)"}
          </Label>
          <Input
            type="number"
            required
            value={formData.daily_rate || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                daily_rate: Number(e.target.value),
              })
            }
            placeholder="4000"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الولاية" : "Wilaya"}
          </Label>
          <Input
            required
            value={formData.wilaya || ""}
            onChange={(e) =>
              setFormData({ ...formData, wilaya: e.target.value })
            }
            placeholder={isAr ? "وهران، الجزائر..." : "Oran, Alger..."}
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "حالة التوفر" : "Disponibilité"}
          </Label>
          <Select
            value={formData.availability}
            onValueChange={(val: WorkerStatus) =>
              setFormData({ ...formData, availability: val })
            }
            required
          >
            <SelectTrigger>
              <SelectValue
                placeholder={isAr ? "اختر الحالة" : "Choisir le statut"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">
                {isAr ? "متاح" : "Disponible"}
              </SelectItem>
              <SelectItem value="on_project">
                {isAr ? "في مشروع" : "Sur projet"}
              </SelectItem>
              <SelectItem value="unavailable">
                {isAr ? "غير متاح" : "Indisponible"}
              </SelectItem>
              <SelectItem value="vacation">
                {isAr ? "في إجازة" : "En congé"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "المهارات" : "Compétences"}
          </Label>
          <Textarea
            value={formData.skills || ""}
            onChange={(e) =>
              setFormData({ ...formData, skills: e.target.value })
            }
            placeholder={
              isAr
                ? "المهارات الخاصة بالعامل..."
                : "Compétences spécifiques..."
            }
            className="min-h-[70px]"
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} size="sm">
          {isAr ? "إلغاء" : "Annuler"}
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isAr ? "حفظ وإضافة" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────
   AddEquipmentInlineForm — pure form, no Dialog wrapper
   ──────────────────────────────────────────────────────────────── */

interface AddEquipmentInlineFormProps {
  isAr: boolean;
  onDone: (createdEquipment?: Equipment) => void;
  onCancel: () => void;
}

function AddEquipmentInlineForm({
  isAr,
  onDone,
  onCancel,
}: AddEquipmentInlineFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Equipment>>({
    name: "",
    type: "",
    category: "",
    brand: "",
    model: "",
    serial_number: "",
    plate_number: "",
    year_of_manufacture: undefined,
    hourly_rate: 0,
    daily_rate: 0,
    wilaya: "",
    current_location: "",
    status: "available",
    owner_type: "company",
    photo_url: "",
    total_hours_used: 0,
    hours_since_last_maintenance: 0,
    maintenance_status: "up_to_date",
    maintenance_cost: 0,
    maintenance_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cleanData: any = { ...formData };

      const optionalFields = [
        "plate_number",
        "current_location",
        "photo_url",
        "maintenance_notes",
        "year_of_manufacture",
        "maintenance_interval_hours",
        "maintenance_last_date",
        "maintenance_next_due",
        "warranty_expiry",
        "supplier_maintenance_contact",
      ];
      optionalFields.forEach((field) => {
        if (cleanData[field] === "" || cleanData[field] === undefined) {
          cleanData[field] = null;
        }
      });

      if (
        !cleanData.name ||
        !cleanData.type ||
        !cleanData.category ||
        !cleanData.brand ||
        !cleanData.model ||
        !cleanData.serial_number ||
        !cleanData.hourly_rate ||
        !cleanData.daily_rate ||
        !cleanData.wilaya
      ) {
        throw new Error(
          isAr
            ? "يرجى ملء جميع الحقول المطلوبة"
            : "Please fill all required fields"
        );
      }

      const createdEquipment = await equipmentService.create(cleanData);
      toast.success(
        isAr
          ? "تمت إضافة المعدة بنجاح ✓"
          : "Équipement ajouté avec succès ✓"
      );
      onDone(createdEquipment);
    } catch (error: any) {
      if (error?.code === "23505") {
        toast.error(
          isAr
            ? "الرقم التسلسلي مسجل مسبقاً"
            : "Numéro de série déjà enregistré"
        );
      } else {
        const msg =
          error?.message ||
          (isAr
            ? "حدث خطأ أثناء الحفظ"
            : "Erreur lors de la sauvegarde");
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      dir={isAr ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {isAr ? "العودة للقائمة" : "Retour à la liste"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "اسم المعدة" : "Nom de l'équipement"}
          </Label>
          <Input
            required
            value={formData.name || ""}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder={isAr ? "مثال: حفارة هيدروليكية" : "Ex: Pelle hydraulique"}
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "النوع" : "Type"}
          </Label>
          <Input
            required
            value={formData.type || ""}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value })
            }
            placeholder={isAr ? "مثال: حفارة" : "Ex: Excavatrice"}
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الفئة" : "Catégorie"}
          </Label>
          <Input
            required
            value={formData.category || ""}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder={isAr ? "مثال: آلات ثقيلة" : "Ex: Engins lourds"}
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "العلامة التجارية" : "Marque"}
          </Label>
          <Input
            required
            value={formData.brand || ""}
            onChange={(e) =>
              setFormData({ ...formData, brand: e.target.value })
            }
            placeholder="Caterpillar, Liebherr..."
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الموديل" : "Modèle"}
          </Label>
          <Input
            required
            value={formData.model || ""}
            onChange={(e) =>
              setFormData({ ...formData, model: e.target.value })
            }
            placeholder="320D, HTM 904..."
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الرقم التسلسلي" : "N° de série"}
          </Label>
          <Input
            required
            value={formData.serial_number || ""}
            onChange={(e) =>
              setFormData({ ...formData, serial_number: e.target.value })
            }
            placeholder="SN-123456"
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الأجر بالساعة (دج)" : "Taux horaire (DZD)"}
          </Label>
          <Input
            type="number"
            required
            value={formData.hourly_rate || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                hourly_rate: Number(e.target.value),
              })
            }
            placeholder="2500"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الأجر اليومي (دج)" : "Taux journalier (DZD)"}
          </Label>
          <Input
            type="number"
            required
            value={formData.daily_rate || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                daily_rate: Number(e.target.value),
              })
            }
            placeholder="25000"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الولاية" : "Wilaya"}
          </Label>
          <Input
            required
            value={formData.wilaya || ""}
            onChange={(e) =>
              setFormData({ ...formData, wilaya: e.target.value })
            }
            placeholder={isAr ? "وهران، الجزائر..." : "Oran, Alger..."}
            dir={isAr ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "الحالة التشغيلية" : "Statut"}
          </Label>
          <Select
            value={formData.status}
            onValueChange={(val: EquipmentStatus) =>
              setFormData({ ...formData, status: val })
            }
            required
          >
            <SelectTrigger>
              <SelectValue
                placeholder={isAr ? "اختر الحالة" : "Choisir le statut"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">
                {isAr ? "متاح" : "Disponible"}
              </SelectItem>
              <SelectItem value="in_use">
                {isAr ? "قيد الاستخدام" : "En service"}
              </SelectItem>
              <SelectItem value="maintenance">
                {isAr ? "صيانة" : "Maintenance"}
              </SelectItem>
              <SelectItem value="out_of_service">
                {isAr ? "خارج الخدمة" : "Hors service"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
            {isAr ? "نوع الملكية" : "Type de propriété"}
          </Label>
          <Select
            value={formData.owner_type}
            onValueChange={(val: OwnerType) =>
              setFormData({ ...formData, owner_type: val })
            }
            required
          >
            <SelectTrigger>
              <SelectValue
                placeholder={isAr ? "اختر النوع" : "Choisir le type"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">
                {isAr ? "ملك للشركة" : "Propriété de l'entreprise"}
              </SelectItem>
              <SelectItem value="rented">
                {isAr ? "مستأجر" : "Loué"}
              </SelectItem>
              <SelectItem value="subcontracted">
                {isAr ? "مقاول فرعي" : "Sous-traité"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} size="sm">
          {isAr ? "إلغاء" : "Annuler"}
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isAr ? "حفظ وإضافة" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
