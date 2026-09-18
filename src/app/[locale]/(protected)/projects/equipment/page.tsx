"use client";

import { use, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataState } from "@/components/ui/data-state";
import { CompanyScopeNotice } from "@/components/team/CompanyScopeNotice";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, Loader2, Truck, MapPin, MoreVertical, Edit, Trash2, Plus,
  SlidersHorizontal, Wrench, Gauge,
} from "lucide-react";
import { equipmentService } from "@/lib/services/equipment-service";
import { useCan } from "@/hooks/use-can";
import { Equipment } from "@/lib/types/projects";
import { AddEquipmentDialog } from "@/components/equipment/AddEquipmentDialog";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { MaintenanceStatusBadge } from "@/components/equipment/MaintenanceStatusBadge";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { useAutoRefresh } from "@/lib/hooks/use-auto-refresh";
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

  // قائمة العتاد العامة: العرض مفتوح لأعضاء الشركة،
  // الإضافة/التعديل/الحذف → manage_projects فقط (owner/admin).
  const { can } = useCan();
  const canManage = can('manage_projects');

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

  // إعادة الجلب بصمت عند عودة الاتصال/التركيز — لا قائمة فارغة معلّقة بعد تجميد الخلفية.
  const refreshEquipmentSilently = async () => {
    try {
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch {
      // تُبقى الحالة الحالية؛ الجلب الأولي يعرض الخطأ إن وُجد.
    }
  };
  useAutoRefresh({ onReconnect: refreshEquipmentSilently, onFocus: refreshEquipmentSilently });

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

  // رسالة الفارغ واعية بالفلاتر: جدول فارغ وتصفية نشطة ≠ لا بيانات أصلية
  const hasActiveFilters = Boolean(searchQuery.trim()) || activeFilterCount > 0;
  const listEmptyTitle = hasActiveFilters
    ? (isAr ? 'لا توجد نتائج مطابقة' : 'Aucun résultat')
    : (isAr ? 'لا توجد معدات' : 'Aucun équipement');
  const listEmptyDescription = hasActiveFilters
    ? (isAr ? 'عدّل الفلاتر أو البحث لعرض نتائج أخرى' : 'Modifiez les filtres ou la recherche')
    : (isAr ? 'أضف معدة جديدة لبدء التتبع' : 'Ajoutez un équipement pour commencer le suivi');

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
      { /*
      
      <AddEquipmentDialog
        isAr={isAr}
        onSuccess={fetchEquipment}
        equipment={editEquipment ?? undefined}
        open={!!editEquipment}
        onOpenChange={(open) => { if (!open) setEditEquipment(null); }}
      />
*/}

      {/* ════════════════════════════════════════════ */}
      {/* ── الهيدر ── */}
      {/* ════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {isAr ? 'العتاد والمعدات' : 'Équipement & Matériel'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'إدارة المعدات الثقيلة وتتبع حالتها' : 'Gérer les engins lourds et suivre leur état'}
          </p>
        </div>
        {canManage && <AddEquipmentDialog isAr={isAr} onSuccess={fetchEquipment} />}
      </div>

      {/* إشعار غياب العضوية — يظهر لجميع مقاسات الشاشة */}
      <CompanyScopeNotice isAr={isAr} />

      {/* ════════════════════════════════════════════ */}
      {/* ── MOBILE ── */}
      {/* ════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4">
        {/* شريط البحث + زر الفلاتر */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم...' : 'Recherche...'}
              className="w-full ps-10 pe-4 py-2.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card transition-shadow"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-md shrink-0 relative">
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-lg max-h-[70vh]" dir={isAr ? 'rtl' : 'ltr'}>
              <SheetHeader className="pb-4">
                <SheetTitle className="font-bold text-lg">{isAr ? 'الفلاتر' : 'Filtres'}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{isAr ? 'الولاية' : 'Wilaya'}</label>
                  <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder={isAr ? "كل الولايات" : "Toutes"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                      {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{isAr ? 'الفئة' : 'Catégorie'}</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder={isAr ? "كل الفئات" : "Toutes"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل الفئات" : "Toutes"}</SelectItem>
                      {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{isAr ? 'الحالة' : 'Statut'}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder={isAr ? "كل الحالات" : "Tous"} /></SelectTrigger>
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
                  <label className="text-xs font-bold text-muted-foreground uppercase">{isAr ? 'الصيانة' : 'Maintenance'}</label>
                  <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder={isAr ? "الكل" : "Tous"} /></SelectTrigger>
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
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 font-bold text-sm"
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
          <p className="text-sm font-bold text-muted-foreground">
            {isAr ? `${filteredEquipment.length} معدة` : `${filteredEquipment.length} équipements`}
          </p>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-primary h-8 px-2"
              onClick={() => { setWilayaFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); setMaintenanceFilter('all'); }}
            >
              {activeFilterCount} {isAr ? 'فلتر نشط' : 'actif'}
            </Button>
          )}
        </div>

        {/* قائمة المعدات */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <DataState.Empty
            icon={<Truck className="h-12 w-12 text-muted-foreground" />}
            title={listEmptyTitle}
            description={listEmptyDescription}
          />
        ) : (
          <div className="space-y-2">
            {filteredEquipment.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-lg border border-border p-3.5 shadow-sm active:bg-muted transition-colors"
              >
                {/* صف أعلى: الأيقونة + الاسم + شارات الحالة + القائمة */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-success/10 flex items-center justify-center overflow-hidden shrink-0 border border-success/20">
                    {item.photo_url ? (
                      <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Truck className="w-5 h-5 text-success" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <EquipmentStatusBadge status={item.status} isAr={isAr} />
                      <MaintenanceStatusBadge status={item.maintenance_status} isAr={isAr} />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-md"
                    aria-label="Actions"
                  >
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </div>

                {/* صف المعلومات */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-success/10 border border-success/20 rounded-md p-2 text-center">
                    <p className="text-xs font-bold text-success uppercase mb-0.5">{isAr ? "الأجر/يوم" : "Taux/Jour"}</p>
                    <p className="text-xs font-bold text-success tabular-nums">{item.daily_rate.toLocaleString()} <span className="text-xs opacity-50">DZD</span></p>
                  </div>
                  <div className="bg-muted border border-border rounded-md p-2 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-0.5">{isAr ? "الفئة" : "Catégorie"}</p>
                    <p className="text-xs font-bold text-foreground truncate">{item.category}</p>
                  </div>
                  <div className="bg-muted border border-border rounded-md p-2 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-0.5">{isAr ? "الولاية" : "Wilaya"}</p>
                    <p className="text-xs font-bold text-foreground">{item.wilaya}</p>
                  </div>
                </div>

                {/* الرقم التسلسلي + الماركة */}
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border">
                  {item.brand && (
                    <span className="text-xs font-bold text-muted-foreground bg-muted border border-border rounded-md px-2 py-1">
                      {item.brand} {item.model}
                    </span>
                  )}
                  {item.serial_number && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted border border-border rounded-md px-2 py-1 ms-auto">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={isAr ? 'ابحث عن عتاد...' : 'Rechercher...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rtl:pr-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder={isAr ? "الولاية" : "Wilaya"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                  {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder={isAr ? "الفئة" : "Catégorie"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الفئات" : "Toutes"}</SelectItem>
                  {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28"><SelectValue placeholder={isAr ? "الحالة" : "Statut"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                  <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                  <SelectItem value="in_use">{isAr ? "قيد الاستخدام" : "En service"}</SelectItem>
                  <SelectItem value="maintenance">{isAr ? "صيانة" : "Maintenance"}</SelectItem>
                  <SelectItem value="out_of_service">{isAr ? "خارج الخدمة" : "Hors service"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder={isAr ? "الصيانة" : "Maintenance"} /></SelectTrigger>
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
            <DataState.Empty
              icon={<Truck className="h-12 w-12 text-muted-foreground" />}
              title={listEmptyTitle}
              description={listEmptyDescription}
            />
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
                    <TableRow key={item.id} className="hover:bg-muted">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center overflow-hidden">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
<Truck className="w-5 h-5 text-success" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.category}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.brand} <span className="text-muted-foreground">({item.model})</span>
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-xs">{item.serial_number}</code>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.daily_rate.toLocaleString()} <span className="text-xs text-muted-foreground">DZD</span>
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
                            {canManage && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); setEditEquipment(item); }}
                                  className="cursor-pointer gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  {isAr ? 'تعديل' : 'Modifier'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive cursor-pointer gap-2"
                                  onClick={() => askDelete(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {isAr ? 'حذف / تعطيل' : 'Supprimer / Désactiver'}
                                </DropdownMenuItem>
                              </>
                            )}
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
