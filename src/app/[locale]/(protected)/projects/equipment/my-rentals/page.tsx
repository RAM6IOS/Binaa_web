"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Equipment, EquipmentRental } from "@/lib/types/projects";
import { equipmentService } from "@/lib/services/equipment-service";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck, Calendar, DollarSign, ArrowLeft, ArrowRight, Check, X, Play, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

export default function MyRentalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';
  
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // States
  const [requestedRentals, setRequestedRentals] = useState<EquipmentRental[]>([]);
  const [receivedRentals, setReceivedRentals] = useState<EquipmentRental[]>([]);
  const [myFleet, setMyFleet] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit Rental Config Dialog State
  const [editingEquip, setEditingEquip] = useState<Equipment | null>(null);
  const [editIsForRent, setEditIsForRent] = useState(false);
  const [editDailyRate, setEditDailyRate] = useState(0);
  const [editGps, setEditGps] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      // 1. جلب معرف المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // 2. جلب الحجوزات الصادرة والواردة
      const res = await fetch("/api/my-rentals");
      const rentalsData = await res.json();
      if (res.ok) {
        setRequestedRentals(rentalsData.requested || []);
        setReceivedRentals(rentalsData.received || []);
      }

      // 3. جلب المعدات التي يملكها هذا المستخدم
      const allEquip = await equipmentService.getAll();
      // فلترة الأسطول الخاص بالمستخدم الحالي
      const userFleet = allEquip.filter(e => e.owner_id === user.id || !e.owner_id);
      setMyFleet(userFleet);

    } catch (err) {
      toast.error(isAr ? "فشل تحميل البيانات" : "Échec du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // تحديث حالة الحجز (قبول/رفض/إكمال)
  const handleUpdateStatus = async (rentalId: string, newStatus: string) => {
    setActionLoading(rentalId);
    try {
      const res = await fetch(`/api/rentals/${rentalId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(isAr ? "تم تحديث حالة العقد بنجاح" : "Statut du contrat mis à jour");
      fetchUserData();
    } catch (err: any) {
      toast.error(err.message || (isAr ? "فشل تحديث الحالة" : "Échec de la mise à jour"));
    } finally {
      setActionLoading(null);
    }
  };

  // فتح نافذة إعدادات التأجير لمعدة معينة
  const openEditConfig = (equip: Equipment) => {
    setEditingEquip(equip);
    setEditIsForRent(equip.is_for_rent || false);
    setEditDailyRate(equip.rent_daily_rate || equip.daily_rate || 0);
    setEditGps(equip.gps_coordinates || "");
    setEditDesc(equip.description || "");
  };

  // حفظ إعدادات التأجير للمعدة
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquip) return;

    setIsSavingConfig(true);
    try {
      // إذا لم يكن هناك مالك محدد للمعدة، نقوم بربطها بالمستخدم الحالي كمالك
      const updates: Partial<Equipment> = {
        is_for_rent: editIsForRent,
        rent_daily_rate: editDailyRate,
        daily_rate: editDailyRate, // لمزامنة مع نظام التكلفة الحالية
        gps_coordinates: editGps,
        description: editDesc,
      };
      
      if (!editingEquip.owner_id && currentUserId) {
        updates.owner_id = currentUserId;
      }

      await equipmentService.update(editingEquip.id, updates);
      toast.success(isAr ? "تم حفظ إعدادات التأجير بنجاح" : "Configuration de location sauvegardée");
      setEditingEquip(null);
      fetchUserData();
    } catch (err) {
      toast.error(isAr ? "فشل حفظ البيانات" : "Échec de l'enregistrement");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    ongoing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const statusTexts: Record<string, string> = {
    pending: isAr ? "معلق" : "En attente",
    approved: isAr ? "موافق عليه" : "Approuvé",
    ongoing: isAr ? "جاري الاستخدام" : "Actif",
    completed: isAr ? "مكتمل" : "Terminé",
    rejected: isAr ? "مرفوض" : "Refusé",
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">{isAr ? "جاري تحميل تفاصيل التأجير..." : "Chargement de vos locations..."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isAr ? "rtl" : "ltr"}>
      {/* الرأس */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <Link href="/projects/equipment" className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 mb-1">
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isAr ? "العودة لأسطول العتاد" : "Retour à ma flotte"}
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {isAr ? "إدارة وتأجير المعدات" : "Gestion & Locations de Matériel"}
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            {isAr 
              ? "تابع طلبات الحجز الموجهة إليك والمعدات التي استأجرتها وقم بتهيئة أسطولك للتأجير" 
              : "Suivez les réservations reçues, louées, et configurez les paramètres de location de vos engins"}
          </p>
        </div>
      </div>

      {/* 1. طلبات الاستئجار الواردة (مالك المعدة) */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="py-5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" />
            {isAr ? "طلبات استئجار عتادي (الواردة)" : "Demandes reçues pour mon matériel"}
          </CardTitle>
          <CardDescription>
            {isAr 
              ? "طلبات الحجز الموجهة من شركات ومقاولين آخرين لاستئجار معداتك." 
              : "Réservations soumises par d'autres entrepreneurs pour utiliser votre flotte."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {receivedRentals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {isAr ? "لا توجد طلبات استئجار واردة حالياً." : "Aucune demande de location reçue."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-y">
                  <TableRow>
                    <TableHead>{isAr ? "المعدة" : "Équipement"}</TableHead>
                    <TableHead>{isAr ? "المستأجر" : "Locataire"}</TableHead>
                    <TableHead>{isAr ? "الفترة" : "Période"}</TableHead>
                    <TableHead>{isAr ? "التكلفة الكلية" : "Total DZD"}</TableHead>
                    <TableHead>{isAr ? "الحالة" : "Statut"}</TableHead>
                    <TableHead className="text-right">{isAr ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedRentals.map((rental) => (
                    <TableRow key={rental.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {rental.equipment?.name}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-350">
                        {rental.renter?.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {rental.start_date} → {rental.end_date}
                      </TableCell>
                      <TableCell className="font-bold">
                        {Number(rental.total_cost).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[rental.status]}>{statusTexts[rental.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-1.5 py-3">
                        {rental.status === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-3 gap-1"
                              onClick={() => handleUpdateStatus(rental.id, "approved")}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === rental.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              {isAr ? "موافقة" : "Approuver"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium text-xs h-8 px-3 gap-1"
                              onClick={() => handleUpdateStatus(rental.id, "rejected")}
                              disabled={actionLoading !== null}
                            >
                              <X className="w-3.5 h-3.5" />
                              {isAr ? "رفض" : "Refuser"}
                            </Button>
                          </>
                        )}
                        {(rental.status === "approved" || rental.status === "ongoing") && (
                          <Button 
                            size="sm" 
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-8 px-3 gap-1"
                            onClick={() => handleUpdateStatus(rental.id, "completed")}
                            disabled={actionLoading !== null}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isAr ? "إنهاء العقد" : "Terminer"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. طلبات الاستئجار الصادرة (مستأجر المعدة) */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="py-5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            {isAr ? "معدات قمت باستئجارها (الصادرة)" : "Matériel loué chez les autres"}
          </CardTitle>
          <CardDescription>
            {isAr 
              ? "معدات الآخرين التي قمت بطلب حجزها ومتابعة حالة العقود الخاصة بها." 
              : "Historique des réservations que vous avez soumises pour louer des équipements externes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requestedRentals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {isAr ? "لم تقم باستئجار أي عتاد خارجي بعد." : "Vous n'avez loué aucun matériel externe."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-y">
                  <TableRow>
                    <TableHead>{isAr ? "المعدة" : "Équipement"}</TableHead>
                    <TableHead>{isAr ? "المالك" : "Propriétaire"}</TableHead>
                    <TableHead>{isAr ? "المشروع المرتبط" : "Projet lié"}</TableHead>
                    <TableHead>{isAr ? "الفترة" : "Période"}</TableHead>
                    <TableHead>{isAr ? "التكلفة الكلية" : "Total DZD"}</TableHead>
                    <TableHead>{isAr ? "الحالة" : "Statut"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestedRentals.map((rental) => (
                    <TableRow key={rental.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {rental.equipment?.name}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-350">
                        {rental.owner?.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {rental.project?.name || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {rental.start_date} → {rental.end_date}
                      </TableCell>
                      <TableCell className="font-bold">
                        {Number(rental.total_cost).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[rental.status]}>{statusTexts[rental.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. أسطولي المعروض للتأجير */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="py-5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            {isAr ? "عرض أسطولي للتأجير" : "Mise en location de mes équipements"}
          </CardTitle>
          <CardDescription>
            {isAr 
              ? "تحكم في خيارات الإيجار، والأسعار اليومية، وإحداثيات الموقع لعتادك الخاص." 
              : "Paramétrez le statut de location, les tarifs et l'adresse GPS de vos machines."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {myFleet.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {isAr ? "لا توجد معدات في أسطولك حالياً." : "Aucun équipement disponible dans votre flotte."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-y">
                  <TableRow>
                    <TableHead>{isAr ? "المعدة" : "Équipement"}</TableHead>
                    <TableHead>{isAr ? "العلامة / الموديل" : "Marque / Modèle"}</TableHead>
                    <TableHead>{isAr ? "معروض للتأجير؟" : "En Location ?"}</TableHead>
                    <TableHead>{isAr ? "الأجر اليومي للتأجير" : "Tarif journalier"}</TableHead>
                    <TableHead>{isAr ? "إحداثيات GPS" : "Coordonnées GPS"}</TableHead>
                    <TableHead className="text-right">{isAr ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myFleet.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.brand} ({item.model})
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_for_rent ? "default" : "secondary"} className={item.is_for_rent ? "bg-emerald-600 text-white" : ""}>
                          {item.is_for_rent ? (isAr ? "نعم" : "Oui") : (isAr ? "لا" : "Non")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {(item.rent_daily_rate || item.daily_rate || 0).toLocaleString()} DZD
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">
                        {item.gps_coordinates || "-"}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs font-semibold gap-1.5"
                          onClick={() => openEditConfig(item)}
                        >
                          {isAr ? "إعدادات الإيجار" : "Paramètres de location"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة ضبط إعدادات تأجير المعدة */}
      {editingEquip && (
        <Dialog open={editingEquip !== null} onOpenChange={(open) => !open && setEditingEquip(null)}>
          <DialogContent className="max-w-md w-full p-6 text-slate-900 dark:text-slate-50" dir={isAr ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {isAr ? `إعدادات تأجير: ${editingEquip.name}` : `Location: ${editingEquip.name}`}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveConfig} className="space-y-4 my-4">
              {/* عرض للتأجير */}
              <div className="flex items-center justify-between border-b pb-3 pt-1">
                <div className="space-y-0.5">
                  <label htmlFor="is-for-rent-switch" className="text-sm font-semibold cursor-pointer">
                    {isAr ? "اعرض هذه المعدة للتأجير للآخرين" : "Afficher cet équipement pour la location"}
                  </label>
                  <p className="text-xs text-slate-500">
                    {isAr 
                      ? "سيتمكن المقاولون الآخرون من رؤية المعدة في سوق التأجير وحجزها." 
                      : "Les autres entrepreneurs pourront voir et louer cette machine."}
                  </p>
                </div>
                <Switch 
                  id="is-for-rent-switch"
                  checked={editIsForRent} 
                  onCheckedChange={setEditIsForRent} 
                />
              </div>

              {/* الأجر اليومي */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">{isAr ? "الأجر اليومي للتأجير (دج)" : "Tarif journalier (DZD)"}</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
                  <Input 
                    type="number"
                    value={editDailyRate}
                    onChange={(e) => setEditDailyRate(Number(e.target.value))}
                    required
                    className="pl-10 rtl:pr-10 bg-transparent"
                    min="0"
                  />
                </div>
              </div>

              {/* إحداثيات GPS */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">{isAr ? "إحداثيات الموقع الجغرافي GPS (اختياري)" : "Coordonnées GPS (Optionnel)"}</label>
                <Input 
                  type="text"
                  value={editGps}
                  onChange={(e) => setEditGps(e.target.value)}
                  placeholder="e.g. 36.7525, 3.0419"
                  className="bg-transparent font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  {isAr 
                    ? "اكتب خط الطول والعرض مفصولين بفاصلة لعرض المعدة في فلاتر المسافة القريبة." 
                    : "Entrez la latitude et la longitude séparées par une virgule pour le tri de proximité."}
                </p>
              </div>

              {/* وصف المعدة */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">{isAr ? "وصف المعدة وشروط التأجير" : "Description & conditions de location"}</label>
                <Textarea 
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={isAr ? "اكتب تفاصيل إضافية عن العتاد، حالته، شروط النقل..." : "Détails sur l'engin, état, frais de transport..."}
                  className="bg-transparent h-20"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingEquip(null)} disabled={isSavingConfig}>
                  {isAr ? "إلغاء" : "Annuler"}
                </Button>
                <Button type="submit" disabled={isSavingConfig} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {isSavingConfig && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isAr ? "حفظ التغييرات" : "Sauvegarder"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
