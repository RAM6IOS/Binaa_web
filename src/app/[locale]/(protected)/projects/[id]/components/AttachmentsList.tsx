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
  if (type.startsWith("image/")) return <FileImage className="w-8 h-8 text-purple-500" />;
  if (type.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
  if (type.includes("zip") || type.includes("rar"))
    return <FileArchive className="w-8 h-8 text-amber-500" />;
  return <File className="w-8 h-8 text-slate-500" />;
}

export function AttachmentsList({ attachments, isAr, onDelete, readOnly = true }: AttachmentsListProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic py-6 text-center">
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
              className="group relative flex flex-col border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300"
            >
              {/* Preview */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden">
                {isImage ? (
                  <img
                    src={file.file_url}
                    alt={file.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    {getFileIcon(file.file_type)}
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">
                      {file.file_type.split('/')[1] || 'FILE'}
                    </p>
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                  {isImage && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white"
                      onClick={() => setLightboxSrc(file.file_url)}
                      aria-label="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
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
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2 mb-1">
                  {file.file_name}
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>{new Date(file.uploaded_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}</span>
                </div>
              </div>

              {/* Delete Button */}
              {!readOnly && onDelete && (
                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <img
            src={lightboxSrc}
            alt="Preview"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-6 right-6 text-white text-3xl hover:text-red-400"
            onClick={() => setLightboxSrc(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}