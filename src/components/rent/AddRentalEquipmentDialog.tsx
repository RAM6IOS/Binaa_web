"use client";

import { useState, useEffect } from "react";
import { rentalService } from "@/lib/services/rental-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Tractor, MapPin, DollarSign, FileText, Hash, Layers, Info } from "lucide-react";

interface AddRentalEquipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  onSuccess?: () => void;
}

const WILAYAS = [
  "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار",
  "البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر",
  "الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة",
  "قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض",
  "إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي",
  "خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تيموشنت",
  "غرداية","غليزان","تيميمون","برج باجي مختار","أولاد جلال","بني عباس",
  "عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة"
];

const CATEGORIES = [
  { value: "excavation", labelAr: "حفر وتجريف", labelFr: "Excavation" },
  { value: "lifting",    labelAr: "رفع ومناولة",  labelFr: "Levage" },
  { value: "transport",  labelAr: "نقل وشحن",     labelFr: "Transport" },
  { value: "concrete",   labelAr: "خرسانة وبناء", labelFr: "Béton" },
  { value: "earthmoving",labelAr: "تحريك التراب", labelFr: "Terrassement" },
  { value: "compaction", labelAr: "رصف ودمك",     labelFr: "Compactage" }
];

export function AddRentalEquipmentDialog({ isOpen, onClose, isAr, onSuccess }: AddRentalEquipmentDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    category: "",
    brand: "",
    model: "",
    serial_number: "",
    daily_rate: "",
    rent_daily_rate: "",
    rent_hourly_rate: "",
    wilaya: "",
    rental_description: "",
    gps_coordinates: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        type: "",
        category: "",
        brand: "",
        model: "",
        serial_number: "",
        daily_rate: "",
        rent_daily_rate: "",
        rent_hourly_rate: "",
        wilaya: "",
        rental_description: "",
        gps_coordinates: ""
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = isAr ? "اسم المعدة مطلوب" : "Nom du matériel requis";
    }
    if (!formData.type.trim()) {
      newErrors.type = isAr ? "نوع المعدة مطلوب (مثال: جرافة)" : "Type requis (ex: Buldozer)";
    }
    if (!formData.category) {
      newErrors.category = isAr ? "يرجى تحديد الفئة" : "Catégorie requise";
    }
    if (!formData.brand.trim()) {
      newErrors.brand = isAr ? "العلامة التجارية مطلوبة" : "Marque requise";
    }
    if (!formData.serial_number.trim()) {
      newErrors.serial_number = isAr ? "الرقم التسلسلي مطلوب" : "Numéro de série requis";
    }
    if (!formData.daily_rate || Number(formData.daily_rate) < 0) {
      newErrors.daily_rate = isAr ? "السعر اليومي الأصلي يجب أن يكون 0 أو أكثر" : "Tarif journalier doit être >= 0";
    }
    if (!formData.rent_daily_rate || Number(formData.rent_daily_rate) <= 0) {
      newErrors.rent_daily_rate = isAr ? "سعر التأجير اليومي يجب أن يكون أكبر من 0" : "Tarif de location journalier doit être > 0";
    }
    if (formData.rent_hourly_rate && Number(formData.rent_hourly_rate) < 0) {
      newErrors.rent_hourly_rate = isAr ? "السعر الساعي لا يمكن أن يكون سالباً" : "Tarif horaire ne peut pas être négatif";
    }
    if (!formData.wilaya) {
      newErrors.wilaya = isAr ? "يرجى تحديد الولاية" : "Wilaya requise";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(isAr ? "يرجى التحقق من صحة البيانات المدخلة" : "Veuillez vérifier les données saisies");
      return;
    }

    setIsSubmitting(true);
    try {
      await rentalService.addRentalEquipment({
        name: formData.name.trim(),
        type: formData.type.trim(),
        category: formData.category,
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        serial_number: formData.serial_number.trim(),
        daily_rate: Number(formData.daily_rate),
        rent_daily_rate: Number(formData.rent_daily_rate),
        rent_hourly_rate: formData.rent_hourly_rate ? Number(formData.rent_hourly_rate) : undefined,
        wilaya: formData.wilaya,
        rental_description: formData.rental_description.trim(),
        gps_coordinates: formData.gps_coordinates.trim()
      });

      toast.success(isAr ? "تمت إضافة المعدة للتأجير بنجاح" : "Matériel ajouté à la location avec succès");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || (isAr ? "حدث خطأ أثناء إضافة المعدة" : "Erreur lors de l'ajout du matériel"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isAr ? "متصفحك لا يدعم تحديد الموقع" : "Géolocalisation non supportée");
      return;
    }

    toast.info(isAr ? "جاري جلب إحداثيات موقعك..." : "Obtention de la position...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setFormData(f => ({ ...f, gps_coordinates: coords }));
        toast.success(isAr ? "تم تحديد الموقع بنجاح" : "Position localisée avec succès");
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error(isAr ? "فشل الحصول على الموقع. تأكد من السماح بالوصول." : "Impossible d'obtenir la position");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl w-full p-6 text-slate-900 dark:text-slate-50 max-h-[90vh] overflow-y-auto"
        dir={isAr ? "rtl" : "ltr"}
      >
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Tractor className="w-6 h-6" />
            {isAr ? "إضافة معدة جديدة للتأجير" : "Ajouter un nouveau matériel à la location"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                {isAr ? "اسم المعدة *" : "Nom du matériel *"}
              </Label>
              <Input
                id="name"
                placeholder={isAr ? "مثال: جرافة Caterpillar" : "Ex: Excavatrice Caterpillar"}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-sm font-medium">
                {isAr ? "نوع المعدة *" : "Type du matériel *"}
              </Label>
              <Input
                id="type"
                placeholder={isAr ? "مثال: جرافة، رافعة، شاحنة" : "Ex: Buldozer, Grue, Camion"}
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className={errors.type ? "border-red-500" : ""}
              />
              {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm font-medium">
                {isAr ? "الفئة *" : "Catégorie *"}
              </Label>
              <Select
                value={formData.category}
                onValueChange={val => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                  <SelectValue placeholder={isAr ? "اختر الفئة" : "Sélectionner la catégorie"} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {isAr ? cat.labelAr : cat.labelFr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label htmlFor="brand" className="text-sm font-medium">
                {isAr ? "العلامة التجارية *" : "Marque *"}
              </Label>
              <Input
                id="brand"
                placeholder={isAr ? "مثال: CAT، Komatsu" : "Ex: CAT, Komatsu"}
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                className={errors.brand ? "border-red-500" : ""}
              />
              {errors.brand && <p className="text-xs text-red-500">{errors.brand}</p>}
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-sm font-medium">
                {isAr ? "الموديل" : "Modèle"}
              </Label>
              <Input
                id="model"
                placeholder={isAr ? "مثال: 320D" : "Ex: 320D"}
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            {/* Serial Number */}
            <div className="space-y-1.5">
              <Label htmlFor="serial_number" className="text-sm font-medium">
                {isAr ? "الرقم التسلسلي (Serial Number) *" : "Numéro de série *"}
              </Label>
              <Input
                id="serial_number"
                placeholder="Ex: CAT0320D849301"
                value={formData.serial_number}
                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                className={errors.serial_number ? "border-red-500" : ""}
              />
              {errors.serial_number && <p className="text-xs text-red-500">{errors.serial_number}</p>}
            </div>

            {/* Daily Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="daily_rate" className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                {isAr ? "السعر اليومي الأصلي (DZD) *" : "Tarif journalier d'origine (DZD) *"}
              </Label>
              <Input
                id="daily_rate"
                type="number"
                min="0"
                placeholder="مثال: 12000"
                value={formData.daily_rate}
                onChange={e => setFormData({ ...formData, daily_rate: e.target.value })}
                className={errors.daily_rate ? "border-red-500" : ""}
              />
              {errors.daily_rate && <p className="text-xs text-red-500">{errors.daily_rate}</p>}
            </div>

            {/* Rent Daily Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="rent_daily_rate" className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                {isAr ? "سعر التأجير اليومي للعملاء (DZD) *" : "Tarif de location journalier (DZD) *"}
              </Label>
              <Input
                id="rent_daily_rate"
                type="number"
                min="1"
                placeholder="مثال: 15000"
                value={formData.rent_daily_rate}
                onChange={e => setFormData({ ...formData, rent_daily_rate: e.target.value })}
                className={errors.rent_daily_rate ? "border-red-500" : ""}
              />
              {errors.rent_daily_rate && <p className="text-xs text-red-500">{errors.rent_daily_rate}</p>}
            </div>

            {/* Rent Hourly Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="rent_hourly_rate" className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                {isAr ? "سعر التأجير الساعي (DZD) - اختياري" : "Tarif horaire de location (DZD) - optionnel"}
              </Label>
              <Input
                id="rent_hourly_rate"
                type="number"
                min="0"
                placeholder="مثال: 2000"
                value={formData.rent_hourly_rate}
                onChange={e => setFormData({ ...formData, rent_hourly_rate: e.target.value })}
                className={errors.rent_hourly_rate ? "border-red-500" : ""}
              />
              {errors.rent_hourly_rate && <p className="text-xs text-red-500">{errors.rent_hourly_rate}</p>}
            </div>

            {/* Wilaya */}
            <div className="space-y-1.5">
              <Label htmlFor="wilaya" className="text-sm font-medium">
                {isAr ? "الولاية (الموقع الجغرافي للمعدة) *" : "Wilaya *"}
              </Label>
              <Select
                value={formData.wilaya}
                onValueChange={val => setFormData({ ...formData, wilaya: val })}
              >
                <SelectTrigger className={errors.wilaya ? "border-red-500" : ""}>
                  <SelectValue placeholder={isAr ? "اختر الولاية" : "Sélectionner la wilaya"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {WILAYAS.map(w => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.wilaya && <p className="text-xs text-red-500">{errors.wilaya}</p>}
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="space-y-1.5">
            <Label htmlFor="gps_coordinates" className="text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              {isAr ? "إحداثيات الموقع الجغرافي (GPS)" : "Coordonnées GPS"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="gps_coordinates"
                placeholder="36.7538, 3.0588"
                value={formData.gps_coordinates}
                onChange={e => setFormData({ ...formData, gps_coordinates: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                className="shrink-0 flex items-center gap-1.5 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              >
                <MapPin className="w-3.5 h-3.5" />
                {isAr ? "موقعي الحالي" : "Ma position"}
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400" />
              {isAr 
                ? "يساعد تحديد إحداثيات GPS في ظهور معدتك على الخريطة وقربها للعملاء." 
                : "La position GPS permet d'afficher votre matériel sur la carte et de calculer les distances."}
            </p>
          </div>

          {/* Rental Description */}
          <div className="space-y-1.5">
            <Label htmlFor="rental_description" className="text-sm font-medium flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-violet-500" />
              {isAr ? "وصف إضافي للمعدة (حالة، شروط التأجير...)" : "Description de la location"}
            </Label>
            <Textarea
              id="rental_description"
              rows={4}
              placeholder={isAr ? "اكتب هنا تفاصيل عن حالة المعدة، شروط التأجير، الملحقات المتوفرة..." : "Décrivez l'état, les accessoires, conditions de location..."}
              value={formData.rental_description}
              onChange={e => setFormData({ ...formData, rental_description: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 pt-4 border-t mt-4 flex flex-row justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5"
            >
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAr ? "إضافة المعدة للتأجير" : "Ajouter le matériel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
