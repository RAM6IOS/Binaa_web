"use client";

import { useState } from "react";
import { Attachment } from "@/lib/services/attachments-service";
import {
  FileText,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
  ExternalLink,
  Trash2,
  Eye,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AttachmentsListProps {
  attachments: Attachment[];
  isAr: boolean;
  onDelete?: (id: string) => Promise<void> | void;
  readOnly?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileType: string) {
  const type = fileType.toLowerCase();
  if (type.startsWith("image/")) return <FileImage className="w-8 h-8 text-info" />;
  if (type.includes("pdf")) return <FileText className="w-8 h-8 text-destructive" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className="w-8 h-8 text-success" />;
  if (type.includes("zip") || type.includes("rar"))
    return <FileArchive className="w-8 h-8 text-warning" />;
  return <File className="w-8 h-8 text-muted-foreground" />;
}

export function AttachmentsList({ attachments, isAr, onDelete, readOnly = true }: AttachmentsListProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-6 text-center">
        {isAr ? "لا توجد مرفقات مضافة بعد." : "Aucune pièce jointe ajoutée."}
      </p>
    );
  }

  const handleDelete = async (id: string) => {
    if (!onDelete) return;

    const confirmed = window.confirm(
      isAr ? "هل أنت متأكد من حذف هذا المرفق؟" : "Confirmer la suppression ?"
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success(isAr ? "تم حذف المرفق بنجاح" : "Pièce jointe supprimée");
    } catch (err) {
      toast.error(isAr ? "فشل حذف المرفق" : "Échec de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {attachments.map((file) => {
          const isImage = file.file_type.startsWith("image/");

          return (
            <div
              key={file.id}
              className="group relative flex flex-col border border-border rounded-lg overflow-hidden bg-card hover:shadow-sm transition-all duration-300"
            >
              {/* Preview */}
              <div className="aspect-video bg-muted/50 flex items-center justify-center relative overflow-hidden">
                {isImage ? (
                  <img
                    src={file.file_url}
                    alt={file.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    {getFileIcon(file.file_type)}
                    <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">
                      {file.file_type.split('/')[1] || 'FILE'}
                    </p>
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-muted/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                  {isImage && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="bg-background/90 hover:bg-background"
                      onClick={() => setLightboxSrc(file.file_url)}
                      aria-label="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="bg-background/90 hover:bg-background"
                    asChild
                  >
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" aria-label="Open externally">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* File Info */}
              <div className="p-3">
                <p className="text-xs font-medium text-foreground line-clamp-2 mb-1">
                  {file.file_name}
                </p>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>{new Date(file.uploaded_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}</span>
                </div>
              </div>

              {/* Delete Button */}
              {!readOnly && onDelete && (
                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  className="absolute top-2 right-2 p-1.5 bg-destructive hover:bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                >
                  {deletingId === file.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-[10000] bg-muted/90 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <img
            src={lightboxSrc}
            alt="Preview"
            className="max-h-[90vh] max-w-full rounded-lg shadow-sm"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-6 right-6 text-muted-foreground text-3xl hover:text-destructive"
            onClick={() => setLightboxSrc(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}