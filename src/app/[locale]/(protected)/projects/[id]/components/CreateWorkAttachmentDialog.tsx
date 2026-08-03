"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { workAttachmentsService } from "@/lib/services/work-attachments-service";

interface Props {
  projectId: string;
  isAr: boolean;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function CreateWorkAttachmentDialog({ projectId, isAr, onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) {
      toast.error(isAr ? "يرجى تحديد فترة البداية والنهاية" : "Veuillez spécifier la période");
      return;
    }

    if (periodStart > periodEnd) {
      toast.error(
        isAr
          ? "تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه"
          : "La date de début doit être antérieure ou égale à la date de fin"
      );
      return;
    }

    setIsLoading(true);
    try {
      await workAttachmentsService.create({
        project_id: projectId,
        period_start: periodStart,
        period_end: periodEnd,
        notes,
      });
      toast.success(isAr ? "تم إنشاء محضر القيس بنجاح" : "Attachement créé avec succès");
      setOpen(false);
      setPeriodStart("");
      setPeriodEnd("");
      setNotes("");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(isAr ? (err.message || "فشل إنشاء المحضر") : (err.message || "Échec de création"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="w-4 h-4" />
            {isAr ? "محضر قيس جديد" : "Nouvel Attachement"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {isAr ? "إنشاء محضر قيس أشغال جديد" : "Créer un nouvel attachement"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isAr ? "بداية الفترة" : "Début de période"}</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "نهاية الفترة" : "Fin de période"}</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "ملاحظات (اختياري)" : "Notes (optionnel)"}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? "أية ملاحظات إضافية حول المحضر..." : "Remarques supplémentaires..."}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isAr ? "إنشاء المحضر" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
