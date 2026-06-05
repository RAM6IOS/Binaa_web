"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Equipment, EquipmentRental, RentalStatus } from "@/lib/types/projects";
import { MyEquipmentCard } from "@/components/rental/MyEquipmentCard";
import { AddEquipmentModal } from "@/components/rental/AddEquipmentModal";
import { AddRentalEquipmentDialog } from "@/components/rent/AddRentalEquipmentDialog";
import { Plus, Package, Loader2, AlertCircle, Tractor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MyEquipmentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === "ar";

  const [myEquipment, setMyEquipment] = useState<(Equipment & { incoming_requests: EquipmentRental[] })[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewEquipmentDialogOpen, setIsNewEquipmentDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddFromExisting, setShowAddFromExisting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [myRes, allRes] = await Promise.all([
        fetch("/api/rentals/my-equipment"),
        fetch("/api/equipment"),
      ]);
      const myData = await myRes.json();
      if (!myRes.ok) throw new Error(myData.error);
      setMyEquipment(myData.equipment || []);

      if (allRes.ok) {
        const allData = await allRes.json();
        // Only show equipment not already listed for rent
        const listedIds = new Set((myData.equipment || []).map((e: Equipment) => e.id));
        setAllEquipment((allData.equipment || allData || []).filter((e: Equipment) => !listedIds.has(e.id)));
      }
    } catch (err: any) {
      setError(err.message || (isAr ? "حدث خطأ في التحميل" : "Erreur de chargement"));
    } finally {
      setIsLoading(false);
    }
  }, [isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (eq: Equipment, isForRent: boolean) => {
    setUpdatingId(eq.id);
    try {
      const res = await fetch("/api/rentals/my-equipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipment_id: eq.id, is_for_rent: isForRent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        isAr
          ? isForRent ? "تم تفعيل الإعلان" : "تم إيقاف الإعلان مؤقتاً"
          : isForRent ? "Annonce activée" : "Annonce désactivée"
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusUpdate = async (rentalId: string, status: RentalStatus) => {
    setUpdatingId(rentalId);
    try {
      const res = await fetch(`/api/rentals/${rentalId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isAr ? "تم تحديث حالة الطلب" : "Statut de la demande mis à jour");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddFromExisting = async (eq: Equipment) => {
    setEditingEquipment(eq);
    setIsModalOpen(true);
    setShowAddFromExisting(false);
  };

  const totalPending = myEquipment.reduce(
    (acc, eq) => acc + (eq.incoming_requests?.filter(r => r.status === "pending").length ?? 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: isAr ? "معداتك المعروضة" : "Matériels listés",
            value: myEquipment.length,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: isAr ? "طلبات معلقة" : "Demandes en attente",
            value: totalPending,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: isAr ? "إعلانات نشطة" : "Annonces actives",
            value: myEquipment.filter(e => e.is_for_rent && e.status === "available").length,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: isAr ? "معداتك الكلية" : "Tout votre matériel",
            value: myEquipment.length + allEquipment.length,
            color: "text-violet-600",
            bg: "bg-violet-50 dark:bg-violet-900/20",
          },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 border border-slate-200 dark:border-slate-800`}>
            <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isAr ? "معداتي المعروضة للتأجير" : "Mon matériel en location"}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAr ? "إدارة إعلانات التأجير وطلبات العملاء" : "Gérer vos annonces et les demandes clients"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowAddFromExisting(s => !s)}
            variant="outline"
            className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Plus className="w-4 h-4" />
            {isAr ? "عرض من معداتي" : "Choisir depuis mon matériel"}
          </Button>
          <Button
            onClick={() => setIsNewEquipmentDialogOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4" />
            {isAr ? "إضافة معدة جديدة" : "Ajouter nouveau matériel"}
          </Button>
        </div>
      </div>

      {/* Add from existing equipment dropdown */}
      {showAddFromExisting && allEquipment.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 space-y-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {isAr ? "اختر معدة من قائمتك لعرضها للتأجير:" : "Choisissez un matériel existant à louer:"}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {allEquipment.map(eq => (
              <button
                key={eq.id}
                onClick={() => handleAddFromExisting(eq)}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-start"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Tractor className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{eq.name}</p>
                  <p className="text-xs text-slate-500">{eq.brand} — {eq.wilaya}</p>
                </div>
              </button>
            ))}
          </div>
          {allEquipment.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              {isAr ? "جميع معداتك مدرجة بالفعل" : "Tout votre matériel est déjà listé"}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-sm">{isAr ? "جاري التحميل..." : "Chargement..."}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-red-500">
          <AlertCircle className="w-10 h-10" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            {isAr ? "إعادة المحاولة" : "Réessayer"}
          </Button>
        </div>
      ) : myEquipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="w-24 h-24 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Package className="w-12 h-12 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
              {isAr ? "لا توجد معدات مدرجة بعد" : "Aucun matériel listé"}
            </p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              {isAr
                ? "ابدأ بعرض معداتك للتأجير وابدأ في تحقيق الدخل!"
                : "Commencez à proposer votre matériel à la location et générez des revenus!"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={() => setShowAddFromExisting(true)}
              variant="outline"
              className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <Plus className="w-4 h-4" />
              {isAr ? "عرض من معداتي" : "Choisir depuis mon matériel"}
            </Button>
            <Button
              onClick={() => setIsNewEquipmentDialogOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              {isAr ? "إضافة معدة جديدة" : "Ajouter nouveau matériel"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {myEquipment.map(eq => (
            <MyEquipmentCard
              key={eq.id}
              equipment={eq}
              isAr={isAr}
              onEdit={eqItem => { setEditingEquipment(eqItem); setIsModalOpen(true); }}
              onToggle={handleToggle}
              onStatusUpdate={handleStatusUpdate}
              isLoading={updatingId === eq.id || eq.incoming_requests?.some(r => r.id === updatingId)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddEquipmentModal
        equipment={editingEquipment}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEquipment(null); }}
        isAr={isAr}
        onSuccess={fetchData}
      />

      {/* Add New Rental Equipment Dialog */}
      <AddRentalEquipmentDialog
        isOpen={isNewEquipmentDialogOpen}
        onClose={() => setIsNewEquipmentDialogOpen(false)}
        isAr={isAr}
        onSuccess={fetchData}
      />
    </div>
  );
}
