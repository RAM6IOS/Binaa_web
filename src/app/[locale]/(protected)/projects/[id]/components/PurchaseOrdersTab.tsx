"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Plus, Loader2, Package, RefreshCcw, AlertCircle } from "lucide-react";
import { Project } from "@/lib/types/projects";
import { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderWithItems } from "@/lib/types/purchase-orders";
import { purchaseOrdersService } from "@/lib/services/purchase-orders-service";
import { resolveCompanyInfo } from "@/lib/services/company-info";
import { PurchaseOrderFormDialog } from "./PurchaseOrderFormDialog";
import { PurchaseOrderDetailDialog } from "./PurchaseOrderDetailDialog";

interface Props {
  project: Project;
  isAr: boolean;
}

const statusMeta: Record<PurchaseOrderStatus, { labelAr: string; labelFr: string; badge: string }> = {
  draft:     { labelAr: 'مسودة',      labelFr: 'Brouillon',  badge: 'bg-muted text-muted-foreground border-border' },
  sent:      { labelAr: 'مُرسل',      labelFr: 'Envoyé',     badge: 'bg-info/10 text-info border-info/20' },
  partial:   { labelAr: 'جزئي',       labelFr: 'Partiel',    badge: 'bg-warning/10 text-warning border-warning/20' },
  received:  { labelAr: 'تم الاستلام', labelFr: 'Reçu',      badge: 'bg-success/10 text-success border-success/20' },
  cancelled: { labelAr: 'ملغى',       labelFr: 'Annulé',     badge: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const fmtDate = (d: string, isAr: boolean) => {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR');
};

export function PurchaseOrdersTab({ project, isAr }: Props) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // التفاصيل: أمر معيّن + بنوده
  const [detailOrder, setDetailOrder] = useState<PurchaseOrderWithItems | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // وضع التعديل من داخل التفاصيل (ممرر لنموذج منفصل)
  const [editOrder, setEditOrder] = useState<PurchaseOrderWithItems | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await purchaseOrdersService.listByProject(project.id);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchOrders();
    const sub = purchaseOrdersService.subscribe(project.id, () => fetchOrders(true));
    return () => { if (typeof sub === 'function') sub(); };
  }, [fetchOrders]);

  const openDetail = async (order: PurchaseOrder) => {
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const full = await purchaseOrdersService.getById(order.id);
      setDetailOrder(full);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditFromDetail = () => {
    // نسخ الأمر كاملاً إلى النموذج ثم إغلاق التفاصيل
    setEditOrder(detailOrder);
    setDetailOrder(null);
  };

  // ── حالات التحميل ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="p-5 bg-destructive/10 rounded-lg text-destructive"><AlertCircle size={40} /></div>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={() => fetchOrders()} className="gap-2">
          <RefreshCcw size={16} /> {isAr ? "إعادة المحاولة" : "Réessayer"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Hero ─── */}
      <div className="bg-inverse text-inverse-foreground rounded-lg p-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-7 h-7" />
            {isAr ? "أوامر الطلب" : "Bons de commande"}
          </h2>
          <p className="text-primary-foreground/70 mt-1">
            {isAr ? "طلبات المواد والخدمات من المورّدين" : "Demandes de matériaux et services auprès des fournisseurs"}
          </p>
        </div>
        <PurchaseOrderFormDialog
          isAr={isAr}
          projectId={project.id}
          onSuccess={() => fetchOrders(true)}
          trigger={
            <Button variant="secondary" className="gap-2">
              <Plus className="w-4 h-4" />
              {isAr ? "أمر جديد" : "Nouveau BC"}
            </Button>
          }
        />
      </div>

      {/* ─── Empty State ─── */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground mb-2">
              {isAr ? "لا توجد أوامر طلب بعد" : "Aucun bon de commande"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {isAr
                ? "أنشئ أمر طلب لبدء تتبع طلبات المواد والخدمات من المورّدين"
                : "Créez un bon de commande pour suivre les demandes de matériaux et services"}
            </p>
            <PurchaseOrderFormDialog
              isAr={isAr}
              projectId={project.id}
              onSuccess={() => fetchOrders(true)}
              trigger={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isAr ? "إنشاء أمر الطلب الأول" : "Créer le premier BC"}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {isAr ? "قائمة أوامر الطلب" : "Liste des bons de commande"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="font-bold text-xs">{isAr ? "الرقم" : "N°"}</TableHead>
                    <TableHead className="font-bold text-xs">{isAr ? "التاريخ" : "Date"}</TableHead>
                    <TableHead className="font-bold text-xs">{isAr ? "المورّد" : "Fournisseur"}</TableHead>
                    <TableHead className="text-center font-bold text-xs">{isAr ? "المجموع TTC" : "Total TTC"}</TableHead>
                    <TableHead className="font-bold text-xs">{isAr ? "الحالة" : "Statut"}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => openDetail(order)}
                    >
                      <TableCell className="font-mono font-bold text-xs">{order.number}</TableCell>
                      <TableCell className="text-xs tabular-nums">{fmtDate(order.order_date, isAr)}</TableCell>
                      <TableCell className="text-xs font-medium">{order.supplier_name}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs">
                        {(order.total_ttc || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">DZD</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border ${statusMeta[order.status].badge}`}>
                          {isAr ? statusMeta[order.status].labelAr : statusMeta[order.status].labelFr}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Package className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => openDetail(order)}
                  className="border rounded-lg p-4 bg-card shadow-sm space-y-2.5 cursor-pointer hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono font-bold text-sm text-foreground">{order.number}</p>
                    <Badge className={`border ${statusMeta[order.status].badge}`}>
                      {isAr ? statusMeta[order.status].labelAr : statusMeta[order.status].labelFr}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">{order.supplier_name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">{fmtDate(order.order_date, isAr)}</span>
                    <span className="font-mono font-bold text-success">
                      {(order.total_ttc || 0).toLocaleString()} <span className="text-xs">DZD</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── تفاصيل أمر الطلب ─── */}
      {detailLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      <PurchaseOrderDetailDialog
        isAr={isAr}
        order={detailOrder}
        projectName={project.name}
        company={resolveCompanyInfo(project)}
        onClose={() => setDetailOrder(null)}
        onChanged={() => { fetchOrders(true); }}
        onEdit={handleEditFromDetail}
      />

      {/* ─── نموذج التعديل (مخفي — يُفتح تلقائياً عند تمرير editOrder) ─── */}
      <PurchaseOrderFormDialog
        isAr={isAr}
        projectId={project.id}
        editOrder={editOrder}
        onSuccess={() => { fetchOrders(true); setEditOrder(null); }}
        trigger={<span className="hidden" />}
      />
    </div>
  );
}