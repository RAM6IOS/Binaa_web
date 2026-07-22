"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Ruler, FileText, DollarSign, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { contractItemsService } from "@/lib/services/contract-items-service";
import { CreateContractItemDto } from "@/lib/types/metres";

interface Props {
  isAr: boolean;
  projectId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const units = ["m³", "m²", "ml", "kg", "t", "unité", "lot", "m", "j"];

interface BulkItem {
  item_number: string;
  designation: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export function AddContractItemDialog({ isAr, projectId, onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");

  const [formData, setFormData] = useState<CreateContractItemDto>({
    project_id: projectId,
    item_number: "",
    designation: "",
    unit: "m³",
    quantity: 0,
    unit_price: 0,
    notes: "",
    sort_order: 0,
  });

  const [bulkItems, setBulkItems] = useState<BulkItem[]>([
    { item_number: "", designation: "", unit: "m³", quantity: 0, unit_price: 0 },
  ]);

  const resetForm = () => {
    setFormData({
      project_id: projectId,
      item_number: "",
      designation: "",
      unit: "m³",
      quantity: 0,
      unit_price: 0,
      notes: "",
      sort_order: 0,
    });
    setBulkItems([{ item_number: "", designation: "", unit: "m³", quantity: 0, unit_price: 0 }]);
    setMode("single");
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_number.trim() || !formData.designation.trim()) {
      toast.error(isAr ? "رقم البند والوصف مطلوبان" : "Numéro et désignation requis");
      return;
    }
    if (formData.quantity <= 0) {
      toast.error(isAr ? "يجب أن تكون الكمية أكبر من 0" : "La quantité doit être supérieure à 0");
      return;
    }

    setIsLoading(true);
    try {
      await contractItemsService.create(formData);
      toast.success(isAr ? "تم إضافة البند بنجاح ✓" : "Article ajouté ✓");
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      if (err?.code === "23505" || err?.message?.includes("duplicate") || err?.message?.includes("unique")) {
        toast.error(isAr ? "رقم البند موجود مسبقاً في هذا المشروع" : "Ce numéro d'article existe déjà");
      } else {
        toast.error(isAr ? "حدث خطأ أثناء الإضافة" : "Erreur lors de l'ajout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    const validItems = bulkItems.filter(i => i.item_number.trim() && i.designation.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error(isAr ? "أضف بنداً واحداً على الأقل" : "Ajoutez au moins un article");
      return;
    }

    setIsLoading(true);
    try {
      const dtos: CreateContractItemDto[] = validItems.map((item, idx) => ({
        project_id: projectId,
        item_number: item.item_number,
        designation: item.designation,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sort_order: idx,
      }));

      await contractItemsService.createMany(dtos);
      toast.success(isAr ? `تم إضافة ${validItems.length} بنود ✓` : `${validItems.length} articles ajoutés ✓`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      toast.error(isAr ? "حدث خطأ أثناء الإضافة" : "Erreur lors de l'ajout");
    } finally {
      setIsLoading(false);
    }
  };

  const addBulkRow = () => {
    setBulkItems([...bulkItems, { item_number: "", designation: "", unit: "m³", quantity: 0, unit_price: 0 }]);
  };

  const updateBulkRow = (index: number, field: keyof BulkItem, value: any) => {
    const updated = [...bulkItems];
    updated[index] = { ...updated[index], [field]: value };
    setBulkItems(updated);
  };

  const removeBulkRow = (index: number) => {
    if (bulkItems.length <= 1) return;
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={mode === 'bulk' ? 'sm:max-w-[900px] max-h-[90vh] overflow-y-auto' : 'sm:max-w-[550px] max-h-[90vh] overflow-y-auto'}>
        <DialogHeader className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-500 text-white">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            {isAr ? "إضافة بنود العقد (BPU)" : "Ajouter des articles (BPU)"}
          </DialogTitle>
        </DialogHeader>

        {/* Toggle Single / Bulk */}
        <div className="flex gap-2 p-4 border-b bg-slate-50 dark:bg-slate-900/40">
          <Button
            type="button"
            variant={mode === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("single")}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            {isAr ? "بند واحد" : "Article unique"}
          </Button>
          <Button
            type="button"
            variant={mode === "bulk" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("bulk")}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isAr ? "إضافة جماعية" : "Import groupé"}
          </Button>
        </div>

        {mode === "single" ? (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-red-500">*</span>
                  {isAr ? "رقم البند" : "N° Article"}
                </Label>
                <Input
                  placeholder="1.1"
                  value={formData.item_number}
                  onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-red-500">*</span>
                  {isAr ? "الوحدة" : "Unité"}
                </Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-bold">
                <span className="text-red-500">*</span>
                {isAr ? "وصف البند / بيان الأشغال" : "Désignation des travaux"}
              </Label>
              <Input
                placeholder={isAr ? "مثال: حفر القواعد صنف 1" : "ex: Fondations classe 1"}
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">{isAr ? "الكمية الاتفاقية" : "Quantité contractuelle"}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {isAr ? "السعر الوحدي (BPU)" : "Prix Unitaire (BPU)"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price || ""}
                  onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                />
              </div>
            </div>

            {formData.quantity > 0 && formData.unit_price > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl flex justify-between items-center border border-blue-100">
                <span className="text-xs font-bold text-blue-600">{isAr ? "المبلغ الإجمالي" : "Montant total"}</span>
                <span className="text-lg font-black text-blue-700">
                  {(formData.quantity * formData.unit_price).toLocaleString()} <span className="text-xs">DZD</span>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAr ? "إضافة البند" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500">
              {isAr ? "أضف عدة بنود في المرة الواحدة" : "Ajoutez plusieurs articles en une fois"}
            </p>

            <div className="space-y-3">
              {bulkItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start border p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm relative group">
                  <button
                    type="button"
                    onClick={() => removeBulkRow(idx)}
                    className="absolute top-2 left-2 text-slate-300 hover:text-red-500 transition-colors"
                    disabled={bulkItems.length <= 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-16">
                    <Input
                      placeholder="#"
                      value={item.item_number}
                      onChange={(e) => updateBulkRow(idx, "item_number", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder={isAr ? "وصف البند" : "Désignation"}
                      value={item.designation}
                      onChange={(e) => updateBulkRow(idx, "designation", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="w-20">
                    <Select value={item.unit} onValueChange={(v) => updateBulkRow(idx, "unit", v)}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="Qté"
                      value={item.quantity || ""}
                      onChange={(e) => updateBulkRow(idx, "quantity", Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="BPU"
                      value={item.unit_price || ""}
                      onChange={(e) => updateBulkRow(idx, "unit_price", Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addBulkRow} className="gap-2 w-full border-dashed">
              <Plus className="w-4 h-4" /> {isAr ? "إضافة سطر" : "Ajouter une ligne"}
            </Button>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100">
              <div className="flex justify-between text-sm font-bold text-blue-700">
                <span>{isAr ? "الإجمالي" : "Total"}</span>
                <span>
                  {bulkItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toLocaleString()} DZD
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</Button>
              <Button type="button" onClick={handleBulkSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAr ? "حفظ الكل" : "Tout enregistrer"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
