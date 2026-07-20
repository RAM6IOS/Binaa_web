"use client";

import { use, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Loader2, User, Phone, MapPin,
  MoreVertical, Edit, Trash2, HardHat, IdCard, Banknote
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

  // ─── إدارة حالة الحذف الموحد ───
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── حالة التعطيل (Soft Delete) ───
  const [disableInfo, setDisableInfo] = useState<{ id: string; projectCount: number } | null>(null);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // ─── حالة التحقق من الارتباطات ───
  const [isCheckingAssoc, setIsCheckingAssoc] = useState(false);

  // Filters
  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

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

    // تصحيح الـ subscription
    const unsubscribe = workersService.subscribe(() => {
      fetchWorkers();
    });

    // Cleanup: call unsubscribe (ignore its returned promise)
    return () => {
      // If unsubscribe returns a Promise, we deliberately ignore it as cleanup should be void
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      unsubscribe();
    };
  }, []);

  // ─── منع تجمد الصفحة بعد إغلاق المودال (السر البرمجي) ───
  useEffect(() => {
    if (!isDeleteModalOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isDeleteModalOpen]);

  // ─── فتح المودال (تحقق من الارتباطات أولاً) ───
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
      toast.error(isAr ? 'خطأ في التحقق من الارتباطات' : 'Erreur de vérification');
    } finally {
      setIsCheckingAssoc(false);
    }
  };

  // ─── الحذف الفعلي (Hard Delete - بدون مشاريع) ───
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await workersService.delete(itemToDelete);
      setWorkers(prev => prev.filter(w => w.id !== itemToDelete));
      toast.success(isAr ? 'تم حذف ملف العامل بنجاح' : 'Ouvrier supprimé ✓');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(isAr ? 'خطأ في العملية' : 'Erreur');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── التعطيل (Soft Delete - مرتبط بمشاريع) ───
  const handleConfirmDisable = async () => {
    if (!disableInfo) return;
    setIsDisabling(true);
    try {
      await workersService.delete(disableInfo.id);
      setWorkers(prev => prev.filter(w => w.id !== disableInfo.id));
      toast.warning(isAr
        ? `تم تعطيل العامل (مرتبط بـ ${disableInfo.projectCount} مشاريع)`
        : `Ouvrier désactivé (lié à ${disableInfo.projectCount} projets)`);
      setIsDisableModalOpen(false);
      setDisableInfo(null);
    } catch (error) {
      toast.error(isAr ? 'خطأ في العملية' : 'Erreur');
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ─── مودال الحذف الاحترافي (Hard Delete) ─── */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف ملف العامل" : "Supprimer le dossier"}
        description={isAr
          ? "هل أنت متأكد؟ سيتم حذف جميع بيانات هذا العامل وتاريخ حضوره وسلفياته نهائياً من قاعدة البيانات العامة للشركة."
          : "Attention: Cela supprimera définitivement le dossier de l'ouvrier, son historique et ses avances de la base globale."}
      />

      {/* ─── مودال التعطيل (Soft Delete - مرتبط بمشاريع) ─── */}
      <DeleteConfirmationDialog
        isOpen={isDisableModalOpen}
        onOpenChange={(open) => { if (!open) { setIsDisableModalOpen(false); setDisableInfo(null); } }}
        onConfirm={handleConfirmDisable}
        isLoading={isDisabling}
        isAr={isAr}
        disableMode
        title={isAr ? "لا يمكن حذف هذا العامل" : "Suppression impossible"}
        description={isAr
          ? `هذا العامل مرتبط بـ ${disableInfo?.projectCount || 0} مشاريع. لا يمكن حذفه بالكامل. هل تريد تعطيله (إخفاؤه) بدلاً من ذلك؟ سيختفي من القوائم الرئيسية لكنه سيبقى مرئياً في المشاريع السابقة.`
          : `Cet ouvrier est lié à ${disableInfo?.projectCount || 0} projet(s). Impossible de le supprimer. Voulez-vous le désactiver (le masquer) ? Il disparaîtra des listes principales mais restera visible dans les projets précédents.`}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="text-start">
          <h2 className="text-3xl font-black tracking-tight">{isAr ? 'إدارة الموارد البشرية' : 'Main d\'œuvre'}</h2>
          <p className="text-slate-500 font-medium mt-1">{isAr ? 'تنظيم العمال، تتبع الحرف والوثائق' : 'Gestion du personnel et métiers'}</p>
        </div>
        <AddWorkerDialog isAr={isAr} onSuccess={fetchWorkers} />
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="py-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث باسم العامل، بطاقة التعريف...' : 'Recherche par nom ou CIN...'}
                className="w-full ps-10 pe-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 transition-shadow"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
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
            <>
              {/* 📱 Mobile View (Modern Cards) */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredWorkers.length === 0 ? (
                  <div className="py-20 text-center opacity-30 grayscale"><HardHat className="w-12 h-12 mx-auto mb-2" /><p>{isAr ? 'لا يوجد عمال' : 'Aucun'}</p></div>
                ) : (
                  filteredWorkers.map((worker) => (
                    <div key={worker.id} className="p-5 space-y-4 hover:bg-slate-50/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <AvatarImage src={worker.photo_url || ''} />
                            <AvatarFallback className="bg-blue-50 text-blue-600 font-black">{worker.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-start">
                            <h3 className="font-bold text-slate-900 text-lg leading-none">{worker.full_name}</h3>
                            <Badge variant="secondary" className="text-[10px] mt-2 font-black uppercase opacity-60 tabular-nums">CIN: {worker.cin}</Badge>
                          </div>
                        </div>
                        <ActionMenu worker={worker} isAr={isAr} refresh={fetchWorkers} onDeleteClick={() => askDelete(worker.id)} />
                      </div>

                      <div className="flex items-center justify-between py-2 border-y border-slate-50 border-dashed">
                        <div className="text-start">
                          <p className="text-[10px] font-black text-slate-400 uppercase">{isAr ? 'الحرفة / الدور' : 'Métier'}</p>
                          <p className="font-bold text-slate-700">{worker.job_title}</p>
                        </div>
                        <WorkerStatusBadge status={worker.availability} isAr={isAr} />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-start">
                        <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border space-y-0.5">
                          <p className="text-[9px] font-black text-slate-400 flex items-center gap-1.5"><Phone size={10} /> {isAr ? 'الاتصال' : 'Contact'}</p>
                          <a href={`tel:${worker.phone}`} className="text-blue-600 text-xs font-black hover:underline">{worker.phone}</a>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100/40 space-y-0.5">
                          <p className="text-[9px] font-black text-emerald-600 flex items-center gap-1.5"><Banknote size={10} /> {isAr ? 'الأجر اليومي' : 'Journalier'}</p>
                          <p className="text-emerald-700 text-xs font-black">{worker.daily_rate?.toLocaleString()} <span className="text-[8px]">DZD</span></p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 🖥️ Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                          <ActionMenu worker={worker} isAr={isAr} refresh={fetchWorkers} onDeleteClick={() => askDelete(worker.id)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── المكونات الفرعية المنظمة ──

function ActionMenu({ worker, isAr, refresh, onDeleteClick }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-md transition-all h-9 w-9" aria-label="Actions">
          <MoreVertical className="w-4 h-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[170px] p-2 rounded-2xl shadow-2xl">
        <AddWorkerDialog
          isAr={isAr}
          onSuccess={refresh}
          worker={worker}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2 py-2.5 font-bold text-xs rounded-xl">
              <Edit className="w-3.5 h-3.5 text-blue-500" />
              {isAr ? 'تعديل الملف' : 'Détails / Modifier'}
            </DropdownMenuItem>
          }
        />
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