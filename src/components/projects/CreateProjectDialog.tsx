"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Project, ProjectType } from "@/lib/types/projects";

interface Props {
  isAr: boolean;
  onSuccess?: () => void;
  project?: Project;
  trigger?: React.ReactNode;
}

export function CreateProjectDialog({ isAr, onSuccess, project, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Project>>({
    name: "",
    project_type: "road",
    description: "",
    wilaya: "",
    start_date: "",
    expected_end_date: "",
    budget: 0,
    contract_number: "",
    client_name: "",
    location_coordinates: "",
    notes: "",
  });

  useEffect(() => {
    if (project && open) {
      setFormData(project);
    } else if (!project && open) {
      setFormData({
        name: "",
        project_type: "road",
        description: "",
        wilaya: "",
        start_date: "",
        expected_end_date: "",
        budget: 0,
        contract_number: "",
        client_name: "",
        location_coordinates: "",
        notes: "",
      });
    }
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(isAr ? 'يجب تسجيل الدخول أولاً' : 'Vous devez d\'abord vous connecter');
        return;
      }

      if (project) {
        const { error } = await supabase
          .from('projects')
          .update(formData)
          .eq('id', project.id);
        
        if (error) throw error;
        toast.success(isAr ? 'تم تحديث المشروع بنجاح' : 'Projet mis à jour avec succès');
      } else {
        const { location_coordinates, ...insertData } = formData;
        const { error } = await supabase
          .from('projects')
          .insert({
            ...(insertData as Omit<Project, 'id'>),
            status: 'planning',
            actual_cost: 0,
            progress: 0,
            created_by: user.id
          });
        
        if (error) throw error;
        toast.success(isAr ? 'تم إنشاء المشروع بنجاح' : 'Projet créé avec succès');
      }
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error(isAr ? 'حدث خطأ أثناء الحفظ' : 'Une erreur est survenue lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  const isEdit = !!project;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة مشروع جديد' : 'Nouveau Projet'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`sm:max-w-[700px] max-h-[90vh] overflow-y-auto ${isAr ? 'rtl' : 'ltr'}`}>
        <DialogHeader>
          <DialogTitle>
            {isEdit 
              ? (isAr ? 'تعديل بيانات المشروع' : 'Modifier le projet') 
              : (isAr ? 'إضافة مشروع جديد' : 'Ajouter un nouveau projet')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="name">{isAr ? 'اسم المشروع' : 'Nom du projet'}</Label>
              <Input 
                id="name"
                required 
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type">{isAr ? 'نوع المشروع' : 'Type de projet'}</Label>
              <Select value={formData.project_type} onValueChange={(v: ProjectType) => setFormData({ ...formData, project_type: v })}>
                <SelectTrigger id="project_type">
                  <SelectValue placeholder={isAr ? "اختر النوع" : "Choisir le type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="road">{isAr ? "طرق" : "Route"}</SelectItem>
                  <SelectItem value="bridge">{isAr ? "جسور" : "Pont"}</SelectItem>
                  <SelectItem value="housing">{isAr ? "سكن" : "Logement"}</SelectItem>
                  <SelectItem value="school">{isAr ? "مدرسة" : "École"}</SelectItem>
                  <SelectItem value="hospital">{isAr ? "مستشفى" : "Hôpital"}</SelectItem>
                  <SelectItem value="infrastructure">{isAr ? "بنية تحتية" : "Infrastructure"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wilaya">{isAr ? 'الولاية' : 'Wilaya'}</Label>
              <Input 
                id="wilaya"
                required 
                value={formData.wilaya || ''}
                onChange={e => setFormData({ ...formData, wilaya: e.target.value })}
                placeholder="Oran, Alger..."
              />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="description">{isAr ? 'وصف المشروع' : 'Description'}</Label>
              <Textarea 
                id="description"
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">{isAr ? 'تاريخ البدء' : 'Date de début'}</Label>
              <Input 
                id="start_date"
                type="date"
                required 
                value={formData.start_date || ''}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_end_date">{isAr ? 'تاريخ الانتهاء المتوقع' : 'Date de fin prévue'}</Label>
              <Input 
                id="expected_end_date"
                type="date"
                required 
                value={formData.expected_end_date || ''}
                onChange={e => setFormData({ ...formData, expected_end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">{isAr ? 'الميزانية (دج)' : 'Budget (DZD)'}</Label>
              <Input 
                id="budget"
                type="number"
                required 
                value={formData.budget || ''}
                onChange={e => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_number">{isAr ? 'رقم العقد' : 'Numéro de contrat'}</Label>
              <Input 
                id="contract_number"
                value={formData.contract_number || ''}
                onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">{isAr ? 'اسم العميل / الجهة المالكة' : 'Nom du client'}</Label>
              <Input 
                id="client_name"
                value={formData.client_name || ''}
                onChange={e => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_coordinates">{isAr ? 'إحداثيات الموقع' : 'Coordonnées (GPS)'}</Label>
              <Input 
                id="location_coordinates"
                value={formData.location_coordinates || ''}
                onChange={e => setFormData({ ...formData, location_coordinates: e.target.value })}
                placeholder="35.6987, -0.6341"
              />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="notes">{isAr ? 'ملاحظات إضافية' : 'Notes supplémentaires'}</Label>
              <Textarea 
                id="notes"
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAr ? 'حفظ المشروع' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
