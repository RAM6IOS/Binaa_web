"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Pencil, Phone, MapPin, CalendarClock, CheckCircle2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderWithItems, PurchaseOrderStatus, ALLOWED_STATUS_TRANSITIONS } from "@/lib/types/purchase-orders";
import { purchaseOrdersService } from "@/lib/services/purchase-orders-service";
import { CompanyInfo } from "@/lib/services/company-info";
import { PurchaseOrderPDFDownload } from "@/components/purchase-orders/PurchaseOrderPDF";

interface Props {
  isAr: boolean;
  order: PurchaseOrderWithItems | null;
  projectName?: string;
  company?: CompanyInfo;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
}

const statusOptions: { value: PurchaseOrderStatus; labelAr: string; labelFr: string; badge: string }[] = [
  { value: 'draft',     labelAr: 'مسودة',     labelFr: 'Brouillon',  badge: 'bg-muted text-muted-foreground border-border' },
  { value: 'sent',      labelAr: 'مُرسل',     labelFr: 'Envoyé',     badge: 'bg-info/10 text-info border-info/20' },
  { value: 'partial',   labelAr: 'جزئي',      labelFr: 'Partiel',    badge: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'received',  labelAr: 'تم الاستلام', labelFr: 'Reçu',     badge: 'bg-success/10 text-success border-success/20' },
  { value: 'cancelled', labelAr: 'ملغى',      labelFr: 'Annulé',     badge: 'bg-destructive/10 text-destructive border-destructive/20' },
];

const fmtDate = (d: string, isAr: boolean) => {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR');
};

export function PurchaseOrderDetailDialog({ isAr, order, projectName, company, onClose, onChanged, onEdit }: Props) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!order) return null;

  const statusMeta = statusOptions.find(s => s.value === order.status) || statusOptions[0];
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
  const canEditHeader = order.status === 'draft';
  const canDelete = order.status === 'draft';

  const handleStatusChange = async (value: PurchaseOrderStatus) => {
    if (value === order.status) return;
    setIsUpdatingStatus(true);
    try {
      await purchaseOrdersService.updateStatus(order.id, value);
      toast.success(isAr ? "تم تحديث الحالة ✓" : "Statut mis à jour ✓");
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل تحديث الحالة" : "Erreur de mise à jour du statut"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm(isAr ? "هل تريد حذف أمر الطلب هذا؟" : "Supprimer ce bon de commande ?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await purchaseOrdersService.remove(order.id);
      toast.success(isAr ? "تم الحذف ✓" : "Supprimé ✓");
      onClose();
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Erreur de suppression"));
    } finally {
      setIsDeleting(false);
    }
  };

  const total = order.items.reduce((sum, i) => sum + (i.amount_ht || 0), 0);

  return (
    <Dialog open={!!order} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 border-b bg-primary text-primary-foreground flex flex-row items-center justify-between">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {isAr ? "أمر الطلب" : "Bon de commande"} {order.number}
          </DialogTitle>
          <Badge className={`border whitespace-nowrap ${statusMeta.badge}`}>
            {isAr ? statusMeta.labelAr : statusMeta.labelFr}
          </Badge>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* ── معلومات المورد ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 bg-card shadow-sm">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{order.supplier_name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {order.supplier_phone && (
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3" /> {order.supplier_phone}
                    </span>
                  )}
                  {order.supplier_address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {order.supplier_address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:shrink-0 text-xs font-bold text-muted-foreground">
              <div className="text-start">
                <p className="uppercase text-xs">{isAr ? "تاريخ الأمر" : "Date"}</p>
                <p className="tabular-nums">{fmtDate(order.order_date, isAr)}</p>
              </div>
              <div className="text-start">
                <p className="uppercase text-xs flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" /> {isAr ? "التسليم" : "Livraison"}
                </p>
                <p className="tabular-nums">{order.expected_delivery_date ? fmtDate(order.expected_delivery_date, isAr) : '—'}</p>
              </div>
            </div>
          </div>

          {order.notes && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border">
              {order.notes}
            </p>
          )}

          {/* ── جدول البنود (desktop) ── */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-start px-4 py-2.5 font-bold text-xs w-12">#</th>
                  <th className="text-start px-4 py-2.5 font-bold text-xs">{isAr ? "البيان" : "Désignation"}</th>
                  <th className="text-center px-4 py-2.5 font-bold text-xs">{isAr ? "الوحدة" : "Unité"}</th>
                  <th className="text-center px-4 py-2.5 font-bold text-xs">{isAr ? "الكمية" : "Qté"}</th>
                  <th className="text-center px-4 py-2.5 font-bold text-xs">{isAr ? "سعر الوحدة" : "P.U HT"}</th>
                  <th className="text-end px-4 py-2.5 font-bold text-xs">{isAr ? "المبلغ" : "Montant HT"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-primary/5">
                    <td className="px-4 py-2.5 text-xs font-bold text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{item.designation}</td>
                    <td className="px-4 py-2.5 text-xs text-center">{item.unit}</td>
                    <td className="px-4 py-2.5 text-xs text-center font-mono">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-center font-mono">{item.unit_price_ht.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-end font-mono">{item.amount_ht.toLocaleString()} DZD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── بطاقات البنود (mobile) ── */}
          <div className="md:hidden space-y-2">
            {order.items.map((item, idx) => (
              <div key={item.id} className="rounded-lg border border-border p-3 bg-card shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-bold text-foreground">{item.designation}</p>
                  <span className="text-xs font-bold text-primary tabular-nums shrink-0">{item.amount_ht.toLocaleString()} DZD</span>
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>{item.quantity.toLocaleString()} {item.unit}</span>
                  <span className="font-mono">× {item.unit_price_ht.toLocaleString()} DZD</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── الإجماليات ── */}
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">{isAr ? "HT" : "HT"}</p>
              <p className="font-bold tabular-nums">{total.toLocaleString()} <span className="text-xs">DZD</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">{isAr ? "TVA" : "TVA"}</p>
              <p className="font-bold tabular-nums">{(order.total_tva || 0).toLocaleString()} <span className="text-xs">DZD</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">{isAr ? "TTC" : "TTC"}</p>
              <p className="font-bold text-success tabular-nums">{(order.total_ttc || 0).toLocaleString()} <span className="text-xs">DZD</span></p>
            </div>
          </div>

          {/* ── تغيير الحالة ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4 bg-card shadow-sm">
            <span className="text-xs font-bold text-muted-foreground uppercase shrink-0">
              {isAr ? "الحالة" : "Statut"}
            </span>
            {allowedTransitions.length > 0 ? (
              <Select value={order.status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                <SelectTrigger className="flex-1 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions
                    .filter(s => s.value === order.status || allowedTransitions.includes(s.value))
                    .map(s => (
                      <SelectItem key={s.value} value={s.value}>{isAr ? s.labelAr : s.labelFr}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={`border ${statusMeta.badge}`}>
                {isAr ? statusMeta.labelAr : statusMeta.labelFr}
              </Badge>
            )}

            <div className="flex flex-wrap gap-2 shrink-0">
              <PurchaseOrderPDFDownload order={order} projectName={projectName} company={company} isAr={isAr}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileDown className="w-3.5 h-3.5" /> {isAr ? "تحميل PDF" : "PDF"}
                </Button>
              </PurchaseOrderPDFDownload>
              {canEditHeader && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> {isAr ? "تعديل" : "Modifier"}
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting} className="gap-1.5 text-destructive hover:text-destructive">
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {isAr ? "حذف" : "Supprimer"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}