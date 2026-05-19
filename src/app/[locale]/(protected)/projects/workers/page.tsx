"use client";

import { use, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2, User, Phone, MapPin, CheckCircle2, MoreVertical, Edit, Trash2 } from "lucide-react";
import { workersService } from "@/lib/services/workers-service";
import { Worker, WorkerStatus } from "@/lib/types/projects";
import { AddWorkerDialog } from "@/components/workers/AddWorkerDialog";
import { WorkerStatusBadge } from "@/components/workers/WorkerStatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkersListPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const data = await workersService.getAll();
      setWorkers(data);
    } catch (error) {
      toast.error(isAr ? 'فشل في تحميل العمال' : 'Échec du chargement des ouvriers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    
    // Realtime subscription
    const unsubscribe = workersService.subscribe(() => {
      fetchWorkers();
    });

    return () => { unsubscribe(); };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا العامل؟' : 'Êtes-vous sûr de vouloir supprimer cet ouvrier?')) return;
    
    try {
      await workersService.delete(id);
      toast.success(isAr ? 'تم حذف العامل بنجاح' : 'Ouvrier supprimé avec succès');
      fetchWorkers(); // Refresh the list
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ أثناء الحذف' : 'Erreur lors de la suppression');
    }
  };

  const filteredWorkers = workers.filter(w => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      (w.full_name || '').toLowerCase().includes(term) || 
      (w.job_title || '').toLowerCase().includes(term) || 
      (w.wilaya || '').toLowerCase().includes(term) ||
      (w.cin || '').includes(term)
    );
    
    const matchesWilaya = wilayaFilter === 'all' || w.wilaya === wilayaFilter;
    const matchesJob = jobFilter === 'all' || w.job_title === jobFilter;
    const matchesAvailability = availabilityFilter === 'all' || w.availability === availabilityFilter;

    return matchesSearch && matchesWilaya && matchesJob && matchesAvailability;
  });

  const uniqueWilayas = Array.from(new Set(workers.map(w => w.wilaya))).filter(Boolean);
  const uniqueJobs = Array.from(new Set(workers.map(w => w.job_title))).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{isAr ? 'قائمة العمال' : 'Liste des ouvriers'}</h2>
          <p className="text-slate-500 mt-1">{isAr ? 'إدارة القوى العاملة وتتبع مهامهم' : 'Gérer la main-d\'œuvre et suivre leurs affectations'}</p>
        </div>
        <AddWorkerDialog isAr={isAr} onSuccess={fetchWorkers} />
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث عن عامل (الاسم، CIN...)' : 'Rechercher un ouvrier (Nom, CIN...)'} 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-md text-sm rtl:pr-10 rtl:pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={isAr ? "الولاية" : "Wilaya"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes les wilayas"}</SelectItem>
                  {uniqueWilayas.map(w => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={isAr ? "الوظيفة" : "Poste"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الوظائف" : "Tous les postes"}</SelectItem>
                  {uniqueJobs.map(j => (
                    <SelectItem key={j} value={j}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={isAr ? "الحالة" : "Statut"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الحالات" : "Tous les statuts"}</SelectItem>
                  <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                  <SelectItem value="on_project">{isAr ? "في مشروع" : "Sur projet"}</SelectItem>
                  <SelectItem value="unavailable">{isAr ? "غير متاح" : "Indisponible"}</SelectItem>
                  <SelectItem value="vacation">{isAr ? "في إجازة" : "En congé"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-4 space-x-reverse">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredWorkers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <User className="w-8 h-8 text-slate-300" />
                    <p>{isAr ? 'لا يوجد عمال مطابقون للبحث' : 'Aucun ouvrier trouvé'}</p>
                  </div>
                ) : (
                  filteredWorkers.map((worker) => (
                    <div key={worker.id} className="p-4 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      {/* Top row: Avatar + Name + Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                            {worker.photo_url ? (
                              <img src={worker.photo_url} alt={worker.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">{worker.full_name}</h3>
                            <span className="text-xs text-slate-500 font-mono">CIN: {worker.cin}</span>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rtl:text-right">
                            <AddWorkerDialog 
                              isAr={isAr} 
                              onSuccess={fetchWorkers} 
                              worker={worker}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                                  <Edit className="w-4 h-4" />
                                  {isAr ? 'تعديل' : 'Modifier'}
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuItem className="text-red-600 cursor-pointer gap-2" onClick={() => handleDelete(worker.id)}>
                              <Trash2 className="w-4 h-4" />
                              {isAr ? 'حذف' : 'Supprimer'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Middle row: Job title & Status */}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-50 dark:border-slate-850 pt-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? 'الوظيفة' : 'Poste'}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">{worker.job_title}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">{isAr ? 'الحالة' : 'Statut'}</span>
                          <WorkerStatusBadge status={worker.availability} isAr={isAr} />
                        </div>
                      </div>

                      {/* Details row: Phone & Wilaya */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/30">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? 'الهاتف' : 'Téléphone'}</span>
                          <a href={`tel:${worker.phone}`} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                            <Phone className="w-3.5 h-3.5" /> {worker.phone}
                          </a>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{isAr ? 'الولاية' : 'Wilaya'}</span>
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-350">
                            <MapPin className="w-3.5 h-3.5 text-red-500" /> {worker.wilaya}
                          </div>
                        </div>
                      </div>

                      {/* Rate row */}
                      <div className="flex justify-between items-center bg-blue-50/30 dark:bg-blue-950/10 p-2.5 rounded-lg border border-blue-100/20 dark:border-blue-900/10">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? 'الأجر اليومي' : 'Taux journalier'}</span>
                        <div className="font-bold text-slate-950 dark:text-slate-50">
                          {worker.daily_rate.toLocaleString()} <span className="text-[10px] text-slate-505 font-normal">DZD/J</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-y">
                  <TableRow>
                    <TableHead className="w-[250px]">{isAr ? 'صورة / العامل' : 'Photo / Ouvrier'}</TableHead>
                    <TableHead>{isAr ? 'الوظيفة' : 'Poste'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Statut'}</TableHead>
                    <TableHead>{isAr ? 'التفاصيل' : 'Détails'}</TableHead>
                    <TableHead>{isAr ? 'الأجر اليومي' : 'Taux'}</TableHead>
                    <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <User className="w-8 h-8 text-slate-300" />
                          <p>{isAr ? 'لا يوجد عمال مطابقون للبحث' : 'Aucun ouvrier trouvé'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWorkers.map((worker) => (
                      <TableRow key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {worker.photo_url ? (
                                <img src={worker.photo_url} alt={worker.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold flex items-center gap-1.5">
                                {worker.full_name}
                              </div>
                              <div className="text-xs text-slate-500">CIN: {worker.cin}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {worker.job_title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <WorkerStatusBadge status={worker.availability} isAr={isAr} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <Phone className="w-3 h-3" /> {worker.phone}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <MapPin className="w-3 h-3" /> {worker.wilaya}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {worker.daily_rate} <span className="text-[10px] text-slate-500">DZD/J</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <AddWorkerDialog 
                                isAr={isAr} 
                                onSuccess={fetchWorkers} 
                                worker={worker}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                                    <Edit className="w-4 h-4" />
                                    {isAr ? 'تعديل' : 'Modifier'}
                                  </DropdownMenuItem>
                                }
                              />
                              <DropdownMenuItem className="text-red-600 cursor-pointer gap-2" onClick={() => handleDelete(worker.id)}>
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
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
