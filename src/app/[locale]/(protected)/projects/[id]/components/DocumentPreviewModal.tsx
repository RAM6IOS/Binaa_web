"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  MapPin,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileSignature,
  FileSearch,
  Calendar,
  User,
  HardDrive,
  FileType,
  Loader2,
  Check,
  RotateCcw,
  Maximize2,
  Printer,
  Info,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { ProjectDocument } from "@/lib/types/documents";
import { documentService } from "@/lib/services/document-service";
import { createClient } from "@/lib/supabase/client";

interface Props {
  document: ProjectDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAr: boolean;
  isOwner: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (updated: ProjectDocument) => void;
}

const DOC_TYPE_LABELS: Record<string, { ar: string; fr: string }> = {
  technical_report: { ar: "تقرير فني", fr: "Rapport technique" },
  field_photos: { ar: "صور ميدانية", fr: "Photos de terrain" },
  administrative: { ar: "وثيقة إدارية", fr: "Document administratif" },
  contract: { ar: "عقد", fr: "Contrat" },
  invoice: { ar: "فاتورة", fr: "Facture" },
  other: { ar: "أخرى", fr: "Autre" },
};

function getFileExtension(url: string, fileType: string): string {
  if (fileType === "pdf") return "PDF";
  if (fileType === "image") {
    const ext = url.split(".").pop()?.split("?")[0]?.toUpperCase();
    return ext && ["JPG", "JPEG", "PNG", "GIF", "WEBP", "SVG"].includes(ext) ? ext : "IMG";
  }
  if (fileType === "document") {
    const ext = url.split(".").pop()?.split("?")[0]?.toUpperCase();
    return ext && ["DOC", "DOCX", "TXT", "RTF"].includes(ext) ? ext : "DOC";
  }
  const ext = url.split(".").pop()?.split("?")[0]?.toUpperCase();
  return ext && ext.length <= 5 ? ext : "FILE";
}

function isImageFile(fileType: string, url: string): boolean {
  if (fileType === "image") return true;
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext || "");
}

function isPdfFile(fileType: string, url: string): boolean {
  if (fileType === "pdf") return true;
  return url.toLowerCase().endsWith(".pdf");
}

function formatFileSize(url: string): string {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() || "unknown";
  return ext.toUpperCase();
}

function getFileIcon(type: string) {
  const t = type?.toLowerCase();
  if (t?.includes("pdf")) return <FileText className="w-5 h-5 text-rose-500" />;
  if (t?.includes("image") || ["png", "jpg", "jpeg", "webp"].includes(t))
    return <ImageIcon className="w-5 h-5 text-emerald-500" />;
  if (t?.includes("spreadsheet") || t?.includes("excel") || t?.includes("csv"))
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (t?.includes("word") || t?.includes("doc"))
    return <FileSignature className="w-5 h-5 text-blue-500" />;
  return <FileSearch className="w-5 h-5 text-slate-400" />;
}

export function DocumentPreviewModal({
  document: doc,
  open,
  onOpenChange,
  isAr,
  isOwner,
  onDelete,
  onUpdate,
}: Props) {
  const [zoom, setZoom] = useState(100);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [editedFields, setEditedFields] = useState({
    file_name: "",
    notes: "",
    document_type: "",
    document_date: "",
    document_category: "",
  });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (doc) {
      setEditedFields({
        file_name: doc.file_name || "",
        notes: doc.notes || "",
        document_type: doc.document_type || "",
        document_date: doc.document_date || "",
        document_category: doc.document_category || "",
      });
      setZoom(100);
      setIsEditing(false);
      setPreviewLoading(true);
      setPreviewError(false);
    }
  }, [doc?.id]);

  const handleSave = useCallback(async () => {
    if (!doc) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const updated = await documentService.updateDocument(
        doc.id,
        {
          file_name: editedFields.file_name,
          notes: editedFields.notes,
          document_type: editedFields.document_type || undefined,
          document_date: editedFields.document_date || undefined,
          document_category: editedFields.document_category || undefined,
        },
        supabase
      );
      onUpdate?.(updated);
      setIsEditing(false);
      toast.success(isAr ? "تم حفظ التعديلات" : "Modifications enregistrées");
    } catch {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  }, [doc, editedFields, isAr, onUpdate]);

  const handleDelete = useCallback(() => {
    if (!doc) return;
    onDelete?.(doc.id);
    onOpenChange(false);
  }, [doc, onDelete, onOpenChange]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleZoomReset = () => setZoom(100);

  if (!doc) return null;

  const isImage = isImageFile(doc.file_type, doc.file_url);
  const isPdf = isPdfFile(doc.file_type, doc.file_url);
  const ext = getFileExtension(doc.file_url, doc.file_type);
  const docTypeLabel = doc.document_type
    ? DOC_TYPE_LABELS[doc.document_type]?.[isAr ? "ar" : "fr"] || doc.document_type
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 gap-0 overflow-hidden
          max-w-[95vw] w-[95vw] h-[92vh]
          sm:max-w-[90vw] sm:w-[90vw] sm:h-[90vh]
          md:max-w-[85vw] md:w-[85vw] md:h-[88vh]
          lg:max-w-[80vw] lg:w-[80vw] lg:h-[85vh]
          rounded-2xl sm:rounded-3xl
          ${isAr ? "rtl" : "ltr"}`}
      >
        <DialogHeader className="flex flex-row items-center px-4 sm:px-6 py-3 pe-12 sm:pe-14 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 shrink-0">
              {getFileIcon(doc.file_type)}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-[400px]">
                {isEditing ? editedFields.file_name : doc.file_name}
              </DialogTitle>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {ext} • {new Date(doc.uploaded_at).toLocaleDateString(isAr ? "ar" : "fr")}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* ── Preview Area ── */}
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                  title={isAr ? "تصغير" : "Zoom arrière"}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs font-mono font-bold text-slate-500 min-w-[48px] text-center select-none">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                  title={isAr ? "تكبير" : "Zoom avant"}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomReset}
                  title={isAr ? "إعادة ضبط" : "Réinitialiser"}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  title={isAr ? "فتح في تبويب جديد" : "Ouvrir dans un nouvel onglet"}
                >
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.print()}
                  title={isAr ? "طباعة" : "Imprimer"}
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  title={isAr ? "تحميل" : "Télécharger"}
                >
                  <a href={doc.file_url} download={doc.file_name}>
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div
              ref={previewContainerRef}
              className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4"
            >
              {previewLoading && !previewError && (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-xs font-medium">{isAr ? "جاري التحميل..." : "Chargement..."}</p>
                </div>
              )}

              {previewError ? (
                <div className="flex flex-col items-center gap-4 text-slate-400 p-8 text-center">
                  <div className="p-4 bg-slate-200 dark:bg-slate-800 rounded-2xl">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <p className="text-sm font-medium">{isAr ? "معاينة غير متاحة لهذا النوع" : "Aperçu non disponible"}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      {isAr ? "فتح في تبويب جديد" : "Ouvrir dans un nouvel onglet"}
                    </a>
                  </Button>
                </div>
              ) : isImage ? (
                <img
                  src={doc.file_url}
                  alt={doc.file_name}
                  className="max-w-full max-h-full object-contain transition-transform duration-200 rounded-lg shadow-lg"
                  style={{ transform: `scale(${zoom / 100})` }}
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewError(true);
                  }}
                />
              ) : isPdf ? (
                <iframe
                  src={doc.file_url}
                  className="w-full h-full border-0 rounded-lg bg-white"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewError(true);
                  }}
                  title={doc.file_name}
                />
              ) : (
                <iframe
                  src={doc.file_url}
                  className="w-full h-full border-0 rounded-lg bg-white"
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewError(true);
                  }}
                  title={doc.file_name}
                />
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="w-full md:w-[340px] lg:w-[380px] shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "تفاصيل الوثيقة" : "Détails du document"}
                </h3>
              </div>

              {/* File Name */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  {isAr ? "اسم الملف" : "Nom du fichier"}
                </Label>
                {isEditing ? (
                  <Input
                    value={editedFields.file_name}
                    onChange={(e) => setEditedFields({ ...editedFields, file_name: e.target.value })}
                    className="h-9 text-sm"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                    {doc.file_name}
                  </p>
                )}
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileType className="w-3 h-3" />
                  {isAr ? "نوع الوثيقة" : "Type de document"}
                </Label>
                {isEditing ? (
                  <select
                    value={editedFields.document_type}
                    onChange={(e) => setEditedFields({ ...editedFields, document_type: e.target.value })}
                    className="w-full h-9 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{isAr ? "-- اختياري --" : "-- Optionnel --"}</option>
                    <option value="technical_report">{isAr ? "تقرير فني" : "Rapport technique"}</option>
                    <option value="field_photos">{isAr ? "صور ميدانية" : "Photos de terrain"}</option>
                    <option value="administrative">{isAr ? "وثيقة إدارية" : "Document administratif"}</option>
                    <option value="contract">{isAr ? "عقد" : "Contrat"}</option>
                    <option value="invoice">{isAr ? "فاتورة" : "Facture"}</option>
                    <option value="other">{isAr ? "أخرى" : "Autre"}</option>
                  </select>
                ) : docTypeLabel ? (
                  <Badge variant="info" className="text-xs font-bold">
                    {docTypeLabel}
                  </Badge>
                ) : (
                  <p className="text-sm text-slate-400">-</p>
                )}
              </div>

              {/* Document Category */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  {isAr ? "فئة الوثيقة" : "Catégorie"}
                </Label>
                {isEditing ? (
                  <Input
                    value={editedFields.document_category}
                    onChange={(e) => setEditedFields({ ...editedFields, document_category: e.target.value })}
                    placeholder={isAr ? "مثال: أشغال عمومية..." : "Ex: travaux publics..."}
                    className="h-9 text-sm"
                  />
                ) : doc.document_category ? (
                  <Badge variant="outline" className="text-xs font-bold">
                    {doc.document_category}
                  </Badge>
                ) : (
                  <p className="text-sm text-slate-400">-</p>
                )}
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Upload Date */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {isAr ? "تاريخ الرفع" : "Date de téléchargement"}
                </Label>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {new Date(doc.uploaded_at).toLocaleDateString(isAr ? "ar" : "fr", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Document Date */}
              {(doc.document_date || isEditing) && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {isAr ? "تاريخ الوثيقة" : "Date du document"}
                  </Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedFields.document_date}
                      onChange={(e) => setEditedFields({ ...editedFields, document_date: e.target.value })}
                      className="h-9 text-sm"
                    />
                  ) : doc.document_date ? (
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {new Date(doc.document_date).toLocaleDateString(isAr ? "ar" : "fr")}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">-</p>
                  )}
                </div>
              )}

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  {isAr ? "ملاحظات ميدانية" : "Notes de terrain"}
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editedFields.notes}
                    onChange={(e) => setEditedFields({ ...editedFields, notes: e.target.value })}
                    placeholder={isAr ? "وصف إضافي..." : "Description supplémentaire..."}
                    className="text-sm min-h-[80px] resize-none"
                  />
                ) : doc.notes ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {doc.notes}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    {isAr ? "لا توجد ملاحظات" : "Aucune note"}
                  </p>
                )}
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* GPS Coordinates */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {isAr ? "إحداثيات الموقع" : "Coordonnées GPS"}
                </Label>
                {doc.gps_coordinates ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400">
                      {doc.gps_coordinates}
                    </code>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <a
                        href={`https://www.google.com/maps?q=${doc.gps_coordinates}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={isAr ? "عرض على الخريطة" : "Voir sur la carte"}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    {isAr ? "غير محدد" : "Non disponible"}
                  </p>
                )}
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* File Info */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-3 h-3" />
                  {isAr ? "معلومات الملف" : "Informations du fichier"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                      {isAr ? "النوع" : "Type"}
                    </p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{ext}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                      {isAr ? "الامتداد" : "Extension"}
                    </p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      .{doc.file_url.split(".").pop()?.split("?")[0] || "unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sticky Footer (Edit / Delete) ── */}
            {isOwner && (
              <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4">
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm font-bold"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedFields({
                          file_name: doc.file_name || "",
                          notes: doc.notes || "",
                          document_type: doc.document_type || "",
                          document_date: doc.document_date || "",
                          document_category: doc.document_category || "",
                        });
                      }}
                      disabled={isSaving}
                    >
                      {isAr ? "إلغاء" : "Annuler"}
                    </Button>
                    <Button
                      className="flex-1 h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 gap-1.5"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {isSaving
                        ? isAr ? "جاري الحفظ..." : "Sauvegarde..."
                        : isAr ? "حفظ التعديلات" : "Enregistrer"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm font-bold gap-1.5"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="w-4 h-4" />
                      {isAr ? "تعديل التفاصيل" : "Modifier"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-10 w-10 shrink-0"
                      onClick={handleDelete}
                      title={isAr ? "حذف الوثيقة" : "Supprimer"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tag({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}
