"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image"; // تحسين رقم 1: استبدال <img> بـ <Image>
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Truck, Plus, Trash2, Clock, HardHat,
  Construction, Loader2, AlertTriangle, Wallet,
  Info, ArrowRightLeft, UserMinus, Calendar
} from "lucide-react";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import { Project, ProjectWorker, ProjectEquipment } from "@/lib/types/projects";
import { AssignResourceModal } from "./AssignResourceModal";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ResourcesTabProps {
  project: Project;
  isAr: boolean;
}

export function ResourcesTab({ project, isAr }: ResourcesTabProps) {
  const [assignedWorkers, setAssignedWorkers] = useState<ProjectWorker[]>([]);
  const [assignedEquipment, setAssignedEquipment] = useState<ProjectEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // الحفاظ على حالة الحذف كما هي
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean; id: string; type: "worker" | "equipment" | null; name: string;
  }>({ isOpen: false, id: "", type: null, name: "" });

  const [isDeleting, setIsDeleting] = useState(false);

  // استخدام useCallback لمنع إعادة تعريف الدالة وتحسين الـ re-renders
  const fetchResources = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [workersData, equipmentData] = await Promise.all([
        projectWorkersService.fetchProjectWorkers(project.id),
        projectEquipmentService.fetchProjectEquipment(project.id)
      ]);
      setAssignedWorkers(workersData || []);
      setAssignedEquipment(equipmentData || []);
    } catch (error) {
      console.error("Resources fetch error:", error);
      toast.error(isAr ? 'فشل في تحديث الموارد' : 'Erreur de mise à jour');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [project.id, isAr]);

  useEffect(() => {
    fetchResources();
    const unsubWorkers = projectWorkersService.subscribe(project.id, () => fetchResources(true));
    const unsubEquipment = projectEquipmentService.subscribe(project.id, () => fetchResources(true));
    return () => { unsubWorkers(); unsubEquipment(); };
  }, [fetchResources]);

  useEffect(() => {
    if (!deleteConfirm.isOpen) {
      const timer = setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 100);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm.isOpen]);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type) return;
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === "worker") await projectWorkersService.remove(deleteConfirm.id);
      else await projectEquipmentService.remove(deleteConfirm.id);
      toast.success(isAr ? 'تم سحب المورد بنجاح ✓' : 'Ressource retirée ✓');
      setDeleteConfirm({ isOpen: false, id: "", type: null, name: "" });
      fetchResources(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const workerDailyTotal = assignedWorkers.reduce((acc, pw) => acc + (pw.worker?.daily_rate || 0), 0);
    return {
      workerDailyTotal,
      equipmentCount: assignedEquipment.length,
      workerCount: assignedWorkers.length
    };
  }, [assignedWorkers, assignedEquipment]);

  // تحسين الأداء 2: استخدام الصور المصغرة من Supabase
  const getSmallThumbnail = (url: string) => {
    if (!url || !url.includes('supabase.co')) return url;
    return `${url}?width=100&quality=80`; // جلب نسخة 100px فقط بدلاً من الأصلية الكبيرة
  };

  if (isLoading && assignedWorkers.length === 0) {
    return (
      <div className="py-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10" dir={isAr ? "rtl" : "ltr"}>

      {/* 1. قسم الإحصائيات (لم نغير تصميمه الجميل، فقط سرعنا الرندر بـ useMemo) */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        <StatCard label={isAr ? 'طاقم العمال' : 'Effectif'} value={stats.workerCount} unit={isAr ? 'عامل' : 'ouv.'} icon={<Users size={20} />} color="blue" />
        <StatCard label={isAr ? 'العتاد الثقيل' : 'Engins'} value={stats.equipmentCount} unit={isAr ? 'قطعة' : 'unit.'} icon={<Truck size={20} />} color="orange" />
        <StatCard label={isAr ? 'كلفة يومية' : 'Coût/j'} value={stats.workerDailyTotal.toLocaleString()} unit="DZD" icon={<Wallet size={20} />} color="emerald" className="xs:col-span-2 md:col-span-1" />
      </div>

      {/* 2. قسم العمال */}
      <Card className="border-none md:border shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900 border-b p-4 md:p-6 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg"><HardHat size={18} /></div>
            <CardTitle className="text-lg md:text-xl font-black">{isAr ? 'إدارة القوى العاملة' : 'Personnel Site'}</CardTitle>
          </div>
          <AssignResourceModal type="worker" projectId={project.id} isAr={isAr} onSuccess={() => fetchResources(true)} excludeIds={assignedWorkers.map(aw => aw.worker_id)} />
        </CardHeader>

        <CardContent className="p-0">
          {/* الموبايل: نظام بطاقات (بدلاً من الجداول لمنع بطء التمرير الجانبي) */}
          <div className="block md:hidden divide-y">
            {assignedWorkers.map((pw) => (
              <div key={pw.id} className="p-4 bg-white dark:bg-slate-950 flex flex-col gap-4 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-center text-start">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-full overflow-hidden border shadow-sm ring-1 ring-slate-100">
                      {pw.worker?.photo_url ? (
                        <Image
                          src={getSmallThumbnail(pw.worker.photo_url)}
                          alt={pw.worker.full_name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase">{pw.worker?.full_name?.charAt(0)}</div>
                      )}
                    </div>
                    <div className="min-w-0 text-start">
                      <h4 className="font-bold text-sm truncate">{pw.worker?.full_name}</h4>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                        {pw.worker?.job_title}
                        {pw.worker?.deleted_at && (
                          <Badge variant="outline" className="text-[8px] mr-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0">{isAr ? 'معطل' : 'Inactif'}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, id: pw.id, type: "worker", name: pw.worker?.full_name || "" })} className="text-slate-300" aria-label="Remove worker">
                    <UserMinus size={18} />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <DetailBox label={isAr ? "الدور" : "Rôle"} value={pw.assigned_role} />
                  <DetailBox label={isAr ? "الساعات" : "Hours"} value={`${pw.daily_hours}h`} />
                  <DetailBox label={isAr ? "اليومية" : "Taux"} value={pw.worker?.daily_rate?.toLocaleString()} highlight />
                </div>
              </div>
            ))}
          </div>

          {/* الحاسوب: جدول منظف برمجياً من مسافات Hydration Error */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 uppercase font-black text-[10px]">
                <TableRow>
                  <TableHead className="ps-6">العامل والمهنة</TableHead>
                  <TableHead>الدور في المشروع</TableHead>
                  <TableHead>الساعات</TableHead>
                  <TableHead>الأجر اليومي</TableHead>
                  <TableHead className="text-right pe-6">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedWorkers.map((pw) => (
                  <TableRow key={pw.id} className="group h-16 transition-colors">
                    <TableCell className="ps-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden shadow-sm shrink-0 border border-slate-200">
                          {pw.worker?.photo_url ? (
                            <Image
                              src={getSmallThumbnail(pw.worker.photo_url)}
                              alt={pw.worker.full_name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : <div className="w-full h-full bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-xs">{pw.worker?.full_name?.charAt(0)}</div>}
                        </div>
                        <div>
                          <div className="font-bold text-sm leading-none mb-1">
                            {pw.worker?.full_name}
                            {pw.worker?.deleted_at && (
                              <Badge variant="outline" className="text-[8px] mr-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0 align-middle">{isAr ? 'معطل' : 'Inactif'}</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{pw.worker?.job_title}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="border-blue-100 bg-blue-50/30 text-blue-700 font-bold px-3 text-[10px] uppercase">{pw.assigned_role}</Badge></TableCell>
                    <TableCell className="font-mono font-black">{pw.daily_hours}h</TableCell>
                    <TableCell className="font-black text-slate-800">{pw.worker?.daily_rate?.toLocaleString()} <span className="text-[9px] opacity-40 ml-0.5">DZD</span></TableCell>
                    <TableCell className="text-right pe-6"><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, id: pw.id, type: "worker", name: pw.worker?.full_name || "" })} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 transition-all rounded-full h-9 w-9" aria-label="Remove worker"><Trash2 size={16} /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 3. قسم العتاد الثقيل (تصميم الهاتف مُفعل تلقائياً هنا) */}
      <Card className="border-none md:border shadow-sm rounded-3xl overflow-hidden mt-6">
        <CardHeader className="bg-emerald-50/10 border-b border-dashed border-emerald-200 p-4 md:p-6 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-inner"><Construction size={18} /></div>
            <CardTitle className="text-lg md:text-xl font-black">{isAr ? 'قائمة الآلات' : 'Parc Machines'}</CardTitle>
          </div>
          <AssignResourceModal type="equipment" projectId={project.id} isAr={isAr} onSuccess={() => fetchResources(true)} excludeIds={assignedEquipment.map(ae => ae.equipment_id)} />
        </CardHeader>

        <CardContent className="p-0">
          <div className="md:hidden">
            {assignedEquipment.map((pe) => (
              <div key={pe.id} className="p-4 border-b flex items-center justify-between bg-white text-start">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border"><Truck size={20} /></div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm truncate">
                      {pe.equipment?.name}
                      {pe.equipment?.deleted_at && (
                        <Badge variant="outline" className="text-[8px] mr-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0">{isAr ? 'معطل' : 'Inactif'}</Badge>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5"><Clock size={11} className="text-blue-500" /><span className="text-[10px] font-black">{pe.usage_hours_per_day}h/j</span></div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, id: pe.id, type: "equipment", name: pe.equipment?.name || "" })} className="text-slate-300 rounded-full h-11 w-11" aria-label="Remove equipment"><Trash2 size={18} /></Button>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 uppercase font-black text-[10px]"><TableRow><TableHead className="ps-6">الآلة</TableHead><TableHead>التصنيف</TableHead><TableHead>الاستعمال</TableHead><TableHead className="text-right pe-6">إجراءات</TableHead></TableRow></TableHeader>
              <TableBody>
                {assignedEquipment.map(pe => (
                  <TableRow key={pe.id} className="group h-16"><TableCell className="ps-6 text-start"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-50 text-orange-600"><Truck size={16} /></div><div className="font-bold text-sm">{pe.equipment?.name}{pe.equipment?.deleted_at && <Badge variant="outline" className="text-[8px] mr-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0">{isAr ? 'معطل' : 'Inactif'}</Badge>}</div></div></TableCell><TableCell><Badge variant="secondary" className="text-[9px] font-black">{pe.equipment?.type}</Badge></TableCell><TableCell className="font-mono font-bold text-blue-600 bg-blue-50/30 px-3 py-1 rounded-full w-fit">{pe.usage_hours_per_day}h/j</TableCell><TableCell className="text-right pe-6"><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, id: pe.id, type: "equipment", name: pe.equipment?.name || "" })} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 rounded-full h-8 w-8" aria-label="Remove equipment"><Trash2 size={14} /></Button></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* المودال الموحد (كما هو دون تغيير في الوظائف) */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(val) => setDeleteConfirm(prev => ({ ...prev, isOpen: val }))}>
        <AlertDialogContent className="sm:max-w-[420px] rounded-[32px] p-0 overflow-hidden shadow-2xl border-none" dir={isAr ? "rtl" : "ltr"}>
          <div className="bg-red-50 p-8 flex flex-col items-center gap-4 text-center border-b">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-bounce shadow-inner border border-white"><AlertTriangle className="text-red-600" size={32} /></div>
            <AlertDialogTitle className="text-xl font-black">{isAr ? "هل تود فك الارتباط؟" : "Annuler l'affectation ?"}</AlertDialogTitle>
            <p className="text-xs font-black text-red-600/50 uppercase bg-white/50 px-3 py-1 rounded-full border border-red-50">{deleteConfirm.name}</p>
          </div>
          <div className="p-8 pt-6 space-y-6">
            <p className="text-xs font-bold leading-relaxed text-slate-600 text-center opacity-80">{isAr ? "تحذير: سيتم سحب هذا المورد من سجلات المشروع الحالية. لن يظهر هذا المورد في التقارير اليومية المستقبلية لهذا المشروع حتى يعاد تعيينه مجدداً." : "Retire la ressource de ce projet uniquement."}</p>
            <AlertDialogFooter className="flex-row gap-3">
              <AlertDialogCancel className="h-12 flex-1 rounded-2xl font-black border-slate-100">إلغاء</AlertDialogCancel>
              <Button variant="destructive" className="h-12 flex-1 rounded-2xl font-black shadow-lg shadow-red-200" disabled={isDeleting} onClick={handleConfirmDelete}>{isDeleting ? <Loader2 className="animate-spin" /> : "تأكيد"}</Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ────────────────────────────────────────────
// مكونات المساعدة (Utilities)
// ────────────────────────────────────────────

function StatCard({ label, value, unit, icon, color, className }: any) {
  const styles: any = {
    blue: "bg-blue-600 shadow-blue-100",
    emerald: "bg-emerald-600 shadow-emerald-100",
    orange: "bg-orange-500 shadow-orange-100"
  };
  return (
    <div className={`p-4 rounded-[28px] text-white flex items-center justify-between shadow-xl transition-all active:scale-[0.98] ${styles[color]} ${className}`}>
      <div className="text-start space-y-0.5">
        <p className="text-[9px] font-black uppercase opacity-60 tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5 leading-none">
          <h3 className="text-2xl font-black tabular-nums">{value}</h3>
          {unit && <span className="text-[10px] font-black opacity-50 uppercase">{unit}</span>}
        </div>
      </div>
      <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/20 ring-4 ring-white/5">{icon}</div>
    </div>
  );
}

function DetailBox({ label, value, highlight = false }: any) {
  return (
    <div className={`${highlight ? 'bg-emerald-50/50' : 'bg-slate-50/50 dark:bg-slate-900'} p-2 rounded-[18px] border dark:border-slate-800 text-center flex flex-col justify-center`}>
      <span className={`text-[8px] font-black uppercase block mb-0.5 ${highlight ? 'text-emerald-500' : 'text-slate-400'}`}>{label}</span>
      <p className={`text-[10px] font-black truncate px-0.5 ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}

function EmptyMobile({ isAr }: { isAr: boolean }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center grayscale opacity-30"><Construction size={40} /><p className="text-[10px] font-black mt-2 tracking-widest uppercase">{isAr ? "فارغ" : "Liste Vide"}</p></div>
  );
}