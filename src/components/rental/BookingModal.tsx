"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectsService } from "@/lib/services/projects-service";
import { rentalService } from "@/lib/services/rental-service";
import { Equipment, Project } from "@/lib/types/projects";
import { toast } from "sonner";
import { CalendarDays, AlertTriangle, Loader2 } from "lucide-react";

interface BookingModalProps {
  equipment: Equipment;
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  onSuccess?: () => void;
}

export function BookingModal({ equipment, isOpen, onClose, isAr, onSuccess }: BookingModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Cost & Budget States
  const [totalCost, setTotalCost] = useState<number>(0);
  const [projectBudget, setProjectBudget] = useState<{ planned: number; actual: number; remaining: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // 1. تحميل مشاريع المقاول الحالي لاختيار أحدها للربط
  useEffect(() => {
    if (isOpen) {
      setIsLoadingProjects(true);
      projectsService.getAll()
        .then(data => {
          setProjects(data);
          if (data.length > 0) {
            setSelectedProjectId(data[0].id);
          }
        })
        .catch(err => {
          console.error("Failed to load projects", err);
          toast.error(isAr ? "فشل تحميل المشاريع الخاصة بك" : "Échec du chargement de vos projets");
        })
        .finally(() => setIsLoadingProjects(false));

      // ضبط التواريخ الافتراضية (اليوم وغداً)
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(tomorrow);
    }
  }, [isOpen]);

  // 2. حساب التكلفة الكلية ديناميكياً عند تغير التواريخ
  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      const rate = equipment.rent_daily_rate || equipment.daily_rate;
      const cost = rentalService.calculateRentalCost(rate, startDate, endDate);
      setTotalCost(cost);
    } else {
      setTotalCost(0);
    }
  }, [startDate, endDate, equipment]);

  // 3. جلب ميزانية المشروع المحدد للتحقق من كفايتها
  useEffect(() => {
    if (selectedProjectId && totalCost > 0) {
      rentalService.getProjectRemainingBudget(selectedProjectId)
        .then(budgetData => {
          setProjectBudget(budgetData);
        })
        .catch(err => {
          console.error("Error checking remaining budget:", err);
          setProjectBudget(null);
        });
    } else {
      setProjectBudget(null);
    }
  }, [selectedProjectId, totalCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error(isAr ? "يرجى تحديد التواريخ" : "Veuillez sélectionner les dates");
      return;
    }
    if (startDate > endDate) {
      toast.error(isAr ? "تاريخ البدء يجب أن يكون قبل أو يساوي تاريخ الانتهاء" : "La date de début doit être antérieure ou égale à la date de fin");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/equipment/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: equipment.id,
          project_id: selectedProjectId || null,
          owner_id: equipment.owner_id,
          start_date: startDate,
          end_date: endDate,
          notes: "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      toast.success(isAr ? "تم إرسال طلب الحجز بنجاح" : "Demande de réservation envoyée avec succès");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || (isAr ? "حدث خطأ غير متوقع" : "Une erreur est survenue"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBudgetExceeded = projectBudget && projectBudget.remaining < totalCost;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-6 text-slate-900 dark:text-slate-50" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-500" />
            {isAr ? `حجز معدة: ${equipment.name}` : `Réserver: ${equipment.name}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          {/* اختيار المشروع */}
          <div className="space-y-1">
            <Label htmlFor="project-select">
              {isAr ? "اربط الحجز بمشروع (اختياري)" : "Associer à un projet (optionnel)"}
            </Label>
            {isLoadingProjects ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? "جاري تحميل المشاريع..." : "Chargement des projets..."}</span>
              </div>
            ) : (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-select" className="w-full">
                  <SelectValue placeholder={isAr ? "اختر مشروعاً..." : "Sélectionner un projet..."} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* تحديد التواريخ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start-date">{isAr ? "تاريخ البدء" : "Date de début"}</Label>
              <Input
                type="date"
                id="start-date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date">{isAr ? "تاريخ الانتهاء" : "Date de fin"}</Label>
              <Input
                type="date"
                id="end-date"
                value={endDate}
                min={startDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full"
              />
            </div>
          </div>

          {/* عرض السعر اليومي والنوعي */}
          <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{isAr ? "السعر اليومي للتأجير:" : "Tarif journalier:"}</span>
              <span className="font-bold">
                {(equipment.rent_daily_rate || equipment.daily_rate).toLocaleString()} DZD
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-slate-500 font-medium">{isAr ? "التكلفة الإجمالية المقدرة:" : "Total estimé:"}</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-lg">
                {totalCost.toLocaleString()} DZD
              </span>
            </div>
          </div>

          {/* ربط الميزانية والتحذيرات */}
          {projectBudget && (
            <div className="text-xs space-y-1 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg">
              <div className="flex justify-between">
                <span>{isAr ? "ميزانية العتاد المخططة:" : "Budget matériel planifié:"}</span>
                <span className="font-medium">{projectBudget.planned.toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? "المصروف الفعلي حتى الآن:" : "Dépensé réel actuel:"}</span>
                <span className="font-medium text-amber-600">{projectBudget.actual.toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between border-t border-dashed mt-1.5 pt-1.5 font-bold">
                <span>{isAr ? "الميزانية المتاحة حالياً:" : "Budget disponible:"}</span>
                <span className={isBudgetExceeded ? "text-red-500" : "text-emerald-500"}>
                  {projectBudget.remaining.toLocaleString()} DZD
                </span>
              </div>
            </div>
          )}

          {isBudgetExceeded && (
            <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>
                {isAr
                  ? "تنبيه: تكلفة التأجير الإجمالية تتجاوز ميزانية العتاد المتبقية لهذا المشروع."
                  : "Attention: Le coût total de la location dépasse le budget matériel restant de ce projet."}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button type="submit" disabled={isSubmitting || totalCost <= 0} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAr ? "تأكيد طلب الحجز" : "Confirmer la réservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
