"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CalendarClock, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Ruler, Plus, Trash2, Loader2, TrendingUp, DollarSign, FileText,
  BarChart3, CheckCircle2, AlertTriangle, Download, Package, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/lib/types/projects";
import { ContractItem, ContractItemWithProgress, MetresSummary } from "@/lib/types/metres";
import { metresService } from "@/lib/services/metres-service";
import { contractItemsService } from "@/lib/services/contract-items-service";
import { AddContractItemDialog } from "./AddContractItemDialog";
import { ImportContractItemsDialog } from "@/components/metres/ImportContractItemsDialog";
import { SituationPDFDownload } from "@/components/daily-log/SituationPDF";

interface Props {
  project: Project;
  isAr: boolean;
}

export function MetresTab({ project, isAr }: Props) {
  const [items, setItems] = useState<ContractItemWithProgress[]>([]);
  const [summary, setSummary] = useState<MetresSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ContractItemWithProgress | null>(null);

  // ── فلتر الفترة الزمنية ──
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const isFiltered = dateFrom !== "" || dateTo !== "";

  const clearFilter = () => { setDateFrom(""); setDateTo(""); };

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const from = dateFrom || undefined;
      const to   = dateTo   || undefined;
      const [itemsData, summaryData] = await Promise.all([
        metresService.getItemsWithProgress(project.id, from, to),
        metresService.getSummary(project.id, from, to),
      ]);
      setItems(itemsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("Failed to fetch metres data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [project.id, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
    const sub = metresService.subscribe(project.id, () => fetchData(true));
    return () => { if (typeof sub === 'function') sub(); };
  }, [fetchData]);

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = confirm(isAr ? "هل تريد حذف هذا البند وجميع تسجيلاته؟" : "Supprimer cet article et tous ses métrés ?");
    if (!confirmed) return;

    setDeletingId(itemId);
    try {
      await contractItemsService.delete(itemId);
      toast.success(isAr ? "تم الحذف بنجاح" : "Supprimé avec succès");
      fetchData(true);
    } catch {
      toast.error(isAr ? "فشل الحذف" : "Échec de suppression");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-inverse text-inverse-foreground rounded-lg p-6">
          <h2 className="text-2xl font-bold">{isAr ? "الكميات المنجزة (Mètres)" : "Situation des Métrés"}</h2>
          <p className="text-primary-foreground/70">{isAr ? "إدارة بنود العقد و跟踪 الكميات المنجزة" : "Suivi des quantités réalisées"}</p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <Package className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground mb-2">
              {isAr ? "لا توجد بنود عقد بعد" : "Aucun article de contrat"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {isAr
                ? "أضف بنود العقد (BPU) لتتمكن من تتبع الكميات المنجزة"
                : "Ajoutez les articles du bordereau (BPU) pour suivre les quantités réalisées"}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <AddContractItemDialog
                isAr={isAr}
                projectId={project.id}
                onSuccess={() => fetchData(true)}
                trigger={
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    {isAr ? "إضافة بنود العقد" : "Ajouter les articles BPU"}
                  </Button>
                }
              />
              <ImportContractItemsDialog
                isAr={isAr}
                projectId={project.id}
                onSuccess={() => fetchData(true)}
                existingItems={items}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Edit Dialog (hidden trigger) ─── */}
      <AddContractItemDialog
        isAr={isAr}
        projectId={project.id}
        editItem={editingItem}
        onSuccess={() => { fetchData(true); setEditingItem(null); }}
        trigger={<span className="hidden" />}
      />
      {/* ─── Hero ─── */}
      <div className="bg-inverse text-inverse-foreground rounded-lg p-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Ruler className="w-7 h-7" />
            {isAr ? "الكميات المنجزة" : "Situation des Métrés"}
          </h2>
          <p className="text-primary-foreground/70 mt-1">
            {isAr ? "متابعة بنود العقد والكميات المنجزة" : "Suivi des articles contractuels et quantités réalisées"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AddContractItemDialog
            isAr={isAr}
            projectId={project.id}
            onSuccess={() => fetchData(true)}
            trigger={
              <Button variant="secondary" className="gap-2">
                <Plus className="w-4 h-4" />
                {isAr ? "إضافة بند" : "Ajouter article"}
              </Button>
            }
          />
          <ImportContractItemsDialog
            isAr={isAr}
            projectId={project.id}
            onSuccess={() => fetchData(true)}
            existingItems={items}
            trigger={
              <Button variant="secondary" className="gap-2">
                <FileSpreadsheet className="w-4 h-4 text-success" />
                {isAr ? "استيراد" : "Importer"}
              </Button>
            }
          />
          <SituationPDFDownload items={items} summary={summary} project={project} isAr={isAr}>
            <Button variant="secondary" className="gap-2">
              <FileText className="w-4 h-4" />
              PDF
            </Button>
          </SituationPDFDownload>
        </div>
      </div>

      {/* ─── فلتر الفترة الزمنية ─── */}
      <Card className="p-4 rounded-lg border-border shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          {/* عنوان الفترة */}
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">{isAr ? "الفترة الزمنية" : "Période"}</span>
          </div>

          {/* Du – Au */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center lg:gap-2 lg:flex-1 lg:min-w-0">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              aria-label={isAr ? "من تاريخ" : "Du"}
              className="h-11 md:h-10 w-full text-xs lg:w-40"
            />
            <span className="hidden lg:inline text-muted-foreground text-sm select-none">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              aria-label={isAr ? "إلى تاريخ" : "Au"}
              className="h-11 md:h-10 w-full text-xs lg:w-40"
            />
          </div>

          {/* إعادة ضبط */}
          <div className="flex items-center gap-2 lg:justify-end shrink-0">
            {isFiltered && (
              <Button
                variant="outline"
                onClick={clearFilter}
                className="h-11 md:h-10 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/10 dark:hover:bg-destructive/30 dark:hover:border-destructive shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                {isAr ? "إعادة ضبط" : "Réinitialiser"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Summary Cards ─── */}
      {summary && (
        <div>
          {isFiltered && (
            <div className="mb-3">
              <Badge variant="info" className="gap-1.5 px-3 py-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                {isAr ? "حسب الفترة" : "Selon la période"}
                {(dateFrom || dateTo) && (
                  <span className="font-mono text-xs font-medium text-primary">
                    {dateFrom || "…"} – {dateTo || "…"}
                  </span>
                )}
              </Badge>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "قيمة العقد" : "Valeur contrat"}</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.total_contract_value.toLocaleString()} <span className="text-xs font-normal">DZD</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg text-success">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "القيمة المنجزة" : "Montant réalisé"}</p>
                  <p className="text-lg font-bold text-success">
                    {summary.total_achieved_value.toLocaleString()} <span className="text-xs font-normal">DZD</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "نسبة الإنجاز" : "Taux réalisation"}</p>
                  <p className="text-lg font-bold text-primary">{summary.overall_progress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg text-warning">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "بنود مكتملة" : "Articles terminés"}</p>
                  <p className="text-lg font-bold text-warning">
                    {summary.completed_items} <span className="text-xs font-normal text-muted-foreground">/ {summary.total_items}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* ─── Overall Progress Bar ─── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold">{isAr ? "نسبة الإنجاز العامة" : "Avancement global"}</span>
            <span className="text-lg font-bold text-primary">{summary?.overall_progress || 0}%</span>
          </div>
          <Progress value={summary?.overall_progress || 0} className="h-3" />
        </CardContent>
      </Card>

      {/* ─── Items Table ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-primary" />
            {isAr ? "بنود العقد والكميات المنجزة" : "Détail des articles et métrés"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-16 text-center font-bold text-xs">#</TableHead>
                  <TableHead className="font-bold text-xs">{isAr ? "رقم البند" : "N° Art"}</TableHead>
                  <TableHead className="font-bold text-xs">{isAr ? "وصف البند" : "Désignation"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "الوحدة" : "Unité"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "الكمية العقدية" : "Qté contractuelle"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "الكمية المنجزة" : "Qté réalisée"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "النسبة" : "Progression"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "السعر الوحدي" : "Prix unitaire"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "المبلغ المنجز" : "Montant réalisé"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "المتبقي" : "Reste"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-primary/10 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/50"}`}
                    onClick={() => setEditingItem(item)}
                  >
                    <TableCell className="text-center text-xs font-bold text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono font-bold text-xs">{item.item_number}</TableCell>
                    <TableCell className="text-xs font-medium max-w-48 truncate">{item.designation}</TableCell>
                    <TableCell className="text-center text-xs">{item.unit}</TableCell>
                    <TableCell className="text-center text-xs font-mono">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-primary">{item.total_achieved.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={item.progress_percent} className="h-2 flex-1" />
                        <span className={`text-xs font-bold ${
                          item.progress_percent >= 100 ? 'text-success' :
                          item.progress_percent >= 50 ? 'text-primary' :
                          item.progress_percent > 0 ? 'text-warning' : 'text-muted-foreground'
                        }`}>
                          {item.progress_percent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-success">
                      {item.achieved_amount.toLocaleString()} <span className="text-xs">DZD</span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-destructive">
                      {item.remaining_quantity > 0 ? item.remaining_quantity.toLocaleString() : (
                        <CheckCircle2 className="w-4 h-4 text-success inline" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-card shadow-sm space-y-3 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => setEditingItem(item)}
              >
                {/* Top: designation + delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{item.designation}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {isAr ? "بند رقم" : "Art"} {item.item_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                {/* Key stats: achieved qty + progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-primary">{item.total_achieved.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground font-bold">{item.unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">{isAr ? "المنجز" : "Réalisé"}</p>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center gap-1.5">
                      <Progress value={item.progress_percent} className="h-2 flex-1" />
                      <span className={`text-xs font-bold ${
                        item.progress_percent >= 100 ? 'text-success' :
                        item.progress_percent >= 50 ? 'text-primary' :
                        item.progress_percent > 0 ? 'text-warning' : 'text-muted-foreground'
                      }`}>
                        {item.progress_percent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-1.5">
                    <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "العقدية" : "Contractuelle"}</p>
                    <p className="text-xs font-mono font-bold">{item.quantity.toLocaleString()}</p>
                  </div>
                  <div className="bg-success/10 rounded-lg p-1.5">
                    <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "المبلغ" : "Montant"}</p>
                    <p className="text-xs font-mono font-bold text-success">{item.achieved_amount.toLocaleString()} <span className="text-xs">DZD</span></p>
                  </div>
                  <div className="bg-muted rounded-lg p-1.5">
                    <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "المتبقي" : "Reste"}</p>
                    <p className="text-xs font-mono font-bold text-destructive">
                      {item.remaining_quantity > 0 ? item.remaining_quantity.toLocaleString() : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success inline" />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Table Footer Totals ─── */}
          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "إجمالي العقد" : "Total contrat"}</p>
                <p className="text-lg font-bold text-foreground">{summary?.total_contract_value.toLocaleString()} DZD</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "إجمالي المنجز" : "Total réalisé"}</p>
                <p className="text-lg font-bold text-success">{summary?.total_achieved_value.toLocaleString()} DZD</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{isAr ? "المتبقي" : "Reste à réaliser"}</p>
                <p className="text-lg font-bold text-destructive">
                  {((summary?.total_contract_value || 0) - (summary?.total_achieved_value || 0)).toLocaleString()} DZD
                </p>
              </div>
            </div>

            <SituationPDFDownload items={items} summary={summary} project={project} isAr={isAr}>
              <Button className="gap-2">
                <Download className="w-4 h-4" />
                {isAr ? "تحميل Situation PDF" : "Télécharger Situation PDF"}
              </Button>
            </SituationPDFDownload>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
