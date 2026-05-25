"use client";

import { Project, ProjectDocument } from "@/lib/types/projects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Eye,
  User,
  LayoutGrid,
  List,
  FileSpreadsheet,
  FileSignature
} from "lucide-react";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { documentService } from "@/lib/services/document-service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface Props {
  project: Project & { project_documents?: ProjectDocument[] };
  isAr: boolean;
}

export function DocumentsTab({ project, isAr }: Props) {
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.project_documents || []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    getUser();
  }, []);

  const refreshDocuments = async () => {
    try {
      const data = await documentService.getProjectDocuments(project.id);
      setDocuments(data);
    } catch (error) {
      console.error("Error refreshing documents:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه الوثيقة؟' : 'Supprimer ce document ?')) return;
    
    try {
      await documentService.deleteDocument(id);
      toast.success(isAr ? 'تم الحذف بنجاح' : 'Supprimé avec succès');
      refreshDocuments();
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ أثناء الحذف' : 'Erreur lors de la suppression');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <ImageIcon className="w-8 h-8 text-emerald-500" />;
      case 'pdf':
        return <FileText className="w-8 h-8 text-rose-500" />;
      case 'spreadsheet':
      case 'xls':
      case 'xlsx':
      case 'excel':
        return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
      case 'word':
      case 'doc':
      case 'docx':
        return <FileSignature className="w-8 h-8 text-blue-500" />;
      default:
        return <FileText className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isAr ? 'وثائق ومستندات المشروع' : 'Documents et fichiers du projet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAr ? 'إدارة المخططات الهندسية، صور الموقع والتقارير اليومية للمشروع' : 'Gérer les plans, les photos de terrain et les rapports'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg p-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className={`h-8 w-8 rounded-md ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-400'}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className={`h-8 w-8 rounded-md ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-400'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <UploadDocumentModal isAr={isAr} projectId={project.id} onSuccess={refreshDocuments} />
        </div>
      </div>

      {documents.length === 0 ? (
        <Card className="py-16 border-dashed border-2 bg-slate-50/50 dark:bg-slate-950/20">
          <CardContent className="flex flex-col items-center justify-center text-slate-500 max-w-sm mx-auto text-center">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-full border shadow-sm mb-4">
              <FileText className="w-10 h-10 text-slate-400 opacity-80" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
              {isAr ? 'لا توجد وثائق بعد' : 'Aucun document'}
            </h4>
            <p className="text-xs text-slate-400">
              {isAr ? 'قم برفع أول وثيقة أو صورة ميدانية للمشروع للبدء في تنظيم ملفاتك.' : 'Téléchargez le premier document ou photo de terrain.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const isOwner = currentUserId === doc.uploaded_by;
            const isImage = ['image', 'png', 'jpg', 'jpeg'].includes(doc.file_type?.toLowerCase());

            return (
              <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-all duration-300 group border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="aspect-video bg-slate-50 dark:bg-slate-900 relative overflow-hidden flex items-center justify-center border-b dark:border-slate-850">
                  {isImage ? (
                    <img 
                      src={doc.file_url} 
                      alt={doc.file_name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-white dark:bg-slate-950 rounded-full border shadow-sm">
                        {getFileIcon(doc.file_type)}
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">{doc.file_type}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <Button size="icon" variant="secondary" className="rounded-full h-9 w-9 bg-white text-slate-900 shadow hover:bg-slate-100" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4.5 h-4.5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full h-9 w-9 bg-white text-slate-900 shadow hover:bg-slate-100" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4.5 h-4.5" />
                      </a>
                    </Button>
                    {isOwner && (
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="rounded-full h-9 w-9 shadow-md" 
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate" title={doc.file_name}>
                      {doc.file_name}
                    </h4>
                    {doc.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{doc.notes}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}
                      </span>
                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        {isAr ? 'المستخدم' : 'User'}
                      </span>
                    </div>
                    {doc.gps_coordinates && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="font-mono">{doc.gps_coordinates}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th scope="col" className="px-6 py-4">{isAr ? 'اسم الملف' : 'Nom du fichier'}</th>
                  <th scope="col" className="px-6 py-4">{isAr ? 'النوع' : 'Type'}</th>
                  <th scope="col" className="px-6 py-4">{isAr ? 'تاريخ الرفع' : 'Date de télé'}</th>
                  <th scope="col" className="px-6 py-4">{isAr ? 'بواسطة' : 'Par'}</th>
                  <th scope="col" className="px-6 py-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {documents.map((doc) => {
                  const isOwner = currentUserId === doc.uploaded_by;
                  return (
                    <tr key={doc.id} className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 max-w-[240px] truncate">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.file_type)}
                          <span title={doc.file_name}>{doc.file_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs uppercase font-medium">
                          {doc.file_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isAr ? 'عضو فريق' : 'Membre'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </a>
                          </Button>
                          {isOwner && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500" 
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
