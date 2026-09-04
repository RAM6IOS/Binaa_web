"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2, ShoppingCart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  PurchaseOrderWithItems, CreatePurchaseOrderInput, CreatePurchaseOrderItemInput,
} from "@/lib/types/purchase-orders";
import { purchaseOrdersService } from "@/lib/services/purchase-orders-service";

interface Props {
  isAr: boolean;
  projectId: string;
  editOrder?: PurchaseOrderWithItems | null;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const units = ["u", "m", "m²", "m³", "kg", "t", "sac", "barre", "litre"];

interface FormItem {
  designation: string;
  unit: string;
  quantity: number;
  unit_price_ht: number;
}

/** حساب الإجماليات من بنود النموذج. */
function computeTotals(items: FormItem[], tvaRate: number) {
  const total_ht = items.reduce((sum, i) => sum + (i.quantity * i.unit_price_ht), 0);
  const total_tva = total_ht * (tvaRate / 100);
  return { total_ht, total_tva, total_ttc: total_ht + total_tva };
}

export function PurchaseOrderFormDialog({ isAr, projectId, editOrder, onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [tvaRate, setTvaRate] = useState(19);
  const [items, setItems] = useState<FormItem[]>([
    { designation: "", unit: "u", quantity: 1, unit_price_ht: 0 },
  ]);

  const resetForm = useCallback(() => {
    setSupplierName("");
    setSupplierPhone("");
    setSupplierAddress("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDelivery("");
    setNotes("");
    setTvaRate(19);
    setItems([{ designation: "", unit: "u", quantity: 1, unit_price_ht: 0 }]);
  }, []);

  useEffect(() => {
    if (editOrder) {
      setSupplierName(editOrder.supplier_name);
      setSupplierPhone(editOrder.supplier_phone || "");
      setSupplierAddress(editOrder.supplier_address || "");
      setOrderDate(editOrder.order_date || new Date().toISOString().slice(0, 10));
      setExpectedDelivery(editOrder.expected_delivery_date || "");
      setNotes(editOrder.notes || "");
      setTvaRate(editOrder.tva_rate ?? 19);
      setItems(editOrder.items.map(i => ({
        designation: i.designation,
        unit: i.unit,
        quantity: i.quantity,
        unit_price_ht: i.unit_price_ht,
      })));
      setOpen(true);
    } else {
      resetForm();
    }
  }, [editOrder, resetForm]);

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const addItemRow = () => {
    setItems(prev => [...prev, { designation: "", unit: "u", quantity: 1, unit_price_ht: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const validItems = items.filter(i => i.designation.trim());

  // دفاع إضافي: النموذج قابل للتعديل فقط في حالة المسودة
  const isLocked = !!editOrder && editOrder.status !== 'draft';

  const handleSubmit = async () => {
    if (isLocked) {
      toast.error(isAr ? "لا يمكن تعديل أمر طلب غير مسودة" : "Seul un brouillon peut être modifié");
      return;
    }

    if (!supplierName.trim()) {
      toast.error(isAr ? "اسم المورد إلزامي" : "Le nom du fournisseur est requis");
      return;
    }

    if (validItems.length === 0) {
      toast.error(isAr ? "أضف بنداً واحداً على الأقل" : "Ajoutez au moins un article");
      return;
    }

    setIsLoading(true);
    try {
      const itemPayload: CreatePurchaseOrderItemInput[] = validItems.map((it, idx) => ({
        designation: it.designation,
        unit: it.unit,
        quantity: it.quantity || 0,
        unit_price_ht: it.unit_price_ht || 0,
        sort_order: idx,
      }));

      if (editOrder) {
        // تحديث الرأس، ثم استبدال البنود
        await purchaseOrdersService.update(editOrder.id, {
          supplier_name: supplierName,
          supplier_phone: supplierPhone || null,
          supplier_address: supplierAddress || null,
          order_date: orderDate,
          expected_delivery_date: expectedDelivery || null,
          notes: notes || null,
          tva_rate: tvaRate,
        });

        // حذف البنود الحالية وإعادة إنشائها (بسيط ومناسب لـ MVP)
        for (const oldItem of editOrder.items) {
          await purchaseOrdersService.deleteItem(oldItem.id);
        }
        for (const item of itemPayload) {
          await purchaseOrdersService.addItem(editOrder.id, projectId, item);
        }
        await purchaseOrdersService.recalculateTotals(editOrder.id);

        toast.success(isAr ? "تم تحديث أمر الطلب ✓" : "Bon de commande mis à jour ✓");
      } else {
        const input: CreatePurchaseOrderInput = {
          project_id: projectId,
          order_date: orderDate,
          supplier_name: supplierName,
          supplier_phone: supplierPhone || null,
          supplier_address: supplierAddress || null,
          expected_delivery_date: expectedDelivery || null,
          notes: notes || null,
          tva_rate: tvaRate,
          items: itemPayload,
        };
        await purchaseOrdersService.create(input);
        toast.success(isAr ? "تم إنشاء أمر الطلب ✓" : "Bon de commande créé ✓");
      }

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('already exists')) {
        toast.error(isAr ? "رقم أمر الطلب موجود مسبقاً" : "Numéro de BC déjà existant");
      } else {
        toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Erreur lors de l'enregistrement");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totals = computeTotals(validItems, tvaRate);

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 border-b bg-primary text-primary-foreground">
          <DialogTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {editOrder
              ? (isAr ? `تعديل أمر الطلب ${editOrder.number}` : `Modifier le BC ${editOrder.number}`)
              : (isAr ? "إنشاء أمر طلب جديد" : "Nouveau bon de commande")}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* ── تفاصيل المورد ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b pb-2">
              {isAr ? "المُورّد" : "Fournisseur"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  <span className="text-destructive">*</span> {isAr ? "اسم المورد" : "Nom du fournisseur"}
                </Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={isAr ? "مثال: شركة مواد البناء" : "ex: Société de matériaux"}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">{isAr ? "الهاتف" : "Téléphone"}</Label>
                <Input
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder={isAr ? "06..." : "06..."}
                  dir="ltr"
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-bold">{isAr ? "العنوان" : "Adresse"}</Label>
                <Input
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder={isAr ? "ولاية، بلدية..." : "Wilaya, commune..."}
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {/* ── التواريخ والإجماليات ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">{isAr ? "تاريخ الأمر" : "Date de commande"}</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} disabled={isLocked} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">{isAr ? "تاريخ التسليم المتوقع" : "Livraison souhaitée"}</Label>
              <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} disabled={isLocked} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">{isAr ? "TVA %" : "TVA %"}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={tvaRate}
                onChange={(e) => setTvaRate(Number(e.target.value) || 0)}
                disabled={isLocked}
              />
            </div>
          </div>

          {/* ── البنود ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground border-b pb-1">
                {isAr ? "البنود" : "Articles"}
              </h3>
              {!isLocked && (
                <Button type="button" variant="outline" size="sm" onClick={addItemRow} className="gap-1.5">
                  <Plus className="w-4 h-4" /> {isAr ? "إضافة سطر" : "Ajouter une ligne"}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg bg-card shadow-sm">
                  {/* Désignation */}
                  <div className="col-span-12 sm:col-span-4">
                    <Input
                      placeholder={isAr ? "البيان" : "Désignation"}
                      value={item.designation}
                      onChange={(e) => updateItem(idx, "designation", e.target.value)}
                      className="text-xs"
                      disabled={isLocked}
                    />
                  </div>
                  {/* Unité */}
                  <div className="col-span-3 sm:col-span-2">
                    <Select value={item.unit} disabled={isLocked} onValueChange={(v) => updateItem(idx, "unit", v)}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Quantité */}
                  <div className="col-span-3 sm:col-span-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Qté"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                      className="text-xs"
                      disabled={isLocked}
                    />
                  </div>
                  {/* Prix */}
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="P.U HT"
                      value={item.unit_price_ht || ""}
                      onChange={(e) => updateItem(idx, "unit_price_ht", Number(e.target.value))}
                      className="text-xs"
                      disabled={isLocked}
                    />
                  </div>
                  {/* Montant */}
                  <div className="col-span-1 sm:col-span-1.5 text-left sm:text-center">
                    <span className="text-xs font-bold text-primary tabular-nums">
                      {(item.quantity * item.unit_price_ht).toLocaleString()}
                    </span>
                  </div>
                  {/* حذف */}
                  {!isLocked && (
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {validItems.length === 0 && (
              <p className="text-xs text-warning flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isAr ? "أضف بنداً واحداً على الأقل قبل الحفظ" : "Ajoutez au moins un article avant d'enregistrer"}
              </p>
            )}
          </div>

          {/* ── الملاحظات ── */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">{isAr ? "ملاحظات" : "Notes"}</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLocked} />
          </div>

          {/* ── الإجماليات ── */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">{isAr ? "المجموع HT" : "Total HT"}</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{totals.total_ht.toLocaleString()} <span className="text-xs">DZD</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">{isAr ? "TVA" : "TVA"}</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{totals.total_tva.toLocaleString()} <span className="text-xs">DZD</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">{isAr ? "المجموع TTC" : "Total TTC"}</p>
              <p className="text-lg font-bold text-success tabular-nums">{totals.total_ttc.toLocaleString()} <span className="text-xs">DZD</span></p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {isAr ? "إلغاء" : "Annuler"}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || isLocked}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLocked
              ? (isAr ? "قراءة فقط" : "Lecture seule")
              : (editOrder
                  ? (isAr ? "حفظ التعديلات" : "Enregistrer les modifications")
                  : (isAr ? "إنشاء أمر الطلب" : "Créer le bon de commande"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}