"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, Plus, Trash2, Clock, HardHat, Construction, CheckCircle2, Loader2 } from "lucide-react";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import { Project, ProjectWorker, ProjectEquipment } from "@/lib/types/projects";
import { AssignResourceModal } from "./AssignResourceModal";
import { toast } from "sonner";

interface ResourcesTabProps {
  project: Project;
  isAr: boolean;
}

export function ResourcesTab({ project, isAr }: ResourcesTabProps) {
  const [assignedWorkers, setAssignedWorkers] = useState<ProjectWorker[]>([]);
  const [assignedEquipment, setAssignedEquipment] = useState<ProjectEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const [workersData, equipmentData] = await Promise.all([
        projectWorkersService.fetchProjectWorkers(project.id),
        projectEquipmentService.fetchProjectEquipment(project.id)
      ]);
      setAssignedWorkers(workersData);
      setAssignedEquipment(equipmentData);
    } catch (error) {
      console.error("Resources fetch error:", error);
      toast.error(isAr ? 'فشل في تحميل الموارد. يرجى التحقق من اتصال قاعدة البيانات.' : 'Échec du chargement des ressources. Veuillez vérifier la connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [project.id]);

  const handleRemoveWorker = async (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من إزالة هذا العامل؟' : 'Confirmer la suppression de cet ouvrier?')) {
      try {
        await projectWorkersService.remove(id);
        toast.success(isAr ? 'تمت الإزالة بنجاح' : 'Retiré avec succès');
        fetchResources();
      } catch (error) {
        toast.error(isAr ? 'حدث خطأ ما' : 'Une erreur est survenue');
      }
    }
  };

  const handleRemoveEquipment = async (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من إزالة هذا العتاد؟' : 'Confirmer la suppression de cet équipement?')) {
      try {
        await projectEquipmentService.remove(id);
        toast.success(isAr ? 'تمت الإزالة بنجاح' : 'Retiré avec succès');
        fetchResources();
      } catch (error) {
        toast.error(isAr ? 'حدث خطأ ما' : 'Une erreur est survenue');
      }
    }
  };

  // Calculate daily cost
  const totalDailyCost = assignedWorkers.reduce((acc, pw) => {
    const dailyRate = pw.worker?.daily_rate || 0;
    return acc + dailyRate;
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{isAr ? 'إجمالي العمال' : 'Total Ouvriers'}</p>
                <h3 className="text-2xl font-bold mt-1">{assignedWorkers.length}</h3>
              </div>
              <Users className="w-8 h-8 text-blue-200 dark:text-blue-900/40" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{isAr ? 'التكلفة اليومية للعمال' : 'Coût journalier MO'}</p>
                <h3 className="text-2xl font-bold mt-1">{totalDailyCost.toLocaleString()} <span className="text-sm font-normal">DZD</span></h3>
              </div>
              <Plus className="w-8 h-8 text-emerald-200 dark:text-emerald-900/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{isAr ? 'إجمالي العتاد' : 'Total Équipements'}</p>
                <h3 className="text-2xl font-bold mt-1">{assignedEquipment.length}</h3>
              </div>
              <Truck className="w-8 h-8 text-slate-200 dark:text-slate-800" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{isAr ? 'العمال المخصصون لهذا المشروع' : 'Ouvriers assignés'}</CardTitle>
              <p className="text-xs text-slate-500">{isAr ? 'قائمة القوى العاملة النشطة في هذا الموقع' : 'Liste des ouvriers travaillant sur ce projet'}</p>
            </div>
          </div>
          <AssignResourceModal 
            type="worker" 
            projectId={project.id} 
            isAr={isAr} 
            onSuccess={fetchResources}
            excludeIds={assignedWorkers.map(aw => aw.worker_id)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableHead>{isAr ? 'العامل' : 'Ouvrier'}</TableHead>
                <TableHead>{isAr ? 'الدور في المشروع' : 'Rôle'}</TableHead>
                <TableHead>{isAr ? 'ساعات العمل/يوم' : 'Heures/jour'}</TableHead>
                <TableHead>{isAr ? 'التكلفة اليومية' : 'Coût/J'}</TableHead>
                <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm text-slate-500">{isAr ? 'جاري التحميل...' : 'Chargement...'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : assignedWorkers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-[300px] mx-auto gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{isAr ? 'لا يوجد عمال' : 'Aucun ouvrier'}</p>
                        <p className="text-sm text-slate-500">{isAr ? 'لم يتم تعيين أي عمال لهذا المشروع بعد.' : 'Aucun ouvrier n\'a encore été affecté à ce projet.'}</p>
                      </div>
                      <AssignResourceModal 
                        type="worker" 
                        projectId={project.id} 
                        isAr={isAr} 
                        onSuccess={fetchResources}
                        excludeIds={assignedWorkers.map(aw => aw.worker_id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                assignedWorkers.map((pw) => (
                  <TableRow key={pw.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                          {pw.worker?.photo_url ? (
                            <img src={pw.worker.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <HardHat className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{pw.worker?.full_name}</span>
                          <span className="text-[11px] text-slate-500 uppercase font-medium tracking-wider">{pw.worker?.job_title}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal bg-blue-50/50 text-blue-700 border-blue-100">
                        {pw.assigned_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {pw.daily_hours}h
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {pw.worker?.daily_rate?.toLocaleString()} <span className="text-[11px] text-slate-500 font-normal ml-1">DZD</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => handleRemoveWorker(pw.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Equipment Section (Stays similar for now) */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <Construction className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{isAr ? 'العتاد المستخدم' : 'Équipement utilisé'}</CardTitle>
              <p className="text-xs text-slate-500">{isAr ? 'الآلات والمعدات المخصصة لهذا الموقع' : 'Machines et équipements affectés à ce chantier'}</p>
            </div>
          </div>
          <AssignResourceModal 
            type="equipment" 
            projectId={project.id} 
            isAr={isAr} 
            onSuccess={fetchResources}
            excludeIds={assignedEquipment.map(ae => ae.equipment_id)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableHead>{isAr ? 'العتاد' : 'Équipement'}</TableHead>
                <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{isAr ? 'الاستخدام (ساعة/يوم)' : 'Utilisation/jour'}</TableHead>
                <TableHead>{isAr ? 'تاريخ التعيين' : 'Assigné le'}</TableHead>
                <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <p className="text-sm text-slate-500">{isAr ? 'جاري التحميل...' : 'Chargement...'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : assignedEquipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-[300px] mx-auto gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                        <Construction className="w-8 h-8 text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{isAr ? 'لا يوجد عتاد' : 'Aucun équipement'}</p>
                        <p className="text-sm text-slate-500">{isAr ? 'لم يتم تخصيص أي عتاد لهذا المشروع بعد.' : 'Aucun équipement n\'a encore été affecté à ce projet.'}</p>
                      </div>
                      <AssignResourceModal 
                        type="equipment" 
                        projectId={project.id} 
                        isAr={isAr} 
                        onSuccess={fetchResources}
                        excludeIds={assignedEquipment.map(ae => ae.equipment_id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                assignedEquipment.map((pe) => (
                  <TableRow key={pe.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                          <Truck className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{pe.equipment?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal bg-slate-50 text-slate-600 border-slate-200">
                        {pe.equipment?.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {pe.usage_hours_per_day}h
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {pe.assigned_at ? new Date(pe.assigned_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => handleRemoveEquipment(pe.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
