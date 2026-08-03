"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileText, Download, CheckCircle2, Lock, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/lib/types/projects";
import { WorkAttachmentWithItems } from "@/lib/types/work-attachments";
import { workAttachmentsService } from "@/lib/services/work-attachments-service";
import { WorkAttachmentPDFDownload } from "@/components/daily-log/WorkAttachmentPDF";

interface Props {
  attachmentId: string | null;
  project: Project;
  isAr: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function WorkAttachmentDetailDialog({ attachmentId, project, isAr, open, onOpenChange, onUpdate }: Props) {
  const [attachment, setAttachment] = useState<WorkAttachmentWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [editedQtys, setEditedQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    if (attachmentId && open) {
      fetchAttachment();
    }
  }, [attachmentId, open]);

  const fetchAttachment = async () => {
    if (!attachmentId) return;
    setIsLoading(true);
    try {
      const data = await workAttachmentsService.getById(attachmentId);
      setAttachment(data);
      const qtys: Record<string, number> = {};
      data.items.forEach((item) => {
        qtys[item.id] = item.period_qty;
      });
      setEditedQtys(qtys);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل تحميل تفاصيل المحضر" : "Échec de chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQtyChange = (itemId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setEditedQtys((prev) => ({ ...prev, [itemId]: num }));
  };

  const handleSaveItems = async () => {
    if (!attachment) return;
    setIsSaving(true);
    try {
      for (const item of attachment.items) {
        const newPeriodQty = editedQtys[item.id] ?? item.period_qty;
        if (newPeriodQty !== item.period_qty) {
          await workAttachmentsService.updateItem(item.id, { period_qty: newPeriodQty });
        }
      }
      toast.success(isAr ? "تم حفظ التغييرات بنجاح" : "Modifications enregistrées");
      await fetchAttachment();
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل حفظ التغييرات" : "Échec d'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!attachment) return;
    const confirmed = confirm(
      isAr
        ? "هل أنت متأكد من اعتماد هذا المحضر؟ لن يمكنك تعديله بعد الاعتماد."
        : "Confirmer la validation ? L'attachement ne sera plus modifiable."
    );
    if (!confirmed) return;

    setIsValidating(true);
    try {
      await handleSaveItems();
      await workAttachmentsService.validate(attachment.id);
      toast.success(isAr ? "تم اعتماد المحضر بنجاح" : "Attachement validé avec succès");
      await fetchAttachment();
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل اعتماد المحضر" : "Échec de validation");
    } finally {
      setIsValidating(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                {isAr
                  ? `محضر قيس الأشغال رقم ${attachment?.attachment_number || ""}`
                  : `Attachement de Travaux N° ${attachment?.attachment_number || ""}`}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? "الفترة:" : "Période :"} {attachment?.period_start} → {attachment?.period_end}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={attachment?.status === "validated" ? "default" : "secondary"}
                className={attachment?.status === "validated" ? "bg-green-600" : "bg-amber-500 text-white"}
              >
                {attachment?.status === "validated"
                  ? (isAr ? "معتمد" : "Validé")
                  : (isAr ? "مسودة" : "Brouillon")}
              </Badge>
              {attachment && (
                <WorkAttachmentPDFDownload attachment={attachment} project={project} isAr={isAr}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                </WorkAttachmentPDFDownload>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : attachment ? (
          <div className="space-y-6 py-4">
            {attachment.status === "validated" && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-xl flex items-center gap-2 text-green-700 dark:text-green-300 text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {isAr
                    ? "هذا المحضر معتمد ومقفل نهائياً."
                    : "Cet attachement est validé et verrouillé."}
                </span>
              </div>
            )}

            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900">
                    <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                    <TableHead className="text-xs font-bold">{isAr ? "البند" : "Art"}</TableHead>
                    <TableHead className="text-xs font-bold">{isAr ? "الوصف" : "Désignation"}</TableHead>
                    <TableHead className="text-center text-xs font-bold">{isAr ? "الوحدة" : "Unité"}</TableHead>
                    <TableHead className="text-center text-xs font-bold">{isAr ? "كمية العقد" : "Qté Contrat"}</TableHead>
                    <TableHead className="text-center text-xs font-bold">{isAr ? "السابق" : "Antérieur"}</TableHead>
                    <TableHead className="text-center text-xs font-bold w-28">{isAr ? "هذه الفترة" : "Période"}</TableHead>
                    <TableHead className="text-center text-xs font-bold">{isAr ? "التراكمي" : "Cumul"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attachment.items.map((item, idx) => {
                    const periodVal = editedQtys[item.id] ?? item.period_qty;
                    const cumulVal = item.previous_qty + periodVal;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-center text-xs font-bold text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-bold text-xs">{item.item_code}</TableCell>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell className="text-center text-xs">{item.unit}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{item.contracted_qty.toLocaleString()}</TableCell>
                        <TableCell className="text-center text-xs font-mono text-slate-500">{item.previous_qty.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          {attachment.status === "draft" ? (
                            <Input
                              type="number"
                              step="any"
                              className="h-8 text-center text-xs font-mono font-bold text-blue-600"
                              value={periodVal}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            />
                          ) : (
                            <span className="text-xs font-mono font-bold text-blue-600">{item.period_qty.toLocaleString()}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono font-bold text-green-600">
                          {cumulVal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {attachment.notes && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">{isAr ? "ملاحظات:" : "Notes :"}</p>
                <p className="text-slate-500">{attachment.notes}</p>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isValidating}>
            {isAr ? "إغلاق" : "Fermer"}
          </Button>
          {attachment?.status === "draft" && (
            <>
              <Button onClick={handleSaveItems} disabled={isSaving || isValidating} variant="secondary" className="gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                {isAr ? "حفظ التعديلات" : "Enregistrer"}
              </Button>
              <Button onClick={handleValidate} disabled={isSaving || isValidating} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                {isValidating && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                {isAr ? "اعتماد المحضر" : "Valider"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
