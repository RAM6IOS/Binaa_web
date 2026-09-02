"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  WorkSituationWithItems, WorkSituationItem,
} from "@/lib/types/situations";
import { situationsService } from "@/lib/services/situations-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight, ArrowLeft, Loader2, Save, Calculator, CheckCircle2, FileText, Printer, Building, FileSpreadsheet, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { SituationOfficialPDFDownload } from "./SituationOfficialPDF";

interface SituationDetailScreenProps {
  situationId: string;
  isAr: boolean;
  onBack: () => void;
}

export function SituationDetailScreen({
  situationId, isAr, onBack,
}: SituationDetailScreenProps) {
  const [situation, setSituation] = useState<WorkSituationWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "financials" | "snapshot">("items");

  const fetchSituation = useCallback(async () => {
    try {
      const data = await situationsService.getById(situationId);
      setSituation(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isAr ? "فشل تحميل الوضعية" : "Erreur de chargement"));
    } finally {
      setIsLoading(false);
    }
  }, [situationId, isAr]);

  useEffect(() => {
    fetchSituation();
  }, [fetchSituation]);

  const handleItemQtyChange = async (itemId: string, val: string) => {
    if (!situation || situation.status !== "draft") return;
    const num = parseFloat(val) || 0;
    try {
      await situationsService.updateItem(itemId, { period_qty: num });
      await fetchSituation();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFinancialChange = async (field: string, val: any) => {
    if (!situation || situation.status !== "draft") return;
    try {
      await situationsService.updateFinancialFields(situation.id, { [field]: val });
      await fetchSituation();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRecalculate = async () => {
    if (!situation) return;
    setIsRecalculating(true);
    try {
      await situationsService.recalculate(situation.id);
      await fetchSituation();
      toast.success(isAr ? "تمت إعادة الحساب بنجاح" : "Recalcul effectué");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleValidate = async () => {
    if (!situation) return;
    if (!confirm(isAr ? "هل أنت متأكد من اعتماد وإقفال هذه الوضعية؟ لني يمكنك التعديل بعدها." : "Voulez-vous valider cette situation ? Elle sera verrouillée.")) {
      return;
    }
    setIsSaving(true);
    try {
      await situationsService.validate(situation.id);
      await fetchSituation();
      toast.success(isAr ? "تم اعتماد الوضعية بنجاح" : "Situation validée avec succès");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !situation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isDraft = situation.status === "draft";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir={isAr ? "rtl" : "ltr"}>
      {/* ─── الهيدر وأزرار التحكم ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card dark:bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 -ml-2 text-muted-foreground font-bold"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isAr ? "العودة للوضعيات" : "Retour"}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold">
                {isAr ? `وضعية أشغال رقم N° ${situation.situation_number}` : `Situation N° ${situation.situation_number}`}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                situation.status === "validated" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}>
                {situation.status === "validated" ? (isAr ? "معتمدة (Validée)" : "Validée") : (isAr ? "مسودة (Draft)" : "Brouillon")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr ? "تاريخ إيقاف الحساب:" : "Arrêtée au:"} {situation.arretee_au} | {situation.project_name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SituationOfficialPDFDownload situation={situation} isAr={isAr}>
            <Button variant="outline" className="rounded-lg gap-2 font-bold text-xs h-11 border-primary/20 text-primary bg-primary/10 hover:bg-primary/15">
              <Printer className="w-4 h-4" />
              {isAr ? "تحميل PDF الرسمي" : "Télécharger PDF officiel"}
            </Button>
          </SituationOfficialPDFDownload>

          {isDraft && (
            <>
              <Button
                variant="outline"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="rounded-lg gap-2 font-bold text-xs h-11"
              >
                {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {isAr ? "إعادة الحساب" : "Recalculer"}
              </Button>

              <Button
                onClick={handleValidate}
                disabled={isSaving}
                className="rounded-lg gap-2 font-bold text-xs h-11 bg-success text-success-foreground hover:bg-success/90"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isAr ? "اعتماد وإقفال" : "Valider"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── التنقل الداخلي ─── */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "items" ? "default" : "ghost"}
          onClick={() => setActiveTab("items")}
          className="rounded-md text-xs font-bold gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {isAr ? "بنود الوضعية والكميات" : "Articles & Quantités"}
        </Button>
        <Button
          variant={activeTab === "financials" ? "default" : "ghost"}
          onClick={() => setActiveTab("financials")}
          className="rounded-md text-xs font-bold gap-2"
        >
          <Calculator className="w-4 h-4" />
          {isAr ? "الحساب المالي وملخص الصفحة 1" : "Synthèse financière (Page 1)"}
        </Button>
        <Button
          variant={activeTab === "snapshot" ? "default" : "ghost"}
          onClick={() => setActiveTab("snapshot")}
          className="rounded-md text-xs font-bold gap-2"
        >
          <Building className="w-4 h-4" />
          {isAr ? "بيانات المقاول والصفقة (Snapshot)" : "En-tête & Co-contractant"}
        </Button>
      </div>

      {/* ─── تاب 1: بنود الوضعية ─── */}
      {activeTab === "items" && (
        <div className="space-y-4">
          <Card className="rounded-lg overflow-hidden border shadow-sm">
            <CardHeader className="bg-muted pb-4">
              <CardTitle className="text-base font-bold">
                {isAr ? "جدول تفصيل البنود (ملحق الوضعية)" : "Détail des articles et avancement"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-muted text-foreground font-bold border-b">
                    <th className="p-3">#</th>
                    <th className="p-3">{isAr ? "رقم البند" : "Art"}</th>
                    <th className="p-3 w-1/3">{isAr ? "تعيين الأشغال" : "Désignation"}</th>
                    <th className="p-3">{isAr ? "الوحدة" : "Unité"}</th>
                    <th className="p-3">{isAr ? "الكمية العقدية" : "Qté Contrat"}</th>
                    <th className="p-3">{isAr ? "السابقة" : "Qté Préc."}</th>
                    <th className="p-3 bg-primary/10 text-primary">{isAr ? "الفترة الحالية" : "Qté Période"}</th>
                    <th className="p-3">{isAr ? "التراكمية" : "Qté Cumul"}</th>
                    <th className="p-3">{isAr ? "النسبة %" : "Avanc. %"}</th>
                    <th className="p-3">{isAr ? "السعر الفردي" : "Prix Unit."}</th>
                    <th className="p-3">{isAr ? "المبلغ التراكمي" : "Montant Cumul"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {situation.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted">
                      <td className="p-3 text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 font-bold">{item.item_code}</td>
                      <td className="p-3 font-medium text-foreground">{item.description}</td>
                      <td className="p-3 text-muted-foreground">{item.unit}</td>
                      <td className="p-3 font-bold">{item.contracted_qty.toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{item.previous_qty.toLocaleString()}</td>
                      <td className="p-3 bg-primary/5">
                        {isDraft ? (
                          <Input
                            type="number"
                            step="any"
                            value={item.period_qty}
                            onChange={(e) => handleItemQtyChange(item.id, e.target.value)}
                            className="h-8 w-24 text-xs font-bold rounded-md border-primary/30 bg-card"
                          />
                        ) : (
                          <span className="font-bold text-primary">{item.period_qty.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="p-3 font-bold">{item.cumulative_qty.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          item.progress_percent >= 100 ? "bg-success/10 text-success" : "bg-muted text-foreground"
                        }`}>
                          {item.progress_percent}%
                        </span>
                      </td>
                      <td className="p-3 font-medium">{item.unit_price.toLocaleString()}</td>
                      <td className="p-3 font-bold text-success">{(item.cumulative_amount || 0).toLocaleString()} DZD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── تاب 2: الحساب المالي (الصفحة 1) ─── */}
      {activeTab === "financials" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* الإجماليات الأولى والثانية */}
          <Card className="rounded-lg border shadow-sm">
            <CardHeader className="bg-muted">
              <CardTitle className="text-base font-bold">
                {isAr ? "الملخص المالي (TOTAL 1 & TOTAL 2)" : "Synthèse financière (Total 1 & 2)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="font-bold text-muted-foreground">1. Travaux cumulés</span>
                <span className="font-bold text-foreground">{situation.travaux_cumules.toLocaleString()} DZD</span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="font-bold text-muted-foreground">2. Avances forfaitaires</span>
                {isDraft ? (
                  <Input
                    type="number"
                    value={situation.avances_forfaitaires}
                    onChange={(e) => handleFinancialChange("avances_forfaitaires", parseFloat(e.target.value) || 0)}
                    className="h-8 w-32 text-xs rounded-md text-right font-bold"
                  />
                ) : (
                  <span className="font-bold">{situation.avances_forfaitaires.toLocaleString()} DZD</span>
                )}
              </div>

              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="font-bold text-muted-foreground">3. Avances approvisionnement</span>
                {isDraft ? (
                  <Input
                    type="number"
                    value={situation.avances_approvisionnement}
                    onChange={(e) => handleFinancialChange("avances_approvisionnement", parseFloat(e.target.value) || 0)}
                    className="h-8 w-32 text-xs rounded-md text-right font-bold"
                  />
                ) : (
                  <span className="font-bold">{situation.avances_approvisionnement.toLocaleString()} DZD</span>
                )}
              </div>

              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="font-bold text-muted-foreground">4. Travaux en avenant</span>
                {isDraft ? (
                  <Input
                    type="number"
                    value={situation.travaux_avenant}
                    onChange={(e) => handleFinancialChange("travaux_avenant", parseFloat(e.target.value) || 0)}
                    className="h-8 w-32 text-xs rounded-md text-right font-bold"
                  />
                ) : (
                  <span className="font-bold">{situation.travaux_avenant.toLocaleString()} DZD</span>
                )}
              </div>

              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="font-bold text-muted-foreground">5. Autres montants</span>
                {isDraft ? (
                  <Input
                    type="number"
                    value={situation.autres_montant}
                    onChange={(e) => handleFinancialChange("autres_montant", parseFloat(e.target.value) || 0)}
                    className="h-8 w-32 text-xs rounded-md text-right font-bold"
                  />
                ) : (
                  <span className="font-bold">{situation.autres_montant.toLocaleString()} DZD</span>
                )}
              </div>

              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex justify-between items-center">
                <span className="font-bold text-primary">TOTAL 1 (1+2+3+4+5)</span>
                <span className="text-sm font-bold text-primary">{situation.total_1.toLocaleString()} DZD</span>
              </div>

              <div className="pt-3 border-t space-y-3">
                <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                  <span className="font-bold text-muted-foreground">6. Travaux précédemment certifiés</span>
                  <span className="font-bold">{situation.travaux_precedemment_certifies.toLocaleString()} DZD</span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                  <span className="font-bold text-muted-foreground">7. Avances forfaitaires reçues</span>
                  {isDraft ? (
                    <Input
                      type="number"
                      value={situation.avances_forfaitaires_recues}
                      onChange={(e) => handleFinancialChange("avances_forfaitaires_recues", parseFloat(e.target.value) || 0)}
                      className="h-8 w-32 text-xs rounded-md text-right font-bold"
                    />
                  ) : (
                    <span className="font-bold">{situation.avances_forfaitaires_recues.toLocaleString()} DZD</span>
                  )}
                </div>

                <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                  <span className="font-bold text-muted-foreground">8. Avances appro reçues</span>
                  {isDraft ? (
                    <Input
                      type="number"
                      value={situation.avances_appro_recues}
                      onChange={(e) => handleFinancialChange("avances_appro_recues", parseFloat(e.target.value) || 0)}
                      className="h-8 w-32 text-xs rounded-md text-right font-bold"
                    />
                  ) : (
                    <span className="font-bold">{situation.avances_appro_recues.toLocaleString()} DZD</span>
                  )}
                </div>

                <div className="p-3 bg-muted rounded-lg border flex justify-between items-center">
                  <span className="font-bold text-foreground">TOTAL 2 (6+7+8)</span>
                  <span className="text-sm font-bold text-foreground">{situation.total_2.toLocaleString()} DZD</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الضرائب، ضمان الأداء، وصافي الدفع */}
          <Card className="rounded-lg border shadow-sm">
            <CardHeader className="bg-muted">
              <CardTitle className="text-base font-bold">
                {isAr ? "الضرائب وصافي الدفع (9 إلى 14)" : "TVA, Retenue & Net à payer"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-success/10 rounded-lg border border-success/20 flex justify-between items-center">
                <span className="font-bold text-success">9. MONTANT BRUT (TOTAL 1 - TOTAL 2)</span>
                <span className="text-sm font-bold text-success">{situation.montant_brut.toLocaleString()} DZD</span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="font-bold text-muted-foreground">10. MONTANT H.T.</span>
                <span className="font-bold">{situation.montant_ht.toLocaleString()} DZD</span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-2.5 bg-muted rounded-md items-center">
                <div>
                  <span className="font-bold text-muted-foreground">11. T.V.A. (%)</span>
                  {isDraft ? (
                    <Input
                      type="number"
                      value={situation.tva_rate}
                      onChange={(e) => handleFinancialChange("tva_rate", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs rounded-md mt-1 font-bold"
                    />
                  ) : (
                    <span className="block font-bold mt-1">{situation.tva_rate}%</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-muted-foreground">Montant TVA</span>
                  <p className="font-bold text-foreground mt-1">{situation.tva_amount.toLocaleString()} DZD</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-muted rounded-md">
                <span className="font-bold text-muted-foreground">12. MONTANT T.T.C.</span>
                <span className="font-bold text-foreground">{situation.montant_ttc.toLocaleString()} DZD</span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-2.5 bg-muted rounded-md items-center">
                <div>
                  <span className="font-bold text-muted-foreground">13. Retenue de garantie (%)</span>
                  {isDraft ? (
                    <Input
                      type="number"
                      value={situation.retenue_garantie_rate}
                      onChange={(e) => handleFinancialChange("retenue_garantie_rate", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs rounded-md mt-1 font-bold"
                    />
                  ) : (
                    <span className="block font-bold mt-1">{situation.retenue_garantie_rate}%</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-muted-foreground">Montant Retenue</span>
                  <p className="font-bold text-destructive mt-1">-{situation.retenue_garantie_amount.toLocaleString()} DZD</p>
                </div>
              </div>

              <div className="p-4 bg-inverse text-inverse-foreground rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-inverse-foreground/80 font-bold">14. NET À PAYER</span>
                  <span className="text-lg font-bold text-success-foreground">{situation.net_a_payer.toLocaleString()} DZD</span>
                </div>
                <p className="text-xs text-inverse-foreground/70 italic pt-2 border-t border-inverse-foreground/20">
                  {situation.net_a_payer_text}
                </p>
              </div>

              {isDraft && (
                <Button
                  onClick={handleRecalculate}
                  className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 gap-2 text-xs"
                >
                  <Calculator className="w-4 h-4" />
                  {isAr ? "تحديث الحسابات الفورية" : "Mettre à jour les calculs"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── تاب 3: بيانات المقاول والصفقة (Snapshot) ─── */}
      {activeTab === "snapshot" && (
        <Card className="rounded-lg border shadow-sm">
          <CardHeader className="bg-muted">
            <CardTitle className="text-base font-bold">
              {isAr ? "معلومات الهوية والصفقة (اللقطة الرسمية)" : "Informations du co-contractant & du marché"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "صاحب المشروع / المصلحة المتعاقدة" : "Maître d'ouvrage"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.client_name || ""}
                  onChange={(e) => setSituation({ ...situation, client_name: e.target.value })}
                  className="rounded-md h-10 text-xs font-semibold"
                  placeholder={isAr ? "مثال: مديرية التجهيزات العمومية" : "Ex: Direction des Équipements Publics"}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "رقم الصفقة (Marché N°)" : "Marché N°"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.marche_number || ""}
                  onChange={(e) => setSituation({ ...situation, marche_number: e.target.value })}
                  className="rounded-md h-10 text-xs font-semibold"
                  placeholder={isAr ? "مثال: N° 45/2024" : "Ex: N° 45/2024"}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "رقم الحصة (Lot N°)" : "Lot N°"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.lot_number || ""}
                  onChange={(e) => setSituation({ ...situation, lot_number: e.target.value })}
                  className="rounded-md h-10 text-xs"
                />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label className="font-bold">{isAr ? "تسمية الحصة (Lot Label)" : "Lot Label"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.lot_label || ""}
                  onChange={(e) => setSituation({ ...situation, lot_label: e.target.value })}
                  className="rounded-md h-10 text-xs"
                  placeholder={isAr ? "مثال: أشغال إنجاز الأساسات والهيكل" : "Ex: Gros œuvre"}
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "اسم المقاولة / الشركة (Co-contractant)" : "Nom de l'entreprise"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_name || ""}
                  onChange={(e) => setSituation({ ...situation, company_name: e.target.value })}
                  className="rounded-md h-10 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="font-bold">{isAr ? "عنوان المقاولة الرسمي" : "Adresse"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_address || ""}
                  onChange={(e) => setSituation({ ...situation, company_address: e.target.value })}
                  className="rounded-md h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "السجل التجاري (RC N°)" : "Registre de Commerce (RC)"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_rc || ""}
                  onChange={(e) => setSituation({ ...situation, company_rc: e.target.value })}
                  className="rounded-md h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "تاريخ السجل التجاري (Date RC)" : "Date RC"}</Label>
                <Input
                  disabled={!isDraft}
                  type="date"
                  value={situation.company_rc_date || ""}
                  onChange={(e) => setSituation({ ...situation, company_rc_date: e.target.value })}
                  className="rounded-md h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "الرقم الضريبي (NIF)" : "NIF"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_nif || ""}
                  onChange={(e) => setSituation({ ...situation, company_nif: e.target.value })}
                  className="rounded-md h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "الرقم الإحصائي (NIS)" : "NIS"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_nis || ""}
                  onChange={(e) => setSituation({ ...situation, company_nis: e.target.value })}
                  className="rounded-md h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "المادة الضريبية (Article d'imposition)" : "Article d'imposition"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_article || ""}
                  onChange={(e) => setSituation({ ...situation, company_article: e.target.value })}
                  className="rounded-md h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "رأس المال الاجتماعي (Capital Social)" : "Capital Social"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_capital || ""}
                  onChange={(e) => setSituation({ ...situation, company_capital: e.target.value })}
                  className="rounded-md h-10 text-xs"
                  placeholder="Ex: 10 000 000 DA"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="font-bold">{isAr ? "رقم الحساب البنكي (RIB)" : "RIB Bancaire"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_rib || ""}
                  onChange={(e) => setSituation({ ...situation, company_rib: e.target.value })}
                  className="rounded-md h-10 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">{isAr ? "البنك / الوكالة (Banque / Agence)" : "Banque / Agence"}</Label>
                <Input
                  disabled={!isDraft}
                  value={situation.company_bank || ""}
                  onChange={(e) => setSituation({ ...situation, company_bank: e.target.value })}
                  className="rounded-md h-10 text-xs"
                  placeholder="Ex: BEA Agence 104"
                />
              </div>
            </div>

            {isDraft && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={async () => {
                    try {
                      await situationsService.updateSnapshotAndDefaults(situation.id, situation.project_id, {
                        company_name: situation.company_name,
                        company_address: situation.company_address,
                        company_rc: situation.company_rc,
                        company_rc_date: situation.company_rc_date,
                        company_nif: situation.company_nif,
                        company_nis: situation.company_nis,
                        company_article: situation.company_article,
                        company_rib: situation.company_rib,
                        company_bank: situation.company_bank,
                        company_capital: situation.company_capital,
                        lot_number: situation.lot_number,
                        lot_label: situation.lot_label,
                        client_name: situation.client_name,
                        marche_number: situation.marche_number,
                      });
                      toast.success(isAr ? "تم حفظ البيانات واعتمادها للوضعيات القادمة" : "Modifications enregistrées pour les prochaines situations");
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }}
                  className="rounded-md font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-10"
                >
                  <Save className="w-4 h-4" />
                  {isAr ? "حفظ التعديلات" : "Enregistrer"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
