"use client";

import { useState, useEffect } from "react";
import { Equipment } from "@/lib/types/projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Tractor, MapPin, DollarSign, FileText } from "lucide-react";

interface AddEquipmentModalProps {
  equipment?: Equipment | null; // null = إضافة جديدة، Equipment = تعديل
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  onSuccess?: () => void;
}

export function AddEquipmentModal({ equipment, isOpen, onClose, isAr, onSuccess }: AddEquipmentModalProps) {
  const isEditing = !!equipment;

  const [form, setForm] = useState({
    rent_daily_rate: "",
    rent_hourly_rate: "",
    gps_coordinates: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && equipment) {
      setForm({
        rent_daily_rate: equipment.rent_daily_rate?.toString() || "",
        rent_hourly_rate: equipment.rent_hourly_rate?.toString() || "",
        gps_coordinates: equipment.gps_coordinates || "",
        description: equipment.description || "",
      });
    } else if (isOpen) {
      setForm({ rent_daily_rate: "", rent_hourly_rate: "", gps_coordinates: "", description: "" });
    }
  }, [isOpen, equipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rent_daily_rate || Number(form.rent_daily_rate) <= 0) {
      toast.error(isAr ? "يرجى إدخال سعر يومي صحيح" : "Veuillez entrer un tarif journalier valide");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        equipment_id: equipment?.id,
        rent_daily_rate: Number(form.rent_daily_rate),
        rent_hourly_rate: form.rent_hourly_rate ? Number(form.rent_hourly_rate) : undefined,
        gps_coordinates: form.gps_coordinates || undefined,
        description: form.description || undefined,
        is_for_rent: true,
      };

      const res = await fetch("/api/rentals/my-equipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      toast.success(
        isAr
          ? isEditing ? "تم تحديث إعلان التأجير بنجاح" : "تم إضافة المعدة للتأجير بنجاح"
          : isEditing ? "Annonce mise à jour" : "Matériel ajouté à la location"
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || (isAr ? "حدث خطأ غير متوقع" : "Une erreur est survenue"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isAr ? "GPS غير مدعوم في متصفحك" : "GPS non supporté");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setForm(f => ({ ...f, gps_coordinates: coords }));
        toast.success(isAr ? "تم تحديد موقعك" : "Position détectée");
      },
      () => toast.error(isAr ? "تعذّر الحصول على الموقع" : "Impossible d'obtenir la position")
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="max-w-lg w-full p-6 text-slate-900 dark:text-slate-50"
        dir={isAr ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Tractor className="w-5 h-5 text-emerald-500" />
            {isAr
              ? (isEditing ? `تعديل: ${equipment?.name}` : "عرض معدة للتأجير")
              : (isEditing ? `Modifier: ${equipment?.name}` : "Proposer un matériel à la location")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {/* Daily rate */}
          <div className="space-y-1.5">
            <Label htmlFor="rent_daily_rate" className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              {isAr ? "السعر اليومي للتأجير (DZD) *" : "Tarif journalier de location (DZD) *"}
            </Label>
            <Input
              id="rent_daily_rate"
              type="number"
              min="0"
              step="100"
              required
              placeholder="مثال: 15000"
              value={form.rent_daily_rate}
              onChange={e => setForm(f => ({ ...f, rent_daily_rate: e.target.value }))}
            />
          </div>

          {/* Hourly rate (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="rent_hourly_rate" className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-500" />
              {isAr ? "السعر الساعي للتأجير (DZD) — اختياري" : "Tarif horaire (DZD) — optionnel"}
            </Label>
            <Input
              id="rent_hourly_rate"
              type="number"
              min="0"
              step="50"
              placeholder="مثال: 2000"
              value={form.rent_hourly_rate}
              onChange={e => setForm(f => ({ ...f, rent_hourly_rate: e.target.value }))}
            />
          </div>

          {/* GPS */}
          <div className="space-y-1.5">
            <Label htmlFor="gps_coordinates" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              {isAr ? "إحداثيات GPS (خط العرض، خط الطول)" : "Coordonnées GPS (lat, lon)"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="gps_coordinates"
                placeholder="36.7538, 3.0588"
                value={form.gps_coordinates}
                onChange={e => setForm(f => ({ ...f, gps_coordinates: e.target.value }))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetLocation}
                className="shrink-0 gap-1.5 text-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                {isAr ? "موقعي" : "Ma position"}
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-500" />
              {isAr ? "وصف إضافي" : "Description complémentaire"}
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder={isAr ? "حالة المعدة، ملاحظات خاصة..." : "État du matériel, remarques..."}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAr
                ? (isEditing ? "حفظ التعديلات" : "نشر الإعلان")
                : (isEditing ? "Enregistrer" : "Publier l'annonce")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
