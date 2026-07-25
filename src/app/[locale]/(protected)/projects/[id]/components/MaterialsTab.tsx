"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Package, Plus, Trash2, Loader2, DollarSign, Boxes, TrendingDown, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/lib/types/projects";
import { Material, MaterialWithStats, MaterialsSummary } from "@/lib/types/materials";
import { materialsService } from "@/lib/services/materials-service";
import { AddMaterialDialog } from "./AddMaterialDialog";

interface Props {
  project: Project;
  isAr: boolean;
}

export function MaterialsTab({ project, isAr }: Props) {
  const [materials, setMaterials] = useState<MaterialWithStats[]>([]);
  const [summary, setSummary] = useState<MaterialsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Material | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [materialsData, summaryData] = await Promise.all([
        materialsService.getWithStats(project.id),
        materialsService.getSummary(project.id),
      ]);
      setMaterials(materialsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchData();
    const sub = materialsService.subscribe(project.id, () => fetchData(true));
    return () => { if (typeof sub === 'function') sub(); };
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const confirmed = confirm(isAr ? "هل تريد حذف هذه المادة؟" : "Supprimer ce matériel ?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await materialsService.delete(id);
      toast.success(isAr ? "تم الحذف بنجاح" : "Supprimé");
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
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl p-6">
          <h2 className="text-2xl font-bold">{isAr ? "المواد" : "Matériaux"}</h2>
          <p className="text-emerald-100">{isAr ? "إدارة مخزون المواد للمشروع" : "Gestion de l'inventaire matériel"}</p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <Package className="mx-auto w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">
              {isAr ? "لا توجد مواد بعد" : "Aucun matériel"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {isAr
                ? "أضف مواد المشروع لتتمكن من تتبع المخزون والاستهلاك"
                : "Ajoutez les matériaux du projet pour suivre l'inventaire"}
            </p>
            <AddMaterialDialog
              isAr={isAr}
              projectId={project.id}
              onSuccess={() => fetchData(true)}
              trigger={
                <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600">
                  <Plus className="w-4 h-4" />
                  {isAr ? "إضافة مادة" : "Ajouter matériel"}
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
      {/* ─── Edit Dialog (hidden trigger) ─── */}
      <AddMaterialDialog
        isAr={isAr}
        projectId={project.id}
        editItem={editingItem}
        onSuccess={() => { fetchData(true); setEditingItem(null); }}
        trigger={<span className="hidden" />}
      />

      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Package className="w-7 h-7" />
            {isAr ? "المواد" : "Matériaux"}
          </h2>
          <p className="text-emerald-100 mt-1">
            {isAr ? "إدارة مخزون المواد و跟踪 الاستهلاك" : "Suivi de l'inventaire et des consommations"}
          </p>
        </div>
        <AddMaterialDialog
          isAr={isAr}
          projectId={project.id}
          onSuccess={() => fetchData(true)}
          trigger={
            <Button variant="secondary" className="gap-2">
              <Plus className="w-4 h-4" />
              {isAr ? "إضافة مادة" : "Ajouter"}
            </Button>
          }
        />
      </div>

      {/* ─── Summary Cards ─── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "إجمالي المواد" : "Total matériaux"}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {summary.total_materials} <span className="text-[10px] font-normal text-slate-400">{isAr ? "مادة" : "articles"}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "القيمة المتوفرة" : "Valeur disponible"}</p>
                  <p className="text-lg font-black text-blue-600">
                    {summary.total_remaining_value.toLocaleString()} <span className="text-[10px] font-normal">DZD</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "قيمة الاستهلاك" : "Valeur consommée"}</p>
                  <p className="text-lg font-black text-amber-600">
                    {summary.total_consumed_value.toLocaleString()} <span className="text-[10px] font-normal">DZD</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Materials Table ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            {isAr ? "قائمة المواد" : "Liste des matériaux"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                  <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                  <TableHead className="font-bold text-xs">{isAr ? "اسم المادة" : "Nom"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "الوحدة" : "Unité"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "الكمية الأولية" : "Qté initiale"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "المستهلكة" : "Consommée"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "المتبقية" : "Reste"}</TableHead>
                  <TableHead className="text-center font-bold text-xs">{isAr ? "السعر" : "Prix"}</TableHead>
                  <TableHead className="font-bold text-xs">{isAr ? "ملاحظات" : "Notes"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m, idx) => (
                  <TableRow
                    key={m.id}
                    className={`cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/30"}`}
                    onClick={() => setEditingItem(m)}
                  >
                    <TableCell className="text-center text-xs font-bold text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="text-xs font-bold">{m.name}</TableCell>
                    <TableCell className="text-center text-xs">{m.unit}</TableCell>
                    <TableCell className="text-center text-xs font-mono">{m.initial_quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-amber-600">{m.total_consumed.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-emerald-600">{m.remaining_quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs font-mono">{m.unit_price.toLocaleString()} <span className="text-[8px]">DZD</span></TableCell>
                    <TableCell className="text-xs text-slate-400 max-w-[120px] truncate">{m.notes || "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-300 hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                        disabled={deletingId === m.id}
                      >
                        {deletingId === m.id ? (
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
            {materials.map((m) => (
              <div
                key={m.id}
                className="border rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm space-y-3 cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-colors"
                onClick={() => setEditingItem(m)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{m.unit}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-300 hover:text-red-500 shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                    disabled={deletingId === m.id}
                  >
                    {deletingId === m.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{isAr ? "الأولية" : "Initiale"}</p>
                    <p className="text-xs font-mono font-bold">{m.initial_quantity.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-1.5">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{isAr ? "المستهلكة" : "Consommée"}</p>
                    <p className="text-xs font-mono font-bold text-amber-600">{m.total_consumed.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-1.5">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">{isAr ? "المتبقية" : "Reste"}</p>
                    <p className="text-xs font-mono font-bold text-emerald-600">{m.remaining_quantity.toLocaleString()}</p>
                  </div>
                </div>

                {m.unit_price > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{isAr ? "السعر" : "Prix"}</span>
                    <span className="font-mono font-bold">{m.unit_price.toLocaleString()} DZD</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ─── Table Footer Totals ─── */}
          {summary && (
            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "إجمالي القيمة" : "Valeur totale"}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{summary.total_initial_value.toLocaleString()} DZD</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "المستهلك" : "Consommé"}</p>
                  <p className="text-lg font-black text-amber-600">{summary.total_consumed_value.toLocaleString()} DZD</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? "المتبقي" : "Reste"}</p>
                  <p className="text-lg font-black text-emerald-600">{summary.total_remaining_value.toLocaleString()} DZD</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
