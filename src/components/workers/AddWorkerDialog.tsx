"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Edit, UploadCloud } from "lucide-react";
import { workersService } from "@/lib/services/workers-service";
import { Worker, WorkerStatus, ContractType } from "@/lib/types/projects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AddWorkerDialogProps {
  isAr: boolean;
  onSuccess: () => void;
  worker?: Worker; // If provided, we are in Edit mode
  trigger?: React.ReactNode;
}

export function AddWorkerDialog({ isAr, onSuccess, worker, trigger }: AddWorkerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Worker>>({
    full_name: "",
    cin: "",
    phone: "",
    job_title: "",
    daily_rate: undefined,
    hourly_rate: undefined,
    wilaya: "",
    availability: "available",
    photo_url: "",
    skills: "",
    emergency_contact: "",
    date_of_birth: "",
    contract_type: undefined,
    notes: "",
  });

  useEffect(() => {
    if (worker && open) {
      setFormData(worker);
    } else if (!worker && open) {
      setFormData({
        full_name: "",
        cin: "",
        phone: "",
        job_title: "",
        daily_rate: undefined,
        hourly_rate: undefined,
        wilaya: "",
        availability: "available",
        photo_url: "",
        skills: "",
        emergency_contact: "",
        date_of_birth: "",
        contract_type: undefined,
        notes: "",
      });
    }
  }, [worker, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(isAr ? "يجب تسجيل الدخول أولاً" : "Authentication required");
      }

      const cleanData: any = { ...formData };

      // 1. إرفاق معرف المستخدم (مهم جداً لـ RLS)
      cleanData.user_id = user.id;

      // 2. تنظيف الحقول الاختيارية
      const optionalFields = ['hourly_rate', 'photo_url', 'skills', 'emergency_contact', 'date_of_birth', 'contract_type', 'notes'];
      optionalFields.forEach(field => {
        if (cleanData[field] === "" || cleanData[field] === undefined) {
          cleanData[field] = null;
        }
      });

      // 3. التأكد من الحقول المطلوبة
      if (!cleanData.full_name || !cleanData.cin || !cleanData.phone || !cleanData.job_title || !cleanData.daily_rate || !cleanData.wilaya) {
        throw new Error(isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      }

      if (worker) {
        // تحديث
        await workersService.update(worker.id, cleanData);
        toast.success(isAr ? 'تم تحديث بيانات العامل بنجاح ✓' : 'Ouvrier mis à jour ✓');
      } else {
        // إنشاء
        await workersService.create(cleanData);
        toast.success(isAr ? 'تمت إضافة العامل بنجاح ✓' : 'Ouvrier ajouté avec succès ✓');
      }

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Binaa DB Error (Full):', error);

      // معالجة أخطاء Supabase الشائعة
      if (error?.code === "23505") {
        toast.error(isAr ? "رقم التعريف الوطني (CIN) مسجل مسبقاً" : "CIN déjà enregistré");
      } else if (error?.code === "42501") {
        toast.error(isAr ? "غير مصرح به. تحقق من صلاحياتك" : "Permission denied");
      } else {
        const msg = error?.message || (isAr ? 'حدث خطأ أثناء الحفظ' : 'Erreur lors de la sauvegarde');
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const isEdit = !!worker;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" />
            {isAr ? 'إضافة عامل جديد' : 'Ajouter un ouvrier'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? (isAr ? 'تعديل بيانات العامل' : 'Modifier l\'ouvrier') : (isAr ? 'إضافة عامل جديد إلى الشبكة' : 'Ajouter un nouvel ouvrier')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

            {/* Full Name */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الاسم الكامل' : 'Nom complet'}</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name || ""}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={isAr ? 'مثال: أحمد منصور' : 'Ex: Ahmed Mansouri'}
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* CIN */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="cin" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'رقم التعريف الوطني (CIN)' : 'CIN'}</Label>
              <Input
                id="cin"
                required
                value={formData.cin || ""}
                onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                placeholder="123456789"
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'رقم الهاتف' : 'Téléphone'}</Label>
              <Input
                id="phone"
                required
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="05xx xx xx xx"
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Job Title */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="job_title" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'المسمى الوظيفي' : 'Poste'}</Label>
              <Select value={formData.job_title} onValueChange={(val) => setFormData({ ...formData, job_title: val })} required>
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder={isAr ? "اختر الوظيفة" : "Choisir le poste"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maçon">{isAr ? "بناء (Maçon)" : "Maçon"}</SelectItem>
                  <SelectItem value="Charpentier">{isAr ? "نجار (Charpentier)" : "Charpentier"}</SelectItem>
                  <SelectItem value="Ferrailleur">{isAr ? "حداد تسليح (Ferrailleur)" : "Ferrailleur"}</SelectItem>
                  <SelectItem value="Plombier">{isAr ? "سباك (Plombier)" : "Plombier"}</SelectItem>
                  <SelectItem value="Électricien">{isAr ? "كهربائي (Électricien)" : "Électricien"}</SelectItem>
                  <SelectItem value="Peintre">{isAr ? "صباغ (Peintre)" : "Peintre"}</SelectItem>
                  <SelectItem value="Ingénieur Civil">{isAr ? "مهندس مدني (Ingénieur)" : "Ingénieur Civil"}</SelectItem>
                  <SelectItem value="Chef de Chantier">{isAr ? "رئيس ورشة (Chef)" : "Chef de Chantier"}</SelectItem>
                  <SelectItem value="Chauffeur">{isAr ? "سائق (Chauffeur)" : "Chauffeur"}</SelectItem>
                  <SelectItem value="Manoeuvre">{isAr ? "عامل عادي (Manoeuvre)" : "Manoeuvre"}</SelectItem>
                  <SelectItem value="Autre">{isAr ? "أخرى (Autre)" : "Autre"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Daily Rate */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="daily_rate" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الأجر اليومي (دج)' : 'Taux journalier (DZD)'}</Label>
              <Input
                id="daily_rate"
                type="number"
                required
                value={formData.daily_rate || ""}
                onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                placeholder="4000"
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Hourly Rate */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="hourly_rate" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الأجر بالساعة (دج)' : 'Taux horaire (DZD)'}</Label>
              <Input
                id="hourly_rate"
                type="number"
                value={formData.hourly_rate || ""}
                onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                placeholder="500"
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Wilaya */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="wilaya" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'الولاية' : 'Wilaya'}</Label>
              <Input
                id="wilaya"
                required
                value={formData.wilaya || ""}
                onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                placeholder={isAr ? "وهران، الجزائر..." : "Oran, Alger..."}
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Availability */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="availability" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'حالة التوفر' : 'Disponibilité'}</Label>
              <Select value={formData.availability} onValueChange={(val: WorkerStatus) => setFormData({ ...formData, availability: val })} required>
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder={isAr ? "اختر الحالة" : "Choisir le statut"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                  <SelectItem value="on_project">{isAr ? "في مشروع" : "Sur projet"}</SelectItem>
                  <SelectItem value="unavailable">{isAr ? "غير متاح" : "Indisponible"}</SelectItem>
                  <SelectItem value="vacation">{isAr ? "في إجازة" : "En congé"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contract Type */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="contract_type" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'نوع العقد' : 'Type de contrat'}</Label>
              <Select value={formData.contract_type} onValueChange={(val: ContractType) => setFormData({ ...formData, contract_type: val })}>
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder={isAr ? "اختر نوع العقد" : "Choisir le contrat"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{isAr ? "يومي" : "Journalier"}</SelectItem>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="temporary">{isAr ? "مؤقت" : "Temporaire"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="date_of_birth" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'تاريخ الميلاد' : 'Date de naissance'}</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth || ""}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="emergency_contact" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'جهة اتصال للطوارئ' : 'Contact d\'urgence'}</Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact || ""}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="06xx xx xx xx"
                className="focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Photo URL */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="photo_url" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'رابط الصورة' : 'URL de la photo'}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="photo_url"
                  value={formData.photo_url || ""}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="skills" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'المهارات والخبرات' : 'Compétences et Expériences'}</Label>
              <Textarea
                id="skills"
                value={formData.skills || ""}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder={isAr ? "اذكر المهارات الخاصة بالعامل..." : "Décrire les compétences spécifiques..."}
                className="min-h-[100px] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes" className="text-slate-700 dark:text-slate-300 font-semibold">{isAr ? 'ملاحظات إضافية' : 'Notes supplémentaires'}</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={isAr ? "أي ملاحظات أخرى..." : "Autres notes..."}
                className="min-h-[80px] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

          </div>
          <DialogFooter className="mt-8 border-t pt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="px-6">
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 px-8">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAr ? 'حفظ بيانات العامل' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
