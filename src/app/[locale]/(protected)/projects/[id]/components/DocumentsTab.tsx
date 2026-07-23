"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Image from "next/image"; // تحسين رقم 1: استيراد مكون الصور المتقدم
import { Project, ProjectDocument } from "@/lib/types/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Calendar,
  Eye,
  User,
  LayoutGrid,
  List,
  FileSpreadsheet,
  FileSignature,
  FileSearch,
  Loader2
} from "lucide-react";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { documentService } from "@/lib/services/document-service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";

interface Props {
  project: Project & { project_documents?: ProjectDocument[] };
  isAr: boolean;
}

// ────────────────────────────────────────────
// مكوّن مساعد لتحويل روابط Supabase لروابط مُصغرة
// ────────────────────────────────────────────
const getOptimizedUrl = (url: string, width: number = 400) => {
  if (!url || !url.includes("supabase.co")) return url;
  return `${url}?width=${width}&quality=75&resize=contain`;
};

export function DocumentsTab({ project, isAr }: Props) {
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.project_documents || []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      refreshDocuments();
    }
    init();
  }, [project.id]);

  const refreshDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentService.getProjectDocuments(project.id);
      setDocuments(data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  const askDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const openPreview = (doc: ProjectDocument) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handlePreviewDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setPreviewOpen(false);
    setPreviewDoc(null);
  };

  const handlePreviewUpdate = (updated: ProjectDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setPreviewDoc(updated);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await documentService.deleteDocument(itemToDelete);
      toast.success(isAr ? 'تم حذف الوثيقة بنجاح' : 'Document supprimé ✓');
      setDocuments(prev => prev.filter(doc => doc.id !== itemToDelete));
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const getFileIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t?.includes('pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    if (t?.includes('image') || ['png', 'jpg', 'jpeg', 'webp'].includes(t)) return <ImageIcon className="w-8 h-8 text-emerald-500" />;
    if (t?.includes('spreadsheet') || t?.includes('excel') || t?.includes('csv')) return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    if (t?.includes('word') || t?.includes('doc')) return <FileSignature className="w-8 h-8 text-blue-500" />;
    return <FileSearch className="w-8 h-8 text-slate-400" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12" dir={isAr ? "rtl" : "ltr"}>

      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف مستند المشروع" : "Supprimer"}
        description={isAr ? "سيتم حذف الملف نهائياً من الورشة." : "Définitif."}
      />

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-start">
            <h3 className="text-lg font-black tracking-tight">{isAr ? 'خزانة الوثائق' : 'Documents'}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{documents.length} Files</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <Button size="icon" variant="ghost" className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`} onClick={() => setViewMode('grid')} aria-label="Grid view"><LayoutGrid className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className={`h-8 w-8 ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`} onClick={() => setViewMode('list')} aria-label="List view"><List className="w-4 h-4" /></Button>
          </div>
          <UploadDocumentModal isAr={isAr} projectId={project.id} onSuccess={refreshDocuments} />
        </div>
      </div>

      {loading && documents.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center opacity-40"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>
      ) : documents.length === 0 ? (
        <Card className="py-24 border-dashed border-2 bg-slate-50/20 flex flex-col items-center justify-center text-center">
          <FileSearch className="w-12 h-12 text-slate-200 mb-4" />
          <h4 className="font-bold text-slate-400">{isAr ? 'المجلد فارغ' : 'Dossier Vide'}</h4>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {documents.map((doc) => {
            const isOwner = currentUserId === doc.uploaded_by;
            const isImage = ['image', 'png', 'jpg', 'jpeg', 'webp'].includes(doc.file_type?.toLowerCase());

            return (
              <Card key={doc.id} className="group overflow-hidden border-slate-200 hover:border-blue-400 transition-all rounded-[28px] flex flex-col">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border-b">
                  {isImage ? (
                    /* تحسين LCP: استخدام Image مع تحديد sizes وروابط مصغرة */
                    <Image
                      src={getOptimizedUrl(doc.file_url, 500)} // جلب نسخة 500 بكسل فقط
                      alt={doc.file_name}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">{getFileIcon(doc.file_type)}</div>
                  )}

                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                    <Button size="icon" variant="secondary" className="rounded-full bg-white shadow-xl" asChild><a href={doc.file_url} target="_blank" rel="noopener noreferrer" aria-label="Download"><Download className="w-4 h-4" /></a></Button>
                    <Button size="icon" variant="secondary" className="rounded-full bg-white shadow-xl" onClick={() => openPreview(doc)} aria-label="Preview"><Eye className="w-4 h-4" /></Button>
                    {isOwner && <Button size="icon" variant="destructive" className="rounded-full shadow-xl" onClick={() => askDelete(doc.id)} aria-label="Delete"><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                </div>

                <CardContent className="p-4 text-start">
                  <h4 className="font-bold text-[13px] text-slate-900 dark:text-slate-100 truncate">{doc.file_name}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {doc.document_type && (
                      <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-600 border-blue-200">
                        {doc.document_type}
                      </Badge>
                    )}
                    {doc.document_category && (
                      <Badge variant="outline" className="text-[9px] font-bold bg-slate-100 text-slate-600 border-slate-200">
                        {doc.document_category}
                      </Badge>
                    )}
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tabular-nums">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {doc.document_date
                        ? new Date(doc.document_date).toLocaleDateString(isAr ? 'ar' : 'fr')
                        : new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar' : 'fr')}
                    </div>
                    {isOwner && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Owner</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-slate-200 overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start" dir={isAr ? "rtl" : "ltr"}>
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                <tr className="h-12">
                  <th className="ps-6">الملف</th>
                  <th>نوع الوثيقة</th>
                  <th>الفئة</th>
                  <th>التاريخ</th>
                  <th className="text-center pe-6">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-slate-50/50 h-16">
                    <td className="ps-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center bg-white">
                          {['image', 'png', 'jpg', 'jpeg'].includes(doc.file_type?.toLowerCase()) ? (
                            <Image
                              src={getOptimizedUrl(doc.file_url, 100)} // روابط Thumbnails للمنشورات
                              alt="" fill className="object-cover"
                            />
                          ) : getFileIcon(doc.file_type)}
                        </div>
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="text-[10px] font-black uppercase text-slate-400"><span>{doc.document_type || doc.file_type}</span></td>
                    <td className="text-[10px] font-black uppercase text-slate-400"><span>{doc.document_category || '-'}</span></td>
                    <td className="font-mono text-[10px] opacity-60 tabular-nums uppercase">{doc.document_date ? new Date(doc.document_date).toLocaleDateString(isAr ? 'ar' : 'fr') : new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar' : 'fr')}</td>
                    <td className="text-center pe-6"><div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" asChild className="h-8 w-8 text-blue-500"><a href={doc.file_url} target="_blank" aria-label="Download"><Download size={16} /></a></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => openPreview(doc)} aria-label="Preview"><Eye size={16} /></Button>{currentUserId === doc.uploaded_by && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => askDelete(doc.id)} aria-label="Delete"><Trash2 size={16} /></Button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <DocumentPreviewModal
        document={previewDoc}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        isAr={isAr}
        isOwner={currentUserId === previewDoc?.uploaded_by}
        onDelete={handlePreviewDelete}
        onUpdate={handlePreviewUpdate}
      />
    </div>
  );
}