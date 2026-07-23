"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
  BarChart3, CheckCircle2, AlertTriangle, Download, Package,
} from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/lib/types/projects";
import { ContractItem, ContractItemWithProgress, MetresSummary } from "@/lib/types/metres";
import { metresService } from "@/lib/services/metres-service";
import { contractItemsService } from "@/lib/services/contract-items-service";
import { AddContractItemDialog } from "./AddContractItemDialog";

const SituationPDFDownload = dynamic(() => import("@/components/daily-log/SituationPDF").then(m => m.SituationPDFDownload), { ssr: false });

interface Props {
  project: Project;
  isAr: boolean;
}

export function MetresTab({ project, isAr }: Props) {
  const [items, setItems] = useState<ContractItemWithProgress[]>([]);
  const [summary, setSummary] = useState<MetresSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [itemsData, summaryData] = await Promise.all([
        metresService.getItemsWithProgress(project.id),
        metresService.getSummary(project.id),
      ]);
      setItems(itemsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("Failed to fetch metres data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-2xl p-6">
          <h2 className="text-2xl font-bold">{isAr ? "الكميات المنجزة (Mètres)" : "Situation des Métrés"}</h2>
          <p className="text-blue-100">{isAr ? "إدارة بنود العقد و跟踪 الكميات المنجزة" : "Suivi des quantités réalisées"}</p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <Package className="mx-auto w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">
              {isAr ? "لا توجد بنود عقد بعد" : "Aucun article de contrat"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {isAr
                ? "أضف بنود العقد (BPU) لتتمكن من تتبع الكميات المنجزة"
                : "Ajoutez les articles du bordereau (BPU) pour suivre les quantités réalisées"}
            </p>
            <AddContractItemDialog
              isAr={isAr}
              projectId={project.id}
              onSuccess={() => fetchData(true)}
              trigger={
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Plus className="w-4 h-4" />
                  {isAr ? "إضافة بنود العقد" : "Ajouter les articles BPU"}
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Ruler className="w-7 h-7" />
            {isAr ? "الكميات المنجزة" : "Situation des Métrés"}
          </h2>
          <p className="text-blue-100 mt-1">
            {isAr ? "متابعة بنود العقد والكميات المنجزة" : "Suivi des articles contractuels et quantités réalisées"}
          </p>
        </div>
        <div className="flex gap-3">
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
          <SituationPDFDownload items={items} summary={summary} project={project} isAr={isAr}>
            <Button variant="secondary" className="gap-2">
              <FileText className="w-4 h-4" />
              PDF
            </Button>
          </SituationPDFDownload>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "قيمة العقد" : "Valeur contrat"}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {summary.total_contract_value.toLocaleString()} <span className="text-[10px] font-normal">DZD</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl text-green-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "القيمة المنجزة" : "Montant réalisé"}</p>
                  <p className="text-lg font-black text-green-600">
                    {summary.total_achieved_value.toLocaleString()} <span className="text-[10px] font-normal">DZD</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "نسبة الإنجاز" : "Taux réalisation"}</p>
                  <p className="text-lg font-black text-purple-600">{summary.overall_progress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "بنود مكتملة" : "Articles terminés"}</p>
                  <p className="text-lg font-black text-amber-600">
                    {summary.completed_items} <span className="text-xs font-normal text-slate-400">/ {summary.total_items}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Overall Progress Bar ─── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold">{isAr ? "نسبة الإنجاز العامة" : "Avancement global"}</span>
            <span className="text-lg font-black text-blue-600">{summary?.overall_progress || 0}%</span>
          </div>
          <Progress value={summary?.overall_progress || 0} className="h-3" />
        </CardContent>
      </Card>

      {/* ─── Items Table ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-blue-600" />
            {isAr ? "بنود العقد والكميات المنجزة" : "Détail des articles et métrés"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/60">
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
                  <TableRow key={item.id} className={idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/30"}>
                    <TableCell className="text-center text-xs font-bold text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-mono font-bold text-xs">{item.item_number}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{item.designation}</TableCell>
                    <TableCell className="text-center text-xs">{item.unit}</TableCell>
                    <TableCell className="text-center text-xs font-mono">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-blue-600">{item.total_achieved.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={item.progress_percent} className="h-2 flex-1" />
                        <span className={`text-[10px] font-bold ${
                          item.progress_percent >= 100 ? 'text-green-600' :
                          item.progress_percent >= 50 ? 'text-blue-600' :
                          item.progress_percent > 0 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {item.progress_percent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-green-600">
                      {item.achieved_amount.toLocaleString()} <span className="text-[8px]">DZD</span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-red-500">
                      {item.remaining_quantity > 0 ? item.remaining_quantity.toLocaleString() : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-300 hover:text-red-500"
                        onClick={() => handleDeleteItem(item.id)}
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
              <div key={item.id} className="border rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                {/* Top: designation + delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.designation}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {isAr ? "بند رقم" : "Art"} {item.item_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-300 hover:text-red-500 shrink-0"
                    onClick={() => handleDeleteItem(item.id)}
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
                      <span className="text-lg font-black text-blue-600">{item.total_achieved.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "المنجز" : "Réalisé"}</p>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center gap-1.5">
                      <Progress value={item.progress_percent} className="h-2 flex-1" />
                      <span className={`text-[10px] font-bold ${
                        item.progress_percent >= 100 ? 'text-green-600' :
                        item.progress_percent >= 50 ? 'text-blue-600' :
                        item.progress_percent > 0 ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {item.progress_percent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{isAr ? "العقدية" : "Contractuelle"}</p>
                    <p className="text-xs font-mono font-bold">{item.quantity.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-1.5">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{isAr ? "المبلغ" : "Montant"}</p>
                    <p className="text-xs font-mono font-bold text-green-600">{item.achieved_amount.toLocaleString()} <span className="text-[8px]">DZD</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{isAr ? "المتبقي" : "Reste"}</p>
                    <p className="text-xs font-mono font-bold text-red-500">
                      {item.remaining_quantity > 0 ? item.remaining_quantity.toLocaleString() : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline" />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Table Footer Totals ─── */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "إجمالي العقد" : "Total contrat"}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{summary?.total_contract_value.toLocaleString()} DZD</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "إجمالي المنجز" : "Total réalisé"}</p>
                <p className="text-lg font-black text-green-600">{summary?.total_achieved_value.toLocaleString()} DZD</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "المتبقي" : "Reste à réaliser"}</p>
                <p className="text-lg font-black text-red-500">
                  {((summary?.total_contract_value || 0) - (summary?.total_achieved_value || 0)).toLocaleString()} DZD
                </p>
              </div>
            </div>

            <SituationPDFDownload items={items} summary={summary} project={project} isAr={isAr}>
              <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
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
