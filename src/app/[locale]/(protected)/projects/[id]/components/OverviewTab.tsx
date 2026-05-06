"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Project, ProjectStatus } from "@/lib/types/projects";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectsService } from "@/lib/services/projects-service";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  project: Project;
  isAr: boolean;
  onRefresh?: () => void;
}

export function OverviewTab({ project, isAr, onRefresh }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);

  const [editStatus, setEditStatus] = useState<ProjectStatus>(project.status);
  const [editProgress, setEditProgress] = useState(project.progress);
  const [editActualCost, setEditActualCost] = useState(project.actual_cost);

  // Sync state with props when project changes (e.g. via real-time update)
  useEffect(() => {
    setEditStatus(project.status);
    setEditProgress(project.progress);
    setEditActualCost(project.actual_cost);
  }, [project.status, project.progress, project.actual_cost]);

  const handleUpdate = async (field: keyof Project, value: any) => {
    setIsUpdating(true);
    try {
      await projectsService.update(project.id, { [field]: value });
      toast.success(isAr ? 'تم التحديث بنجاح' : 'Mise à jour réussie');
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ' : 'Erreur');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4 animate-in fade-in duration-500" dir={isAr ? 'rtl' : 'ltr'}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>{isAr ? 'تفاصيل المشروع' : 'Détails du projet'}</CardTitle>
          <CardDescription>{isAr ? 'معلومات عامة' : 'Informations générales'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{isAr ? 'العميل / المالك' : 'Client'}</p>
              <p className="text-sm font-medium">{project.client_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{isAr ? 'رقم العقد' : 'N° Contrat'}</p>
              <p className="text-sm font-medium font-mono">{project.contract_number || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{isAr ? 'وصف المشروع' : 'Description'}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{project.description || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{project.notes || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>{isAr ? 'الحالة والتقدم' : 'Statut et Progrès'}</CardTitle>
          <CardDescription>{isAr ? 'تحديث الحالة والنسب' : 'Mise à jour du statut et pourcentage'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{isAr ? 'الحالة التشغيلية' : 'Statut'}</label>
            <div className="flex gap-2">
              <Select 
                value={editStatus} 
                onValueChange={(v: ProjectStatus) => {
                  setEditStatus(v);
                  handleUpdate('status', v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">{isAr ? "قيد التخطيط" : "En planification"}</SelectItem>
                  <SelectItem value="in_progress">{isAr ? "قيد الإنجاز" : "En cours"}</SelectItem>
                  <SelectItem value="completed">{isAr ? "مكتمل" : "Terminé"}</SelectItem>
                  <SelectItem value="delayed">{isAr ? "متأخر" : "En retard"}</SelectItem>
                  <SelectItem value="cancelled">{isAr ? "ملغى" : "Annulé"}</SelectItem>
                </SelectContent>
              </Select>
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-blue-500 self-center" />}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">{isAr ? 'نسبة التقدم (%)' : 'Progrès (%)'}</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  min="0" max="100" 
                  className="w-20 h-8 text-right"
                  value={editProgress}
                  onChange={(e) => setEditProgress(Number(e.target.value))}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleUpdate('progress', editProgress)}>
                   <Check className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <ProgressBar progress={project.progress} status={project.status} showText={false} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>{isAr ? 'الميزانية والتكاليف' : 'Budget et Coûts'}</CardTitle>
          <CardDescription>{isAr ? 'ملخص الاستهلاك المالي' : 'Résumé de la consommation financière'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
             <p className="text-sm text-slate-500">{isAr ? 'الميزانية المخصصة' : 'Budget alloué'}</p>
             <div className="text-3xl font-bold text-slate-900 dark:text-white">
               {project.budget.toLocaleString()} <span className="text-sm text-slate-500 font-normal">DZD</span>
             </div>
          </div>
          
          <div className="space-y-3 pt-4 border-t">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-red-600 dark:text-red-400">{isAr ? 'التكلفة الفعلية (المستهلك)' : 'Coût réel (Consommé)'}</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  className="flex-1 font-semibold text-red-600 dark:text-red-400"
                  value={editActualCost}
                  onChange={(e) => setEditActualCost(Number(e.target.value))}
                />
                <Button variant="outline" className="text-blue-600" onClick={() => handleUpdate('actual_cost', editActualCost)}>
                   {isAr ? 'تحديث' : 'Mettre à jour'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isAr ? 'نسبة الاستهلاك' : 'Taux de consommation'}</span>
                <span>{project.budget > 0 ? Math.round((project.actual_cost / project.budget) * 100) : 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-400 dark:bg-red-500 transition-all duration-500" 
                  style={{ width: `${project.budget > 0 ? Math.min(100, (project.actual_cost / project.budget) * 100) : 0}%` }} 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>{isAr ? 'الموقع' : 'Emplacement'}</CardTitle>
          <CardDescription>{project.wilaya}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-300 dark:border-slate-700 relative overflow-hidden">
             {/* Map Placeholder */}
             <div className="absolute inset-0 opacity-20 bg-[url('https://maps.wikimedia.org/osm-intl/12/2114/1569.png')] bg-cover bg-center mix-blend-luminosity"></div>
             <p className="text-slate-500 z-10 font-medium bg-white/80 dark:bg-black/80 px-4 py-2 rounded-md shadow-sm text-center">
                [ {isAr ? 'خريطة GPS' : 'Carte GPS'} ]<br/>
                <span className="text-xs font-mono">{project.location_coordinates || 'No Coordinates'}</span>
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
