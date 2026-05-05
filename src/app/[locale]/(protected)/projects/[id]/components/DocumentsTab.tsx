"use client";

import { Project, ProjectDocument } from "@/lib/types/projects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Download, Trash2, Calendar, MapPin, ExternalLink } from "lucide-react";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { documentsService } from "@/lib/services/documents-service";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  project: Project & { project_documents?: ProjectDocument[] };
  isAr: boolean;
}

export function DocumentsTab({ project, isAr }: Props) {
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.project_documents || []);

  const refreshDocuments = async () => {
    try {
      const data = await documentsService.getByProjectId(project.id);
      setDocuments(data);
    } catch (error) {
      console.error("Error refreshing documents:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه الوثيقة؟' : 'Supprimer ce document ?')) return;
    
    try {
      await documentsService.delete(id);
      toast.success(isAr ? 'تم الحذف بنجاح' : 'Supprimé avec succès');
      refreshDocuments();
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ أثناء الحذف' : 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{isAr ? 'وثائق المشروع' : 'Documents du projet'}</h3>
          <p className="text-sm text-slate-500">{isAr ? 'إدارة المخططات، التقارير والصور الميدانية' : 'Gérer les plans, rapports et photos'}</p>
        </div>
        <UploadDocumentModal isAr={isAr} projectId={project.id} onSuccess={refreshDocuments} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.length === 0 ? (
          <Card className="col-span-full py-12 border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-slate-500">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>{isAr ? 'لا توجد وثائق مرفوعة بعد' : 'Aucun document téléchargé'}</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {doc.file_type === 'image' ? (
                  <img 
                    src={doc.file_url} 
                    alt={doc.file_name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-slate-300" />
                    <span className="text-xs font-mono text-slate-400 uppercase">{doc.file_type}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="rounded-full" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button size="icon" variant="destructive" className="rounded-full" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate flex-1" title={doc.file_name}>
                    {doc.file_name}
                  </h4>
                </div>
                
                {doc.notes && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{doc.notes}</p>
                )}

                <div className="space-y-1.5 pt-3 border-t">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}
                  </div>
                  {doc.gps_coordinates && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {doc.gps_coordinates}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
