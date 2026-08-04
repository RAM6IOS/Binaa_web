"use client";

import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Calendar } from "lucide-react";
import { situationsService } from "@/lib/services/situations-service";
import { WorkSituationType } from "@/lib/types/situations";
import { toast } from "sonner";

interface CreateSituationDialogProps {
  projectId: string;
  isAr: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newId: string) => void;
}

export function CreateSituationDialog({
  projectId, isAr, open, onOpenChange, onSuccess,
}: CreateSituationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [arreteeAu, setArreteeAu] = useState(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [situationType, setSituationType] = useState<WorkSituationType>("monthly");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arreteeAu) {
      toast.error(isAr ? "يرجى تحديد تاريخ إيقاف الوضعية" : "Veuillez spécifier la date d'arrêtée");
      return;
    }

    setIsLoading(true);
    try {
      const created = await situationsService.create({
        project_id: projectId,
        arretee_au: arreteeAu,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        situation_type: situationType,
      });

      toast.success(isAr ? "تم إنشاء الوضعية بنجاح" : "Situation créée avec succès");
      onSuccess(created.id);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isAr ? "فشل إنشاء الوضعية" : "Erreur de création"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-xl font-black">
            {isAr ? "إنشاء وضعية أشغال جديدة" : "Nouvelle Situation des Travaux"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isAr
              ? "إصدار وضعية جديدة وفق النموذج الرسمي الجزائري مع جلب الكميات المنجزة تلقائياً."
              : "Générer une nouvelle situation conforme au modèle algérien officiel."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold">
              {isAr ? "نوع الوضعية" : "Type de situation"}
            </Label>
            <Select value={situationType} onValueChange={(val: any) => setSituationType(val)}>
              <SelectTrigger className="rounded-xl h-11 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="monthly">{isAr ? "وضعية شهرية (Mensuelle)" : "Mensuelle"}</SelectItem>
                <SelectItem value="interim">{isAr ? "وضعية مرحلية (Interimaire)" : "Intérimaire"}</SelectItem>
                <SelectItem value="final">{isAr ? "وضعية ختامية (Finale)" : "Finale"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">
              {isAr ? "تاريخ إيقاف الحساب (Arrêtée au) *" : "Arrêtée au *"}
            </Label>
            <Input
              type="date"
              required
              value={arreteeAu}
              onChange={(e) => setArreteeAu(e.target.value)}
              className="rounded-xl h-11 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {isAr ? "بداية الفترة" : "Début période"}
              </Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="rounded-xl h-11 text-xs font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {isAr ? "نهاية الفترة" : "Fin période"}
              </Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="rounded-xl h-11 text-xs font-medium"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-11 text-xs font-bold"
            >
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl h-11 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAr ? "إنشاء الوضعية" : "Créer la situation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
