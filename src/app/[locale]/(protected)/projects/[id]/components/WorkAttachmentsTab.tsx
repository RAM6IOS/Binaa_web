"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Trash2, Eye, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/lib/types/projects";
import { WorkAttachment } from "@/lib/types/work-attachments";
import { workAttachmentsService } from "@/lib/services/work-attachments-service";
import { CreateWorkAttachmentDialog } from "./CreateWorkAttachmentDialog";
import { WorkAttachmentDetailDialog } from "./WorkAttachmentDetailDialog";

interface Props {
  project: Project;
  isAr: boolean;
}

export function WorkAttachmentsTab({ project, isAr }: Props) {
  const [attachments, setAttachments] = useState<WorkAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAttachments = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await workAttachmentsService.getByProject(project.id);
      setAttachments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchAttachments();
    const sub = workAttachmentsService.subscribe(project.id, () => fetchAttachments(true));
    return () => { if (typeof sub === "function") sub(); };
  }, [fetchAttachments, project.id]);

  const handleDelete = async (id: string, status: string) => {
    if (status !== "draft") {
      toast.error(isAr ? "لا يمكن حذف محضر معتمد" : "Impossible de supprimer un attachement validé");
      return;
    }
    const confirmed = confirm(isAr ? "هل أنت متأكد من حذف هذا المحضر؟" : "Confirmer la suppression de cet attachement ?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await workAttachmentsService.delete(id);
      toast.success(isAr ? "تم حذف المحضر بنجاح" : "Attachement supprimé");
      fetchAttachments(true);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل حذف المحضر" : "Échec de suppression");
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <WorkAttachmentDetailDialog
        attachmentId={selectedAttachmentId}
        project={project}
        isAr={isAr}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={() => fetchAttachments(true)}
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground rounded-lg p-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <FileText className="w-7 h-7" />
            {isAr ? "محاضر قيس الأشغال (Attachements)" : "Attachements Minute des Travaux"}
          </h2>
          <p className="text-primary-foreground/80 mt-1">
            {isAr
              ? "إعداد واعتماد محاضر قيس الكميات الدورية للفواتير ووضعيات الأشغال"
              : "Établissement et validation des attachements périodiques des métrés"}
          </p>
        </div>
        <CreateWorkAttachmentDialog
          projectId={project.id}
          isAr={isAr}
          onSuccess={() => fetchAttachments(true)}
          trigger={
            <Button variant="secondary" className="gap-2 font-bold">
              <Plus className="w-4 h-4" />
              {isAr ? "محضر قيس جديد" : "Nouvel Attachement"}
            </Button>
          }
        />
      </div>

      {/* List */}
      {attachments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">
              {isAr ? "لا توجد محاضر قيس بعد" : "Aucun attachement enregistré"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {isAr
                ? "انقر على زر 'محضر قيس جديد' لإنشاء أول محضر للأشغال"
                : "Cliquez sur 'Nouvel Attachement' pour commencer le suivi"}
            </p>
            <CreateWorkAttachmentDialog
              projectId={project.id}
              isAr={isAr}
              onSuccess={() => fetchAttachments(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {isAr ? "قائمة محاضر القيس" : "Liste des attachements"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted dark:bg-muted">
                    <TableHead className="w-20 font-bold text-xs">{isAr ? "رقم المحضر" : "N° Att."}</TableHead>
                    <TableHead className="font-bold text-xs">{isAr ? "الفترة" : "Période"}</TableHead>
                    <TableHead className="text-center font-bold text-xs">{isAr ? "الحالة" : "Statut"}</TableHead>
                    <TableHead className="font-bold text-xs">{isAr ? "ملاحظات" : "Notes"}</TableHead>
                    <TableHead className="text-center font-bold text-xs">{isAr ? "تاريخ الإنشاء" : "Création"}</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attachments.map((att) => (
                    <TableRow
                      key={att.id}
                      className="cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        setSelectedAttachmentId(att.id);
                        setIsDetailOpen(true);
                      }}
                    >
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        N° {att.attachment_number}
                      </TableCell>
                      <TableCell className="text-xs font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {att.period_start} → {att.period_end}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={att.status === "validated" ? "default" : "secondary"}
                          className={att.status === "validated" ? "bg-success" : "bg-warning text-warning-foreground"}
                        >
                          {att.status === "validated" ? (isAr ? "معتمد" : "Validé") : (isAr ? "مسودة" : "Brouillon")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-50 truncate">
                        {att.notes || "-"}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {att.created_at ? new Date(att.created_at).toLocaleDateString(isAr ? "ar-DZ" : "fr-FR") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedAttachmentId(att.id);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {att.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(att.id, att.status)}
                              disabled={deletingId === att.id}
                            >
                              {deletingId === att.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="border rounded-lg p-4 bg-card dark:bg-card shadow-sm space-y-3 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    setSelectedAttachmentId(att.id);
                    setIsDetailOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {isAr ? `محضر رقم ${att.attachment_number}` : `Attachement N° ${att.attachment_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {att.period_start} → {att.period_end}
                      </p>
                    </div>
                    <Badge
                      variant={att.status === "validated" ? "default" : "secondary"}
                      className={att.status === "validated" ? "bg-success" : "bg-warning text-warning-foreground"}
                    >
                      {att.status === "validated" ? (isAr ? "معتمد" : "Validé") : (isAr ? "مسودة" : "Brouillon")}
                    </Badge>
                  </div>
                  {att.notes && (
                    <p className="text-xs text-muted-foreground bg-muted dark:bg-muted p-2 rounded-lg">
                      {att.notes}
                    </p>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t text-xs">
                    <span className="text-muted-foreground">
                      {att.created_at ? new Date(att.created_at).toLocaleDateString() : ""}
                    </span>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          setSelectedAttachmentId(att.id);
                          setIsDetailOpen(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isAr ? "عرض" : "Ouvrir"}
                      </Button>
                      {att.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(att.id, att.status)}
                          disabled={deletingId === att.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
