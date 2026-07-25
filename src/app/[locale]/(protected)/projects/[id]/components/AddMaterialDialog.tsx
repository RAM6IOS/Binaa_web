"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { materialsService } from "@/lib/services/materials-service";
import { Material, CreateMaterialDto, MATERIAL_UNITS } from "@/lib/types/materials";

interface Props {
  isAr: boolean;
  projectId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  editItem?: Material | null;
}

const unitLabels: Record<string, { ar: string; fr: string }> = {
  kgs: { ar: "كيلوغرام", fr: "Kgs" },
  tonnes: { ar: "طن", fr: "Tonnes" },
  m3: { ar: "متر مكعب", fr: "m³" },
  m: { ar: "متر", fr: "Mètre" },
  piece: { ar: "قطعة", fr: "Pièce" },
  other: { ar: "أخرى", fr: "Autre" },
};

export function AddMaterialDialog({ isAr, projectId, onSuccess, trigger, editItem }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!editItem;

  const [formData, setFormData] = useState<CreateMaterialDto>({
    project_id: projectId,
    name: "",
    unit: "kgs",
    initial_quantity: 0,
    unit_price: 0,
    notes: "",
    created_by: "",
  });

  const resetForm = () => {
    setFormData({
      project_id: projectId,
      name: "",
      unit: "kgs",
      initial_quantity: 0,
      unit_price: 0,
      notes: "",
      created_by: "",
    });
  };

  useEffect(() => {
    if (editItem) {
      setFormData({
        project_id: projectId,
        name: editItem.name,
        unit: editItem.unit,
        initial_quantity: editItem.initial_quantity,
        unit_price: editItem.unit_price,
        notes: editItem.notes || "",
        created_by: editItem.created_by,
      });
      setOpen(true);
    }
  }, [editItem, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(isAr ? "اسم المادة مطلوب" : "Nom du matériel requis");
      return;
    }
    if (formData.initial_quantity <= 0) {
      toast.error(isAr ? "الكمية يجب أن تكون أكبر من 0" : "La quantité doit être supérieure à 0");
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit && editItem) {
        await materialsService.update(editItem.id, {
          name: formData.name,
          unit: formData.unit,
          initial_quantity: formData.initial_quantity,
          unit_price: formData.unit_price,
          notes: formData.notes,
        });
        toast.success(isAr ? "تم تعديل المادة بنجاح" : "Matériel modifié");
      } else {
        await materialsService.create({
          project_id: projectId,
          name: formData.name,
          unit: formData.unit,
          initial_quantity: formData.initial_quantity,
          unit_price: formData.unit_price,
          notes: formData.notes,
          created_by: "", // resolved server-side
        });
        toast.success(isAr ? "تم إضافة المادة بنجاح" : "Matériel ajouté");
      }
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch {
      toast.error(isAr ? "حدث خطأ" : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && editItem) {
        setFormData({
          project_id: projectId,
          name: editItem.name,
          unit: editItem.unit,
          initial_quantity: editItem.initial_quantity,
          unit_price: editItem.unit_price,
          notes: editItem.notes || "",
          created_by: editItem.created_by,
        });
      } else if (!v) {
        resetForm();
      }
    }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 border-b bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isEdit
              ? (isAr ? "تعديل المادة" : "Modifier le matériel")
              : (isAr ? "إضافة مادة جديدة" : "Ajouter un matériel")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-bold">
              <span className="text-red-500">*</span>
              {isAr ? "اسم المادة" : "Nom du matériel"}
            </Label>
            <Input
              placeholder={isAr ? "مثال: أسمنت بورتلاندي" : "ex: Ciment Portland"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-bold">
                <span className="text-red-500">*</span>
                {isAr ? "الوحدة" : "Unité"}
              </Label>
              <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_UNITS.map(u => (
                    <SelectItem key={u} value={u}>
                      {isAr ? unitLabels[u].ar : unitLabels[u].fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {isAr ? "الكمية الأولية / المتوفرة" : "Quantité initiale"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.initial_quantity || ""}
                onChange={(e) => setFormData({ ...formData, initial_quantity: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {isAr ? "السعر الوحدوي" : "Prix unitaire"}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_price || ""}
              onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
            />
          </div>

          {formData.initial_quantity > 0 && formData.unit_price > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl flex justify-between items-center border border-emerald-100">
              <span className="text-xs font-bold text-emerald-600">{isAr ? "القيمة الإجمالية" : "Valeur totale"}</span>
              <span className="text-lg font-black text-emerald-700">
                {(formData.initial_quantity * formData.unit_price).toLocaleString()} <span className="text-xs">DZD</span>
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold">{isAr ? "ملاحظات" : "Notes"}</Label>
            <Textarea
              rows={2}
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit
                ? (isAr ? "حفظ التعديلات" : "Enregistrer")
                : (isAr ? "إضافة المادة" : "Ajouter")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
