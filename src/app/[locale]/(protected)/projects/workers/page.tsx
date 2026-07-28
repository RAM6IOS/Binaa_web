"use client";

import { use, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, Loader2, User, Phone, MapPin,
  MoreVertical, Edit, Trash2, HardHat, IdCard, Banknote,
  SlidersHorizontal, PhoneCall, ChevronLeft,
} from "lucide-react";
import { workersService } from "@/lib/services/workers-service";
import { Worker } from "@/lib/types/projects";
import { AddWorkerDialog } from "@/components/workers/AddWorkerDialog";
import { WorkerStatusBadge } from "@/components/workers/WorkerStatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { toast } from "sonner";

export default function WorkersListPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [disableInfo, setDisableInfo] = useState<{ id: string; projectCount: number } | null>(null);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const [isCheckingAssoc, setIsCheckingAssoc] = useState(false);

  const [editWorker, setEditWorker] = useState<Worker | null>(null);

  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const data = await workersService.getAll();
      setWorkers(data || []);
    } catch (error) {
      toast.error(isAr ? 'فشل تحميل العمال' : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const unsubscribe = workersService.subscribe(() => { fetchWorkers(); });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isDeleteModalOpen) {
      const timer = setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 150);
      return () => clearTimeout(timer);
    }
  }, [isDeleteModalOpen]);

  useEffect(() => {
    if (!editWorker) {
      const timer = setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 150);
      return () => clearTimeout(timer);
    }
  }, [editWorker]);

  const askDelete = async (id: string) => {
    setIsCheckingAssoc(true);
    try {
      const projectCount = await workersService.getProjectCount(id);
      if (projectCount >= 1) {
        setDisableInfo({ id, projectCount });
        setIsDisableModalOpen(true);
      } else {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
      }
    } catch {
      toast.error(isAr ? 'خطأ في التحقق' : 'Erreur');
    } finally {
      setIsCheckingAssoc(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await workersService.delete(itemToDelete);
      setWorkers(prev => prev.filter(w => w.id !== itemToDelete));
      toast.success(isAr ? 'تم الحذف بنجاح ✓' : 'Supprimé ✓');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch {
      toast.error(isAr ? 'خطأ' : 'Erreur');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableInfo) return;
    setIsDisabling(true);
    try {
      await workersService.delete(disableInfo.id);
      setWorkers(prev => prev.filter(w => w.id !== disableInfo.id));
      toast.warning(isAr
        ? `تم تعطيل العامل (مرتبط بـ ${disableInfo.projectCount} مشاريع)`
        : `Désactivé (${disableInfo.projectCount} projets)`);
      setIsDisableModalOpen(false);
      setDisableInfo(null);
    } catch {
      toast.error(isAr ? 'خطأ' : 'Erreur');
    } finally {
      setIsDisabling(false);
    }
  };

  const filteredWorkers = workers.filter(w => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (w.full_name || '').toLowerCase().includes(term) || (w.cin || '').includes(term);
    const matchesWilaya = wilayaFilter === 'all' || w.wilaya === wilayaFilter;
    const matchesJob = jobFilter === 'all' || w.job_title === jobFilter;
    const matchesAvailability = availabilityFilter === 'all' || w.availability === availabilityFilter;
    return matchesSearch && matchesWilaya && matchesJob && matchesAvailability;
  });

  const uniqueWilayas = Array.from(new Set(workers.map(w => w.wilaya))).filter(Boolean);
  const uniqueJobs = Array.from(new Set(workers.map(w => w.job_title))).filter(Boolean);

  const activeFilterCount = [wilayaFilter, jobFilter, availabilityFilter].filter(f => f !== 'all').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ─── مودال الحذف ─── */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف ملف العامل" : "Supprimer le dossier"}
        description={isAr
          ? "سيتم حذف جميع بيانات هذا العامل وتاريخ حضوره نهائياً."
          : "Cela supprimera définitivement le dossier de l'ouvrier."}
      />

      {/* ─── مودال التعطيل ─── */}
      <DeleteConfirmationDialog
        isOpen={isDisableModalOpen}
        onOpenChange={(open) => { if (!open) { setIsDisableModalOpen(false); setDisableInfo(null); } }}
        onConfirm={handleConfirmDisable}
        isLoading={isDisabling}
        isAr={isAr}
        disableMode
        title={isAr ? "لا يمكن حذف هذا العامل" : "Suppression impossible"}
        description={isAr
          ? `هذا العامل مرتبط بـ ${disableInfo?.projectCount || 0} مشاريع. هل تريد تعطيله بدلاً من الحذف؟`
          : `Cet ouvrier est lié à ${disableInfo?.projectCount || 0} projet(s). Désactiver ?`}
      />

      {/* ─── مودال التعديل ─── */}
      <AddWorkerDialog
        isAr={isAr}
        onSuccess={fetchWorkers}
        worker={editWorker ?? undefined}
        open={!!editWorker}
        onOpenChange={(open) => { if (!open) setEditWorker(null); }}
      />

      {/* ════════════════════════════════════════════ */}
      {/* ── الهيدر ── */}
      {/* ════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="text-start">
          <h2 className="text-3xl font-black tracking-tight">{isAr ? 'إدارة الموارد البشرية' : 'Main d\'œuvre'}</h2>
          <p className="text-slate-500 font-medium mt-1">{isAr ? 'تنظيم العمال، تتبع الحرف والوثائق' : 'Gestion du personnel et métiers'}</p>
        </div>
        <AddWorkerDialog isAr={isAr} onSuccess={fetchWorkers} />
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
                  <label className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'التخصص' : 'Métier'}</label>
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isAr ? "كل المهن" : "Tous"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل المهن" : "Tous métiers"}</SelectItem>
                      {uniqueJobs.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'الحالة' : 'État'}</label>
                  <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={isAr ? "كل الحالات" : "Tous"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                      <SelectItem value="available">{isAr ? "متاح" : "Libre"}</SelectItem>
                      <SelectItem value="on_project">{isAr ? "في ورشة" : "En poste"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-sm"
                    onClick={() => { setWilayaFilter('all'); setJobFilter('all'); setAvailabilityFilter('all'); }}
                  >
                    {isAr ? 'مسح الفلاتر' : 'Réinitialiser'}
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* عداد العمال */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-500">
            {isAr ? `${filteredWorkers.length} عامل` : `${filteredWorkers.length} ouvriers`}
          </p>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-blue-600 h-8 px-2 gap-1"
              onClick={() => { setWilayaFilter('all'); setJobFilter('all'); setAvailabilityFilter('all'); }}
            >
              {activeFilterCount} {isAr ? 'فلتر نشط' : 'actif'}
            </Button>
          )}
        </div>

        {/* قائمة العمال */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HardHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">{isAr ? 'لا يوجد عمال' : 'Aucun ouvrier'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWorkers.map((worker) => (
              <div
                key={worker.id}
                className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm active:bg-slate-50 transition-colors"
              >
                {/* صف أعلى: Avatar + الاسم + الحالة + القائمة */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm shrink-0">
                    <AvatarImage src={worker.photo_url || ''} />
                    <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-bold">
                      {worker.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[15px] text-slate-900 truncate">{worker.full_name}</p>
                      <WorkerStatusBadge status={worker.availability} isAr={isAr} />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-tight truncate">
                      {worker.job_title}{worker.cin ? ` · ${worker.cin}` : ""}
                    </p>
                  </div>

                  <ActionMenu worker={worker} isAr={isAr} refresh={fetchWorkers} onDeleteClick={() => askDelete(worker.id)} onEdit={(w: Worker) => setEditWorker(w)} />
                </div>

                {/* صف سفلي: الهاتف + الأجر */}
                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                  {worker.phone && (
                    <a
                      href={`tel:${worker.phone}`}
                      className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-3 py-2 font-bold text-xs gap-1.5 hover:bg-emerald-100 transition-colors min-h-[40px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PhoneCall className="w-4 h-4 shrink-0" />
                      <span className="font-mono tracking-tight">{worker.phone}</span>
                    </a>
                  )}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 min-h-[40px]">
                    <Banknote className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-black text-slate-700 tabular-nums">
                      {worker.daily_rate?.toLocaleString()} <span className="text-[9px] font-bold opacity-40">DZD</span>
                    </span>
                  </div>
                  {worker.wilaya && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-2 min-h-[40px] ms-auto">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-500">{worker.wilaya}</span>
                    </div>
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
      <Card className="hidden md:block border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="py-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث باسم العامل، بطاقة التعريف...' : 'Recherche par nom ou CIN...'}
                className="w-full ps-10 pe-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 transition-shadow"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-[125px] h-10 rounded-xl">
                  <SelectValue placeholder={isAr ? "الولاية" : "Wilaya"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                  {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-[145px] h-10 rounded-xl">
                  <SelectValue placeholder={isAr ? "التخصص" : "Métier"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل المهن" : "Tous métiers"}</SelectItem>
                  {uniqueJobs.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-[130px] h-10 rounded-xl font-bold">
                  <SelectValue placeholder={isAr ? "الحالة" : "État"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                  <SelectItem value="available" className="text-emerald-600 font-bold">{isAr ? "متاح" : "Libre"}</SelectItem>
                  <SelectItem value="on_project">{isAr ? "في ورشة" : "En poste"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/60 border-y">
                  <TableRow className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                    <TableHead className="ps-8 py-4 h-14">{isAr ? 'الهوية / العامل' : 'Profile / Nom'}</TableHead>
                    <TableHead>{isAr ? 'المهنة والتخصص' : 'Métier'}</TableHead>
                    <TableHead>{isAr ? 'الأجر اليومي' : 'Journalier'}</TableHead>
                    <TableHead>{isAr ? 'حالة التوافر' : 'Disponibilité'}</TableHead>
                    <TableHead>{isAr ? 'رقم التعريف CIN' : 'N° Identity'}</TableHead>
                    <TableHead className="text-right pe-8 h-14">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-start">
                  {filteredWorkers.map((worker) => (
                    <TableRow key={worker.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="ps-8 py-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform">
                            <AvatarImage src={worker.photo_url || ''} />
                            <AvatarFallback className="bg-slate-100 font-bold uppercase">{worker.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{worker.full_name}</p>
                            <div className="flex items-center gap-1.5 opacity-60"><Phone size={10} /> <span className="text-[11px] font-medium font-mono tracking-tighter">{worker.phone}</span></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /><span className="text-sm font-semibold">{worker.job_title}</span></div></TableCell>
                      <TableCell className="font-black text-slate-900">
                        {worker.daily_rate?.toLocaleString()} <span className="text-[10px] font-bold opacity-40 ml-1">DZD</span>
                      </TableCell>
                      <TableCell><WorkerStatusBadge status={worker.availability} isAr={isAr} /></TableCell>
                      <TableCell><code className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{worker.cin}</code></TableCell>
                      <TableCell className="text-right pe-8">
                  <ActionMenu worker={worker} isAr={isAr} refresh={fetchWorkers} onDeleteClick={() => askDelete(worker.id)} onEdit={(w: Worker) => setEditWorker(w)} />
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

// ── القائمة المنسدلة ──

function ActionMenu({ worker, isAr, refresh, onDeleteClick, onEdit }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-md transition-all h-11 w-11" aria-label="Actions">
          <MoreVertical className="w-5 h-5 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[170px] p-2 rounded-2xl shadow-2xl">
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onEdit(worker); }}
          className="cursor-pointer gap-2 py-2.5 font-bold text-xs rounded-xl"
        >
          <Edit className="w-3.5 h-3.5 text-blue-500" />
          {isAr ? 'تعديل الملف' : 'Détails / Modifier'}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 cursor-pointer gap-2 py-2.5 font-bold text-xs rounded-xl hover:bg-red-50 focus:bg-red-50"
          onClick={onDeleteClick}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {isAr ? 'حذف / تعطيل' : 'Supprimer / Désactiver'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
