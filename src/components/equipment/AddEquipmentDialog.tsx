"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Construction, Loader2, PlusCircle, UploadCloud } from "lucide-react";
import { equipmentService } from "@/lib/services/equipment-service";
import { Equipment, EquipmentStatus, MaintenanceStatus, OwnerType } from "@/lib/types/projects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AddEquipmentDialogProps {
  isAr: boolean;
  onSuccess: () => void;
  equipment?: Equipment; // If provided, we are in Edit mode
  trigger?: React.ReactNode;
}

export function AddEquipmentDialog({ isAr, onSuccess, equipment, trigger }: AddEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Equipment>>({
    name: "",
    type: "",
    category: "",
    brand: "",
    model: "",
    serial_number: "",
    plate_number: "",
    year_of_manufacture: undefined,
    hourly_rate: 0,
    daily_rate: 0,
    wilaya: "",
    current_location: "",
    status: "available",
    owner_type: "company",
    photo_url: "",
    total_hours_used: 0,
    hours_since_last_maintenance: 0,
    maintenance_last_date: "",
    maintenance_next_due: "",
    maintenance_interval_hours: undefined,
    maintenance_status: "up_to_date",
    maintenance_cost: 0,
    maintenance_notes: "",
    warranty_expiry: "",
    supplier_maintenance_contact: "",
  });

  useEffect(() => {
    if (equipment && open) {
      setFormData(equipment);
    } else if (!equipment && open) {
      setFormData({
        name: "",
        type: "",
        category: "",
        brand: "",
        model: "",
        serial_number: "",
        plate_number: "",
        year_of_manufacture: undefined,
        hourly_rate: 0,
        daily_rate: 0,
        wilaya: "",
        current_location: "",
        status: "available",
        owner_type: "company",
        photo_url: "",
        total_hours_used: 0,
        hours_since_last_maintenance: 0,
        maintenance_last_date: "",
        maintenance_next_due: "",
        maintenance_interval_hours: undefined,
        maintenance_status: "up_to_date",
        maintenance_cost: 0,
        maintenance_notes: "",
        warranty_expiry: "",
        supplier_maintenance_contact: "",
      });
    }
  }, [equipment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const cleanData = { ...formData };
    
    // Convert empty strings to null for optional fields (important for Postgres Date/Integer columns)
    const optionalFields = [
      'plate_number', 
      'current_location', 
      'photo_url', 
      'maintenance_last_date', 
      'maintenance_next_due', 
      'maintenance_notes', 
      'warranty_expiry', 
      'supplier_maintenance_contact',
      'maintenance_interval_hours',
      'year_of_manufacture'
    ];

    optionalFields.forEach(field => {
      const value = cleanData[field as keyof Equipment];
      if (value === "" || value === undefined || (typeof value === 'number' && isNaN(value))) {
        (cleanData as any)[field] = null;
      }
    });

    try {
      if (equipment) {
        await equipmentService.update(equipment.id, cleanData);
        toast.success(isAr ? 'تم تحديث بيانات المعدة' : 'Équipement mis à jour');
      } else {
        await equipmentService.create(cleanData as Omit<Equipment, 'id' | 'created_at'>);
        toast.success(isAr ? 'تم إضافة المعدة بنجاح' : 'Équipement ajouté avec succès');
      }
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving equipment:', JSON.stringify(error, null, 2));
      const errorMsg = error?.message || error?.details || (isAr ? 'حدث خطأ أثناء الحفظ' : 'Une erreur est survenue');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isEdit = !!equipment;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="w-4 h-4" />
            {isAr ? 'إضافة عتاد جديد' : 'Ajouter un équipement'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit 
              ? (isAr ? 'تعديل بيانات المعدة' : 'Modifier l\'équipement') 
              : (isAr ? 'إضافة معدات أو آلات جديدة' : 'Ajouter un nouvel équipement')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-8 py-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            
            {/* --- القسم الأول: المعلومات الأساسية --- */}
            <div className="col-span-2 border-b pb-2 mb-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {isAr ? 'المعلومات الأساسية' : 'Informations de base'}
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'اسم المعدة' : 'Nom de l\'équipement'}</Label>
              <Input 
                id="name" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={isAr ? 'مثال: حفارة هيدروليكية' : 'Ex: Pelle hydraulique'} 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'النوع' : 'Type'}</Label>
              <Input 
                id="type" 
                required 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                placeholder={isAr ? 'مثال: حفارة' : 'Ex: Excavatrice'} 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الفئة' : 'Catégorie'}</Label>
              <Input 
                id="category" 
                required 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder={isAr ? 'مثال: آلات ثقيلة' : 'Ex: Engins lourds'} 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'العلامة التجارية' : 'Marque'}</Label>
              <Input 
                id="brand" 
                required 
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                placeholder="Caterpillar, Liebherr..." 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الموديل' : 'Modèle'}</Label>
              <Input 
                id="model" 
                required 
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                placeholder="320D, HTM 904..." 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الرقم التسلسلي' : 'N° de série'}</Label>
              <Input 
                id="serial_number" 
                required 
                value={formData.serial_number}
                onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                placeholder="SN-123456" 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate_number" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'رقم اللوحة' : 'N° d\'immatriculation'}</Label>
              <Input 
                id="plate_number" 
                value={formData.plate_number || ""}
                onChange={(e) => setFormData({...formData, plate_number: e.target.value})}
                placeholder="12345-123-16" 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'سنة الصنع' : 'Année de fabrication'}</Label>
              <Input 
                id="year" 
                type="number"
                value={formData.year_of_manufacture || ""}
                onChange={(e) => setFormData({...formData, year_of_manufacture: parseInt(e.target.value)})}
                placeholder="2023" 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* --- القسم الثاني: التكاليف والحالة --- */}
            <div className="col-span-2 border-b pb-2 mb-2 mt-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {isAr ? 'التكاليف والتشغيل' : 'Coûts et Opérations'}
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الأجر بالساعة (دج)' : 'Taux horaire (DZD)'}</Label>
              <Input 
                id="hourly_rate" 
                type="number"
                required
                value={formData.hourly_rate}
                onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})}
                placeholder="2500" 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_rate" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الأجر اليومي (دج)' : 'Taux journalier (DZD)'}</Label>
              <Input 
                id="daily_rate" 
                type="number"
                required
                value={formData.daily_rate}
                onChange={(e) => setFormData({...formData, daily_rate: parseFloat(e.target.value)})}
                placeholder="25000" 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wilaya" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الولاية' : 'Wilaya'}</Label>
              <Input 
                id="wilaya" 
                required 
                value={formData.wilaya}
                onChange={(e) => setFormData({...formData, wilaya: e.target.value})}
                placeholder="Oran, Alger..." 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الحالة التشغيلية' : 'Statut'}</Label>
              <Select value={formData.status} onValueChange={(v: EquipmentStatus) => setFormData({...formData, status: v})}>
                <SelectTrigger id="status" className="focus:ring-2 focus:ring-emerald-500/20">
                  <SelectValue placeholder={isAr ? "اختر الحالة" : "Choisir le statut"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                  <SelectItem value="in_use">{isAr ? "قيد الاستخدام" : "En service"}</SelectItem>
                  <SelectItem value="maintenance">{isAr ? "صيانة" : "Maintenance"}</SelectItem>
                  <SelectItem value="out_of_service">{isAr ? "خارج الخدمة" : "Hors service"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_type" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'نوع الملكية' : 'Type de propriété'}</Label>
              <Select value={formData.owner_type} onValueChange={(v: OwnerType) => setFormData({...formData, owner_type: v})}>
                <SelectTrigger id="owner_type" className="focus:ring-2 focus:ring-emerald-500/20">
                  <SelectValue placeholder={isAr ? "اختر النوع" : "Choisir le type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">{isAr ? "ملك للشركة" : "Propriété de l'entreprise"}</SelectItem>
                  <SelectItem value="rented">{isAr ? "مستأجر" : "Loué"}</SelectItem>
                  <SelectItem value="subcontracted">{isAr ? "مقاول فرعي" : "Sous-traité"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="location" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الموقع الحالي بالتفصيل' : 'Emplacement actuel'}</Label>
              <Textarea 
                id="location" 
                value={formData.current_location || ""}
                onChange={(e) => setFormData({...formData, current_location: e.target.value})}
                placeholder={isAr ? 'وصف الموقع...' : 'Description de l\'emplacement...'} 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Photo */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="photo_url" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'رابط الصورة' : 'URL de la photo'}</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="photo_url" 
                  value={formData.photo_url || ""}
                  onChange={(e) => setFormData({...formData, photo_url: e.target.value})}
                  placeholder="https://..." 
                  className="flex-1 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* --- القسم الثالث: الصيانة والضمان --- */}
            <div className="col-span-2 border-b pb-2 mb-2 mt-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {isAr ? 'الصيانة والضمان' : 'Maintenance et Garantie'}
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_hours" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'إجمالي ساعات العمل' : 'Total heures utilisées'}</Label>
              <Input 
                id="total_hours" 
                type="number"
                value={formData.total_hours_used || 0}
                onChange={(e) => setFormData({...formData, total_hours_used: parseFloat(e.target.value)})}
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maint_last" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'تاريخ آخر صيانة' : 'Date dernière maintenance'}</Label>
              <Input 
                id="maint_last" 
                type="date"
                value={formData.maintenance_last_date || ""}
                onChange={(e) => setFormData({...formData, maintenance_last_date: e.target.value})}
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maint_next" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'تاريخ الصيانة القادمة' : 'Prochaine maintenance'}</Label>
              <Input 
                id="maint_next" 
                type="date"
                value={formData.maintenance_next_due || ""}
                onChange={(e) => setFormData({...formData, maintenance_next_due: e.target.value})}
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maint_interval" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'فاصل الصيانة (ساعات)' : 'Intervalle maintenance (h)'}</Label>
              <Input 
                id="maint_interval" 
                type="number"
                value={formData.maintenance_interval_hours || ""}
                onChange={(e) => setFormData({...formData, maintenance_interval_hours: parseInt(e.target.value)})}
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maint_status" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'حالة الصيانة' : 'Statut maintenance'}</Label>
              <Select value={formData.maintenance_status} onValueChange={(v: MaintenanceStatus) => setFormData({...formData, maintenance_status: v})}>
                <SelectTrigger id="maint_status" className="focus:ring-2 focus:ring-emerald-500/20">
                  <SelectValue placeholder={isAr ? "اختر الحالة" : "Choisir le statut"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up_to_date">{isAr ? "محدث" : "À jour"}</SelectItem>
                  <SelectItem value="due_soon">{isAr ? "قريباً" : "Prochainement"}</SelectItem>
                  <SelectItem value="overdue">{isAr ? "متأخر" : "En retard"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="maint_notes" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'ملاحظات الصيانة' : 'Notes de maintenance'}</Label>
              <Textarea 
                id="maint_notes" 
                value={formData.maintenance_notes || ""}
                onChange={(e) => setFormData({...formData, maintenance_notes: e.target.value})}
                placeholder={isAr ? 'ملاحظات إضافية...' : 'Notes supplémentaires...'} 
                className="min-h-[80px] focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'انتهاء الضمان' : 'Fin de garantie'}</Label>
              <Input 
                id="warranty" 
                type="date"
                value={formData.warranty_expiry || ""}
                onChange={(e) => setFormData({...formData, warranty_expiry: e.target.value})}
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_contact" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'جهة اتصال الصيانة (المورد)' : 'Contact maintenance fournisseur'}</Label>
              <Input 
                id="supplier_contact" 
                value={formData.supplier_maintenance_contact || ""}
                onChange={(e) => setFormData({...formData, supplier_maintenance_contact: e.target.value})}
                placeholder="Nom, Téléphone..." 
                className="focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

          </div>
          <DialogFooter className="mt-8 border-t pt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="px-6">
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 px-8">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAr ? 'حفظ بيانات المعدات' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}
