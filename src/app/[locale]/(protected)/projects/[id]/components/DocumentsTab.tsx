"use client";


import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";


import { useState, useEffect } from "react";
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
  MapPin,
  Eye,
  User,
  LayoutGrid,
  List,
  FileSpreadsheet,
  FileSignature,
  FileSearch,
  Plus,
  Loader2
} from "lucide-react";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { documentService } from "@/lib/services/document-service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  project: Project & { project_documents?: ProjectDocument[] };
  isAr: boolean;
}

export function DocumentsTab({ project, isAr }: Props) {
  // ─── States ───
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.project_documents || []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(false);

  // ─── إدارة حالة الحذف (New) ───
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      refreshDocuments();
    }
    init();
  }, [project.id]);

  const refreshDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getProjectDocuments(project.id);
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── منطق الحذف الاحترافي ───
  const askDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await documentService.deleteDocument(itemToDelete);
      toast.success(isAr ? 'تم حذف الوثيقة بنجاح ✓' : 'Document supprimé ✓');
      setDocuments(prev => prev.filter(doc => doc.id !== itemToDelete));
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ أثناء المحاولة' : 'Erreur de suppression');
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500" dir={isAr ? "rtl" : "ltr"}>

      {/* ─── الحوار المشترك لتأكيد الحذف ─── */}
      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف مستند المشروع" : "Supprimer le document"}
        description={isAr
          ? "هل أنت متأكد من حذف هذه الوثيقة نهائياً؟ هذا الإجراء سيمسح الملف من مساحة التخزين أيضاً ولا يمكن التراجع عنه."
          : "Voulez-vous vraiment supprimer ce document ? L'action est irréversible et supprimera le fichier définitivement."}
      />

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-start">
            <h3 className="text-lg font-extrabold tracking-tight">
              {isAr ? 'خزانة المستندات والوثائق' : 'Gestion documentaire'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {isAr ? `يحتوي هذا المشروع على ${documents.length} ملف مشترك` : `${documents.length} fichiers partagés dans ce projet`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <Button
              size="icon" variant="ghost" className={`h-8 w-8 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              size="icon" variant="ghost" className={`h-8 w-8 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <UploadDocumentModal isAr={isAr} projectId={project.id} onSuccess={refreshDocuments} />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="font-bold text-xs uppercase tracking-widest">{isAr ? 'جاري التزامن...' : 'Synchronisation...'}</p>
        </div>
      ) : documents.length === 0 ? (
        <Card className="py-20 border-dashed border-2 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center justify-center text-center">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm mb-4 border border-slate-100">
            <FileSearch className="w-12 h-12 text-slate-200" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
            {isAr ? 'لا توجد وثائق حالياً' : 'Aucun document'}
          </h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2 font-medium uppercase tracking-tight">
            {isAr ? 'ابدأ برفع مخططات الموقع أو التقارير الفنية هنا' : 'Veuillez télécharger les plans ou rapports de site'}
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {documents.map((doc) => {
            const isOwner = currentUserId === doc.uploaded_by;
            const isImage = ['image', 'png', 'jpg', 'jpeg', 'webp'].includes(doc.file_type?.toLowerCase());

            return (
              <Card key={doc.id} className="group overflow-hidden border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 dark:bg-slate-950 flex flex-col rounded-2xl shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border-b">
                  {isImage ? (
                    <img src={doc.file_url} alt={doc.file_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 scale-125">
                      {getFileIcon(doc.file_type)}
                    </div>
                  )}

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                    <Button size="icon" variant="secondary" className="rounded-full bg-white text-slate-900 shadow-xl hover:scale-110 transition-transform" asChild title={isAr ? "تحميل" : "Télécharger"}>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full bg-white text-slate-900 shadow-xl hover:scale-110 transition-transform" asChild title={isAr ? "معاينة" : "Voir"}>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a>
                    </Button>
                    {isOwner && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="rounded-full shadow-xl hover:scale-110 transition-transform"
                        onClick={() => askDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="absolute top-2 right-2">
                    <Badge className="bg-white/90 text-slate-900 backdrop-blur-md border-0 uppercase text-[9px] font-black tracking-widest shadow-sm">
                      {doc.file_type}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between text-start">
                  <div>
                    <h4 className="font-bold text-[13px] text-slate-900 dark:text-slate-100 truncate" title={doc.file_name}>
                      {doc.file_name}
                    </h4>
                    {doc.notes && <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 italic font-medium opacity-80">"{doc.notes}"</p>}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-400 uppercase tracking-tighter">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}
                    </div>
                    {isOwner && <span className="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">{isAr ? "مرفوع قبلك" : "By you"}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <Card className="border-slate-200 overflow-hidden shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start" dir={isAr ? "rtl" : "ltr"}>
              <thead className="bg-slate-50/50 dark:bg-slate-900/60 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                <tr>
                  <th className="px-6 py-4">{isAr ? 'الملف' : 'Fichier'}</th>
                  <th className="px-6 py-4">{isAr ? 'التصنيف' : 'Format'}</th>
                  <th className="px-6 py-4">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="px-6 py-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {documents.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-start">
                        <div className="p-2 border rounded-lg bg-white dark:bg-slate-800 shadow-sm group-hover:scale-105 transition-transform">
                          {getFileIcon(doc.file_type)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate block max-w-[240px]" title={doc.file_name}>{doc.file_name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 opacity-60"><User className="w-3 h-3" /><span className="text-[10px] font-bold uppercase">{isAr ? 'مستخدم المنصة' : 'Team User'}</span></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-[9px] uppercase font-black bg-slate-100 text-slate-500">{doc.file_type}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-[10px] font-black uppercase tabular-nums tracking-tighter">
                      {new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-blue-600 transition-colors" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-blue-600 transition-colors" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a>
                        </Button>
                        {currentUserId === doc.uploaded_by && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100" onClick={() => askDelete(doc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
