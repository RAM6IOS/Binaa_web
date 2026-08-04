"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Project } from "@/lib/types/projects";
import { WorkSituation } from "@/lib/types/situations";
import { situationsService } from "@/lib/services/situations-service";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, Eye, Printer, Calendar, Landmark, CheckCircle2, Clock } from "lucide-react";
import { CreateSituationDialog } from "@/components/situations/CreateSituationDialog";
import { SituationDetailScreen } from "@/components/situations/SituationDetailScreen";
import { SituationOfficialPDFDownload } from "@/components/situations/SituationOfficialPDF";
import { toast } from "sonner";

interface SituationsTabProps {
  project: Project;
  isAr: boolean;
}

export function SituationsTab({ project, isAr }: SituationsTabProps) {
  const [situations, setSituations] = useState<WorkSituation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null);

  const fetchSituations = useCallback(async () => {
    try {
      const data = await situationsService.getByProject(project.id);
      setSituations(data);
    } catch (err: any) {
      console.error(err);
      toast.error(isAr ? "فشل تحميل الوضعيات" : "Erreur de chargement des situations");
    } finally {
      setIsLoading(false);
    }
  }, [project.id, isAr]);

  useEffect(() => {
    fetchSituations();
    const unsubscribe = situationsService.subscribe(project.id, () => {
      fetchSituations();
    });
    return () => {
      unsubscribe();
    };
  }, [project.id, fetchSituations]);

  const handleDelete = async (id: string, status: string) => {
    if (status !== "draft") {
      toast.error(isAr ? "لا يمكن حذف وضعية معتمدة." : "Impossible de supprimer une situation validée.");
      return;
    }
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذه الوضعية؟" : "Voulez-vous supprimer cette situation ?")) return;

    try {
      await situationsService.delete(id);
      toast.success(isAr ? "تم حذف الوضعية بنجاح" : "Situation supprimée avec succès");
      fetchSituations();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (selectedSituationId) {
    return (
      <SituationDetailScreen
        situationId={selectedSituationId}
        isAr={isAr}
        onBack={() => {
          setSelectedSituationId(null);
          fetchSituations();
        }}
      />
    );
  }

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* ─── هيدر القسم ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-950 p-6 rounded-3xl border shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? "وضعيات الأشغال الرسمية (Situation des Travaux)" : "Situations des Travaux"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? "إدارة وضعيات الأشغال وفق النموذج الرسمي الجزائري (الصفحة 1 و2 والملحق التفصيلي)."
              : "Gestion des situations de travaux (Partie Co-contractant, Maître d'ouvrage, etc.)"}
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-2xl gap-2 font-bold text-xs h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          {isAr ? "إنشاء وضعية جديدة" : "Nouvelle situation"}
        </Button>
      </div>

      {/* ─── القائمة ─── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Clock className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : situations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-950 rounded-3xl border text-center p-6">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl mb-3">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-black text-base text-slate-800 dark:text-slate-200">
            {isAr ? "لا توجد وضعيات أشغال مسجلة" : "Aucune situation enregistrée"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
            {isAr
              ? "انقر على زر إنشاء وضعية جديدة لإصدار أول وضعية بناءً على بنود العقد والكميات المنجزة."
              : "Cliquez sur 'Nouvelle situation' pour générer votre première situation de travaux."}
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-2xl gap-2 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white h-11"
          >
            <Plus className="w-4 h-4" />
            {isAr ? "إنشاء أول وضعية" : "Créer la première situation"}
          </Button>
        </div>
      ) : (
        <>
          {/* ── جدول سطح المكتب / التابلت ── */}
          <div className="hidden md:block bg-white dark:bg-slate-950 rounded-3xl border shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b">
                  <th className="p-4">{isAr ? "رقم الوضعية" : "N°"}</th>
                  <th className="p-4">{isAr ? "النوع" : "Type"}</th>
                  <th className="p-4">{isAr ? "تاريخ الإيقاف (Arrêtée au)" : "Arrêtée au"}</th>
                  <th className="p-4">{isAr ? "الفترة" : "Période"}</th>
                  <th className="p-4">{isAr ? "صافي الدفع (Net à payer)" : "Net à payer"}</th>
                  <th className="p-4">{isAr ? "الحالة" : "Statut"}</th>
                  <th className="p-4 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {situations.map((sit) => (
                  <tr key={sit.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-black text-sm text-slate-900 dark:text-white">
                      N° {sit.situation_number}
                    </td>
                    <td className="p-4 font-bold capitalize text-slate-700">
                      {sit.situation_type}
                    </td>
                    <td className="p-4 font-medium text-slate-600">
                      {sit.arretee_au}
                    </td>
                    <td className="p-4 text-slate-500">
                      {sit.period_start && sit.period_end ? `${sit.period_start} → ${sit.period_end}` : "-"}
                    </td>
                    <td className="p-4 font-black text-emerald-600 text-sm">
                      {(sit.net_a_payer || 0).toLocaleString()} <span className="text-[10px]">DZD</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        sit.status === "validated" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {sit.status === "validated" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {sit.status === "validated" ? (isAr ? "معتمدة" : "Validée") : (isAr ? "مسودة" : "Draft")}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSituationId(sit.id)}
                          className="h-8 px-3 rounded-xl gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isAr ? "عرض" : "Ouvrir"}
                        </Button>

                        <div suppressHydrationWarning>
                          <SituationOfficialPDFDownload situation={{ ...sit, items: [] }} isAr={isAr}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 rounded-xl gap-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              PDF
                            </Button>
                          </SituationOfficialPDFDownload>
                        </div>

                        {sit.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sit.id, sit.status)}
                            className="h-8 px-2 rounded-xl text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── بطاقات الموبايل (<768px) ── */}
          <div className="md:hidden space-y-3">
            {situations.map((sit) => (
              <div
                key={sit.id}
                className="bg-white dark:bg-slate-950 p-4 rounded-2xl border shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-blue-600">Situation N° {sit.situation_number}</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {(sit.net_a_payer || 0).toLocaleString()} DZD
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sit.status === "validated" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {sit.status === "validated" ? (isAr ? "معتمدة" : "Validée") : (isAr ? "مسودة" : "Draft")}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1 pt-2 border-t">
                  <p><strong className="text-slate-700">{isAr ? "تاريخ الإيقاف:" : "Arrêtée au:"}</strong> {sit.arretee_au}</p>
                  <p><strong className="text-slate-700">{isAr ? "النوع:" : "Type:"}</strong> {sit.situation_type}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSituationId(sit.id)}
                    className="h-8 rounded-xl text-xs font-bold gap-1 text-blue-600"
                  >
                    <Eye className="w-3.5 h-3.5" /> {isAr ? "عرض" : "Ouvrir"}
                  </Button>
                  <div suppressHydrationWarning>
                    <SituationOfficialPDFDownload situation={{ ...sit, items: [] }} isAr={isAr}>
                      <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-bold gap-1">
                        <Printer className="w-3.5 h-3.5" /> PDF
                      </Button>
                    </SituationOfficialPDFDownload>
                  </div>
                  {sit.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(sit.id, sit.status)}
                      className="h-8 rounded-xl text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreateSituationDialog
        projectId={project.id}
        isAr={isAr}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(newId) => {
          fetchSituations();
          setSelectedSituationId(newId);
        }}
      />
    </div>
  );
}
