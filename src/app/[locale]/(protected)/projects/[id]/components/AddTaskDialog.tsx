"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Calendar, Clock, AlertCircle, User, Users } from "lucide-react";
import { toast } from "sonner";
import { tasksService } from "@/lib/services/tasks-service";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { ProjectTask, TaskPriority, TaskStatus, Worker } from "@/lib/types/projects";

interface Props {
  isAr: boolean;
  projectId: string;
  onSuccess?: () => void;
  task?: ProjectTask;
  trigger?: React.ReactNode;
}

export function AddTaskDialog({ isAr, projectId, onSuccess, task, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorkersLoading, setIsWorkersLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [formData, setFormData] = useState<Partial<ProjectTask>>({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    due_date: "",
    progress: 0,
    assigned_to: "unassigned",
    estimated_hours: 0,
    notes: "",
  });

  useEffect(() => {
    const fetchProjectWorkers = async () => {
      if (!open || !projectId) return;
      
      setIsWorkersLoading(true);
      try {
        const projectWorkers = await projectWorkersService.getByProjectId(projectId);
        
        // Safety check: Ensure projectWorkers is an array
        if (projectWorkers && Array.isArray(projectWorkers)) {
          // Extract worker objects from the join table data
          const workersList = projectWorkers
            .map(pw => pw.worker)
            .filter((w): w is Worker => !!w);
          setWorkers(workersList);
        } else {
          setWorkers([]);
        }
      } catch (error) {
        console.error('Error fetching project workers:', error);
        // Don't toast error here to avoid annoying the user if it's just a newly created table/cache issue
        setWorkers([]);
      } finally {
        setIsWorkersLoading(false);
      }
    };
    
    fetchProjectWorkers();
  }, [open, projectId]);

  useEffect(() => {
    if (task && open) {
      setFormData({
        ...task,
        assigned_to: task.assigned_to || "unassigned",
      });
    } else if (!task && open) {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        due_date: "",
        progress: 0,
        assigned_to: "unassigned",
        estimated_hours: 0,
        notes: "",
      });
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error(isAr ? 'العنوان مطلوب' : 'Le titre est requis');
      return;
    }

    if (!projectId) {
      toast.error(isAr ? 'خطأ في معرف المشروع' : 'Erreur ID projet');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare data for submission
      const submitData: any = { 
        ...formData,
        project_id: projectId 
      };

      // Handle unassigned state
      if (submitData.assigned_to === "unassigned") {
        submitData.assigned_to = null;
      }
      
      if (task) {
        await tasksService.update(task.id, submitData);
        toast.success(isAr ? 'تم تحديث المهمة بنجاح' : 'Tâche mise à jour avec succès');
      } else {
        await tasksService.create(submitData);
        toast.success(isAr ? 'تم إضافة المهمة بنجاح' : 'Tâche ajoutée avec succès');
      }
      
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorMsg = error?.message || (isAr ? 'حدث خطأ أثناء حفظ المهمة' : 'Erreur lors de l\'enregistrement de la tâche');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isEdit = !!task;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة مهمة جديدة' : 'Nouvelle Tâche'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`sm:max-w-[650px] max-h-[95vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl ${isAr ? 'rtl font-arabic' : 'ltr'}`}>
        <div className="bg-blue-600 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Plus className="w-6 h-6" />
              </div>
              {isEdit 
                ? (isAr ? 'تعديل المهمة' : 'Modifier la tâche') 
                : (isAr ? 'إضافة مهمة جديدة' : 'Ajouter une nouvelle tâche')}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white dark:bg-slate-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                {isAr ? 'عنوان المهمة' : 'Titre de la tâche'}
                <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="title"
                required 
                placeholder={isAr ? "أدخل عنوان المهمة..." : "Titre de la tâche..."}
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-11 focus-visible:ring-blue-500"
              />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                {isAr ? 'الوصف' : 'Description'}
              </Label>
              <Textarea 
                id="description"
                rows={3}
                placeholder={isAr ? "تفاصيل المهمة..." : "Détails de la tâche..."}
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="resize-none focus-visible:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-semibold">
                {isAr ? 'الأولوية' : 'Priorité'}
              </Label>
              <Select value={formData.priority} onValueChange={(v: TaskPriority) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger id="priority" className="h-11">
                  <SelectValue placeholder={isAr ? "اختر الأولوية" : "Choisir"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{isAr ? "منخفضة" : "Basse"}</SelectItem>
                  <SelectItem value="medium">{isAr ? "متوسطة" : "Moyenne"}</SelectItem>
                  <SelectItem value="high">{isAr ? "عالية" : "Haute"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-semibold">
                {isAr ? 'الحالة' : 'Statut'}
              </Label>
              <Select value={formData.status} onValueChange={(v: TaskStatus) => setFormData({ ...formData, status: v })}>
                <SelectTrigger id="status" className="h-11">
                  <SelectValue placeholder={isAr ? "اختر الحالة" : "Choisir"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">{isAr ? "للقيام بها" : "À faire"}</SelectItem>
                  <SelectItem value="in_progress">{isAr ? "قيد الإنجاز" : "En cours"}</SelectItem>
                  <SelectItem value="done">{isAr ? "مكتملة" : "Terminé"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date" className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                {isAr ? 'تاريخ الاستحقاق' : 'Date d\'échéance'}
              </Label>
              <Input 
                id="due_date"
                type="date"
                required
                value={formData.due_date || ''}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                className="h-11 focus-visible:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_hours" className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                {isAr ? 'الساعات المقدرة' : 'Heures estimées'}
              </Label>
              <Input 
                id="estimated_hours"
                type="number"
                step="0.5"
                placeholder="0.0"
                value={formData.estimated_hours || ''}
                onChange={e => setFormData({ ...formData, estimated_hours: Number(e.target.value) })}
                className="h-11 focus-visible:ring-blue-500"
              />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="assigned_to" className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                {isAr ? 'تعيين إلى (عامل في المشروع)' : 'Assigné à (ouvrier du projet)'}
              </Label>
              <Select disabled={isWorkersLoading} value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                <SelectTrigger id="assigned_to" className="h-11">
                  {isWorkersLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isAr ? 'جاري تحميل العمال...' : 'Chargement...'}
                    </div>
                  ) : (
                    <SelectValue placeholder={isAr ? "اختر عاملاً من المشروع" : "Choisir un ouvrier"} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">{isAr ? "غير معين" : "Non assigné"}</SelectItem>
                  {workers.length > 0 ? (
                    workers.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.full_name} ({w.job_title})</SelectItem>
                    ))
                  ) : !isWorkersLoading && (
                    <div className="p-2 text-xs text-center text-slate-500 italic">
                      {isAr ? 'لا يوجد عمال مخصصون للمشروع بعد' : 'Aucun ouvrier assigné au projet'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter className="mt-8 flex flex-row gap-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 min-w-[120px]">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAr ? 'حفظ المهمة' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
