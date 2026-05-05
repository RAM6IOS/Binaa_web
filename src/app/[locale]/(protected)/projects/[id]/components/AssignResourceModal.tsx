"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Plus, Users, Truck, Check } from "lucide-react";
import { workersService } from "@/lib/services/workers-service";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { equipmentService } from "@/lib/services/equipment-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import { Worker, Equipment, ProjectWorker } from "@/lib/types/projects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AssignResourceModalProps {
  type: 'worker' | 'equipment';
  projectId: string;
  isAr: boolean;
  onSuccess: () => void;
  excludeIds: string[];
}

export function AssignResourceModal({ type, projectId, isAr, onSuccess, excludeIds }: AssignResourceModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [availableResources, setAvailableResources] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Assignment specific data
  const [assignedRole, setAssignedRole] = useState("");
  const [hours, setHours] = useState("8");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (open) {
      const fetchAvailable = async () => {
        setIsLoading(true);
        try {
          if (type === 'worker') {
            const data = await workersService.getAll();
            setAvailableResources(data.filter(w => !excludeIds.includes(w.id)));
          } else {
            const data = await equipmentService.getAll();
            setAvailableResources(data.filter(e => !excludeIds.includes(e.id)));
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchAvailable();
    }
  }, [open, type, excludeIds]);

  const filtered = availableResources.filter(r => {
    const term = searchQuery.toLowerCase();
    const name = type === 'worker' ? r.full_name : r.name;
    return name?.toLowerCase().includes(term);
  });

  const toggleSelection = (id: string) => {
    if (type === 'equipment') {
      setSelectedIds([id]); // Single select for equipment
      return;
    }

    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      if (type === 'worker') {
        const assignments = selectedIds.map(workerId => ({
          project_id: projectId,
          worker_id: workerId,
          assigned_role: assignedRole || "Ouvrier",
          daily_hours: Number(hours),
          start_date: startDate,
          status: 'active' as const
        }));
        await projectWorkersService.assign(assignments);
        toast.success(isAr ? 'تم تعيين العمال بنجاح' : 'Ouvriers assignés avec succès');
      } else {
        await projectEquipmentService.assign({
          project_id: projectId,
          equipment_id: selectedIds[0],
          usage_hours_per_day: Number(hours),
        });
        toast.success(isAr ? 'تمت إضافة العتاد' : 'Équipement ajouté');
      }
      setOpen(false);
      onSuccess();
      // Reset
      setSelectedIds([]);
      setAssignedRole("");
      setHours("8");
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ ما' : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {isAr 
            ? (type === 'worker' ? 'تعيين عمال' : 'إضافة عتاد') 
            : (type === 'worker' ? 'Assigner ouvriers' : 'Ajouter équipement')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] flex flex-col h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {isAr 
              ? (type === 'worker' ? 'تعيين عمال للمشروع' : 'تخصيص عتاد للمشروع') 
              : (type === 'worker' ? 'Assigner des ouvriers' : 'Affecter un équipement')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 py-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder={isAr ? 'ابحث...' : 'Rechercher...'} 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {isAr ? 'لا توجد نتائج متاحة' : 'Aucun résultat disponible'}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((item) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors",
                      selectedIds.includes(item.id) && "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                    )}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        {type === 'worker' && item.photo_url ? (
                          <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          type === 'worker' ? <Users className="w-5 h-5 text-slate-400" /> : <Truck className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {type === 'worker' ? item.full_name : item.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {type === 'worker' 
                            ? item.job_title 
                            : item.type}
                        </div>
                      </div>
                    </div>
                    {selectedIds.includes(item.id) && <Check className="w-4 h-4 text-blue-500" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                {type === 'worker' && (
                  <>
                    <div className="space-y-2 col-span-2">
                      <Label>{isAr ? 'الدور المخصص' : 'Rôle assigné'}</Label>
                      <Input value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)} placeholder={isAr ? "بناء، رئيس ورشة..." : "Maçon, Chef..."} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'تاريخ البدء' : 'Date de début'}</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                  </>
                )}
                <div className={cn("space-y-2", type === 'equipment' && "col-span-2")}>
                  <Label>{isAr ? 'ساعات العمل اليومية' : 'Heures / jour'}</Label>
                  <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Annuler'}</Button>
          <Button 
            disabled={selectedIds.length === 0 || isSubmitting} 
            onClick={handleAssign}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isAr 
              ? `تأكيد تعيين (${selectedIds.length})` 
              : `Confirmer (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
