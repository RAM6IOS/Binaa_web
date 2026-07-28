"use client";

import { use, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, Loader2, Truck, MapPin, MoreVertical, Edit, Trash2, Plus,
  SlidersHorizontal, Wrench, Gauge,
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

  const [disableInfo, setDisableInfo] = useState<{ id: string; projectCount: number } | null>(null);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);

  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch {
      toast.error(isAr ? 'فشل تحميل المعدات' : 'Échec du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEquipment(); }, []);

  useEffect(() => {
    if (!isDeleteModalOpen && !isDisableModalOpen) {
      const timer = setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDeleteModalOpen, isDisableModalOpen]);

  useEffect(() => {
    if (!editEquipment) {
      const timer = setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 150);
      return () => clearTimeout(timer);
    }
  }, [editEquipment]);

  const askDelete = async (id: string) => {
    try {
      const projectCount = await equipmentService.getProjectCount(id);
      if (projectCount >= 1) {
        setDisableInfo({ id, projectCount });
        setIsDisableModalOpen(true);
      } else {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
      }
    } catch {
      toast.error(isAr ? 'خطأ في التحقق' : 'Erreur');
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await equipmentService.delete(itemToDelete);
      setEquipment(prev => prev.filter(item => item.id !== itemToDelete));
      toast.success(isAr ? 'تم الحذف بنجاح ✓' : 'Supprimé ✓');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch {
      toast.error(isAr ? 'فشل الحذف' : 'Erreur');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableInfo) return;
    setIsDisabling(true);
    try {
      await equipmentService.delete(disableInfo.id);
      setEquipment(prev => prev.filter(item => item.id !== disableInfo.id));
      toast.warning(isAr
        ? `تم التعطيل (${disableInfo.projectCount} مشاريع)`
        : `Désactivé (${disableInfo.projectCount} projets)`);
      setIsDisableModalOpen(false);
      setDisableInfo(null);
    } catch {
      toast.error(isAr ? 'خطأ' : 'Erreur');
    } finally {
      setIsDisabling(false);
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

  const activeFilterCount = [wilayaFilter, categoryFilter, statusFilter, maintenanceFilter].filter(f => f !== 'all').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ─── مودال الحذف ─── */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف العتاد" : "Supprimer l'équipement"}
        description={isAr ? "هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه." : "Cette action est irréversible."}
      />

      {/* ─── مودال التعطيل ─── */}
      <DeleteConfirmationDialog
        isOpen={isDisableModalOpen}
        onOpenChange={(open) => { if (!open) { setIsDisableModalOpen(false); setDisableInfo(null); } }}
        onConfirm={handleConfirmDisable}
        isLoading={isDisabling}
        isAr={isAr}
        disableMode
        title={isAr ? "لا يمكن حذف هذا العتاد" : "Suppression impossible"}
        description={isAr
          ? `مرتبط بـ ${disableInfo?.projectCount || 0} مشاريع. هل تريد التعطيل بدلاً من الحذف؟`
          : `Lié à ${disableInfo?.projectCount || 0} projet(s). Désactiver ?`}
      />

      {/* ─── مودال التعديل ─── */}
      <AddEquipmentDialog
        isAr={isAr}
        onSuccess={fetchEquipment}
        equipment={editEquipment ?? undefined}
        open={!!editEquipment}
        onOpenChange={(open) => { if (!open) setEditEquipment(null); }}
      />

      {/* ════════════════════════════════════════════ */}
      {/* ── الهيدر ── */}
      {/* ════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
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

      {/* ════════════════════════════════════════════ */}
      {/* ── MOBILE ── */}
      {/* ════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4">
        {/* شريط البحث + زر الفلاتر */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم...' : 'Recherche...'}
              className="w-full ps-10 pe-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-shadow"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0 relative">
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]" dir={isAr ? 'rtl' : 'ltr'}>
              <SheetHeader className="pb-4">
                <SheetTitle className="font-black text-lg">{isAr ? 'الفلاتر' : 'Filtres'}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'الولاية' : 'Wilaya'}</label>
                  <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isAr ? "كل الولايات" : "Toutes"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                      {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'الفئة' : 'Catégorie'}</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isAr ? "كل الفئات" : "Toutes"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل الفئات" : "Toutes"}</SelectItem>
                      {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'الحالة' : 'Statut'}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isAr ? "كل الحالات" : "Tous"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                      <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                      <SelectItem value="in_use">{isAr ? "قيد الاستخدام" : "En service"}</SelectItem>
                      <SelectItem value="maintenance">{isAr ? "صيانة" : "Maintenance"}</SelectItem>
                      <SelectItem value="out_of_service">{isAr ? "خارج الخدمة" : "Hors service"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'الصيانة' : 'Maintenance'}</label>
                  <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isAr ? "الكل" : "Tous"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "الكل" : "Tous"}</SelectItem>
                      <SelectItem value="up_to_date">{isAr ? "محدث" : "À jour"}</SelectItem>
                      <SelectItem value="due_soon">{isAr ? "قريباً" : "Prochainement"}</SelectItem>
                      <SelectItem value="overdue">{isAr ? "متأخر" : "En retard"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-sm"
                    onClick={() => { setWilayaFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); setMaintenanceFilter('all'); }}
                  >
                    {isAr ? 'مسح الفلاتر' : 'Réinitialiser'}
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* عداد النتائج */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-500">
            {isAr ? `${filteredEquipment.length} معدة` : `${filteredEquipment.length} équipements`}
          </p>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-blue-600 h-8 px-2"
              onClick={() => { setWilayaFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); setMaintenanceFilter('all'); }}
            >
              {activeFilterCount} {isAr ? 'فلتر نشط' : 'actif'}
            </Button>
          )}
        </div>

        {/* قائمة المعدات */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">{isAr ? 'لا توجد معدات' : 'Aucun équipement'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEquipment.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm active:bg-slate-50 transition-colors"
              >
                {/* صف أعلى: الأيقونة + الاسم + شارات الحالة + القائمة */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden shrink-0 border border-emerald-100">
                    {item.photo_url ? (
                      <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Truck className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[15px] text-slate-900 truncate">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <EquipmentStatusBadge status={item.status} isAr={isAr} />
                      <MaintenanceStatusBadge status={item.maintenance_status} isAr={isAr} />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-xl"
                    aria-label="Actions"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </Button>
                </div>

                {/* صف المعلومات */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2 text-center">
                    <p className="text-[8px] font-black text-emerald-500 uppercase mb-0.5">{isAr ? "الأجر/يوم" : "Taux/Jour"}</p>
                    <p className="text-xs font-black text-emerald-700 tabular-nums">{item.daily_rate.toLocaleString()} <span className="text-[8px] opacity-50">DZD</span></p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{isAr ? "الفئة" : "Catégorie"}</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{item.category}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{isAr ? "الولاية" : "Wilaya"}</p>
                    <p className="text-xs font-bold text-slate-700">{item.wilaya}</p>
                  </div>
                </div>

                {/* الرقم التسلسلي + الماركة */}
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
                  {item.brand && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                      {item.brand} {item.model}
                    </span>
                  )}
                  {item.serial_number && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 ms-auto">
                      {item.serial_number}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* ── DESKTOP ── (بدون تغيير) */}
      {/* ════════════════════════════════════════════ */}
      <Card className="hidden md:block">
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={isAr ? 'ابحث عن عتاد...' : 'Rechercher...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rtl:pr-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder={isAr ? "الولاية" : "Wilaya"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                  {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder={isAr ? "الفئة" : "Catégorie"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الفئات" : "Toutes"}</SelectItem>
                  {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder={isAr ? "الحالة" : "Statut"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                  <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                  <SelectItem value="in_use">{isAr ? "قيد الاستخدام" : "En service"}</SelectItem>
                  <SelectItem value="maintenance">{isAr ? "صيانة" : "Maintenance"}</SelectItem>
                  <SelectItem value="out_of_service">{isAr ? "خارج الخدمة" : "Hors service"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder={isAr ? "الصيانة" : "Maintenance"} /></SelectTrigger>
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
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Truck className="mx-auto w-10 h-10 text-slate-300 mb-3" />
              {isAr ? 'لا توجد معدات مطابقة' : 'Aucun équipement trouvé'}
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
                  {filteredEquipment.map((item) => (
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
                      <TableCell><EquipmentStatusBadge status={item.status} isAr={isAr} /></TableCell>
                      <TableCell><MaintenanceStatusBadge status={item.maintenance_status} isAr={isAr} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setEditEquipment(item); }}
                              className="cursor-pointer gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              {isAr ? 'تعديل' : 'Modifier'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 cursor-pointer gap-2"
                              onClick={() => askDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              {isAr ? 'حذف / تعطيل' : 'Supprimer / Désactiver'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
