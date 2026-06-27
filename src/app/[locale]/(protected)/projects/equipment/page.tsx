"use client";

import { use, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Loader2, Truck, MapPin, MoreVertical, Edit, Trash2, Plus
} from "lucide-react";
import { equipmentService } from "@/lib/services/equipment-service";
import { Equipment } from "@/lib/types/projects";
import { AddEquipmentDialog } from "@/components/equipment/AddEquipmentDialog";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { MaintenanceStatusBadge } from "@/components/equipment/MaintenanceStatusBadge";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function EquipmentListPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>('all');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch (error) {
      toast.error(isAr ? 'فشل تحميل المعدات' : 'Échec du chargement des équipements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const askDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };
  useEffect(() => {
    if (!isDeleteModalOpen) {
      // ننتظر أجزاء من الثانية لضمان انتهاء أنيميشن الإغلاق
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDeleteModalOpen]);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      // 1. إجراء عملية الحذف في السيرفر
      await equipmentService.delete(itemToDelete);

      // 2. تحديث الواجهة محلياً لإزالة العنصر
      setEquipment(prev => prev.filter(item => item.id !== itemToDelete));

      // 3. رسالة نجاح
      toast.success(isAr ? 'تم حذف العتاد بنجاح ✓' : 'Équipement supprimé avec succès ✓');

      // 4. *** الحل الجذري ***: إغلاق المودال أولاً ومسح معرف الحذف
      setIsDeleteModalOpen(false);
      setItemToDelete(null);

    } catch (error) {
      toast.error(isAr ? 'فشل الحذف' : 'Erreur lors de la suppression');
    } finally {
      // نضع IsDeleting فقط في الـ finally لضمان توقف اللودر
      setIsDeleting(false);
    }
  };
  const filteredEquipment = equipment.filter(e => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      (e.name || '').toLowerCase().includes(term) ||
      (e.serial_number || '').toLowerCase().includes(term) ||
      (e.brand || '').toLowerCase().includes(term) ||
      (e.model || '').toLowerCase().includes(term);

    const matchesWilaya = wilayaFilter === 'all' || e.wilaya === wilayaFilter;
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesMaintenance = maintenanceFilter === 'all' || e.maintenance_status === maintenanceFilter;

    return matchesSearch && matchesWilaya && matchesCategory && matchesStatus && matchesMaintenance;
  });

  const uniqueWilayas = Array.from(new Set(equipment.map(e => e.wilaya))).filter(Boolean);
  const uniqueCategories = Array.from(new Set(equipment.map(e => e.category))).filter(Boolean);

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {isAr ? 'العتاد والمعدات' : 'Équipement & Matériel'}
          </h2>
          <p className="text-slate-500 mt-1">
            {isAr ? 'إدارة المعدات الثقيلة وتتبع حالتها' : 'Gérer les engins lourds et suivre leur état'}
          </p>
        </div>
        <AddEquipmentDialog isAr={isAr} onSuccess={fetchEquipment} />
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={isAr ? 'ابحث عن عتاد...' : 'Rechercher...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rtl:pr-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={isAr ? "الولاية" : "Wilaya"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                  {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={isAr ? "الفئة" : "Catégorie"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الفئات" : "Toutes"}</SelectItem>
                  {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={isAr ? "الحالة" : "Statut"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                  <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                  <SelectItem value="in_use">{isAr ? "قيد الاستخدام" : "En service"}</SelectItem>
                  <SelectItem value="maintenance">{isAr ? "صيانة" : "Maintenance"}</SelectItem>
                  <SelectItem value="out_of_service">{isAr ? "خارج الخدمة" : "Hors service"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={isAr ? "حالة الصيانة" : "Maintenance"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "الكل" : "Tous"}</SelectItem>
                  <SelectItem value="up_to_date">{isAr ? "محدث" : "À jour"}</SelectItem>
                  <SelectItem value="due_soon">{isAr ? "قريباً" : "Prochainement"}</SelectItem>
                  <SelectItem value="overdue">{isAr ? "متأخر" : "En retard"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'المعدة' : 'Équipement'}</TableHead>
                    <TableHead>{isAr ? 'العلامة / الموديل' : 'Marque / Modèle'}</TableHead>
                    <TableHead>{isAr ? 'الرقم التسلسلي' : 'N° Série'}</TableHead>
                    <TableHead>{isAr ? 'الأجر اليومي' : 'Taux/Jour'}</TableHead>
                    <TableHead>{isAr ? 'الولاية' : 'Wilaya'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Statut'}</TableHead>
                    <TableHead>{isAr ? 'الصيانة' : 'Maint.'}</TableHead>
                    <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                        <Truck className="mx-auto w-10 h-10 text-slate-300 mb-3" />
                        {isAr ? 'لا توجد معدات مطابقة' : 'Aucun équipement trouvé'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEquipment.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center overflow-hidden">
                              {item.photo_url ? (
                                <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Truck className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold">{item.name}</div>
                              <div className="text-xs text-slate-500">{item.category}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.brand} <span className="text-slate-400">({item.model})</span>
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-xs">{item.serial_number}</code>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {item.daily_rate.toLocaleString()} <span className="text-xs text-slate-400">DZD</span>
                        </TableCell>
                        <TableCell>{item.wilaya}</TableCell>
                        <TableCell>
                          <EquipmentStatusBadge status={item.status} isAr={isAr} />
                        </TableCell>
                        <TableCell>
                          <MaintenanceStatusBadge status={item.maintenance_status} isAr={isAr} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <AddEquipmentDialog
                                isAr={isAr}
                                onSuccess={fetchEquipment}
                                equipment={item}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                                    <Edit className="w-4 h-4" />
                                    {isAr ? 'تعديل' : 'Modifier'}
                                  </DropdownMenuItem>
                                }
                              />
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer gap-2"
                                onClick={() => askDelete(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                {isAr ? 'حذف' : 'Supprimer'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف العتاد" : "Supprimer l'équipement"}
        description={isAr ? "هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه." : "Cette action est irréversible."}
      />
    </div>
  );
}