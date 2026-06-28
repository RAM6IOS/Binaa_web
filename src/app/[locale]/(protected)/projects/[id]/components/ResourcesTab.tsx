"use client";

import { useEffect, useState, useMemo } from "react";
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

  // ─── إدارة حالة الحذف ───
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean; id: string; type: "worker" | "equipment" | null; name: string;
  }>({ isOpen: false, id: "", type: null, name: "" });

  const [isDeleting, setIsDeleting] = useState(false);

  const fetchResources = async (silent = false) => {
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
      toast.error(isAr ? 'فشل في تحديث قائمة الموارد' : 'Erreur de mise à jour');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    const unsubWorkers = projectWorkersService.subscribe(project.id, () => fetchResources(true));
    const unsubEquipment = projectEquipmentService.subscribe(project.id, () => fetchResources(true));
    return () => { unsubWorkers(); unsubEquipment(); };
  }, [project.id]);

  // ─── منع تجمد الصفحة بعد إغلاق المودال ───
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
      if (deleteConfirm.type === "worker") {
        await projectWorkersService.remove(deleteConfirm.id);
      } else {
        await projectEquipmentService.remove(deleteConfirm.id);
      }
      toast.success(isAr ? 'تم سحب المورد بنجاح ✓' : 'Ressource retirée ✓');
      // الإغلاق الفوري للمودال لمنع التداخل مع التحديث
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

  if (isLoading && assignedWorkers.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-bold text-xs uppercase tracking-widest animate-pulse">{isAr ? 'جاري مزامنة الموارد...' : 'Synchronisation...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10" dir={isAr ? "rtl" : "ltr"}>

      {/* 1. قسم الإحصائيات (Stat Grid) - خلفية ملونة للموبايل لسهولة الرؤية تحت الشمس */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        <StatCard
          label={isAr ? 'طاقم العمال' : 'Effectif'} value={stats.workerCount} unit={isAr ? 'عامل' : 'ouvrier(s)'}
          icon={<Users size={20} />} color="blue"
        />
        <StatCard
          label={isAr ? 'إجمالي العتاد' : 'Parc Engins'} value={stats.equipmentCount} unit={isAr ? 'قطعة' : 'unité(s)'}
          icon={<Truck size={20} />} color="orange"
        />
        <StatCard
          label={isAr ? 'كلفة يومية' : 'Budget MO/J'} value={stats.workerDailyTotal.toLocaleString()} unit="DZD"
          icon={<Wallet size={20} />} color="emerald" className="xs:col-span-2 md:col-span-1"
        />
      </div>

      {/* 2. قسم العمال - موبايل (Cards) vs ديسكتوب (Table) */}
      <Card className="border-none md:border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-none overflow-hidden rounded-[24px] md:rounded-3xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900 border-b p-4 md:p-6 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none"><HardHat size={18} /></div>
            <CardTitle className="text-lg md:text-xl font-black">{isAr ? 'إدارة القوى العاملة' : 'Personnel Site'}</CardTitle>
          </div>
          <AssignResourceModal type="worker" projectId={project.id} isAr={isAr} onSuccess={() => fetchResources(true)} excludeIds={assignedWorkers.map(aw => aw.worker_id)} />
        </CardHeader>

        <CardContent className="p-0">
          {/* نسخة الموبايل (نظام بطاقات iPhone style) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-900">
            {assignedWorkers.length === 0 ? <EmptyMobile isAr={isAr} /> : assignedWorkers.map((pw) => (
              <div key={pw.id} className="p-5 bg-white dark:bg-slate-950 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 text-start">
                    <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-sm">
                      <AvatarImage src={pw.worker?.photo_url || ''} />
                      <AvatarFallback className="font-black text-blue-600">{pw.worker?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-black text-[15px] text-slate-900 dark:text-white leading-none">{pw.worker?.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{pw.worker?.job_title}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, id: pw.id, type: "worker", name: pw.worker?.full_name || "" })} className="text-slate-300 active:text-red-600 h-10 w-10">
                    <UserMinus size={20} />
                  </Button>
                </div>
                {/* تفاصيل الساعات والراتب في شبكة مصغرة */}
                <div className="grid grid-cols-3 gap-2">
                  <DetailBox label={isAr ? "الدور" : "Poste"} value={pw.assigned_role} />
                  <DetailBox label={isAr ? "الساعات" : "Quota"} value={`${pw.daily_hours}H`} />
                  <DetailBox label={isAr ? "الأجر" : "Salaire"} value={pw.worker?.daily_rate?.toLocaleString()} highlight />
                </div>
              </div>
            ))}
          </div>

          {/* نسخة الديسكتوب (الجدول الاحترافي) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/60 uppercase font-black text-[10px]">
                <TableRow><TableHead className="ps-6">العامل</TableHead><TableHead>الدور</TableHead><TableHead>ساعات اليوم</TableHead><TableHead>الأجر اليومي</TableHead><TableHead className="text-right pe-6">إجراءات</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {assignedWorkers.map((pw) => (
                  <TableRow key={pw.id} className="group transition-colors"><TableCell className="ps-6"><div className="flex items-center gap-3 text-start"><Avatar className="h-9 w-9"><AvatarImage src={pw.worker?.photo_url || ''} /><AvatarFallback>{pw.worker?.full_name?.charAt(0)}</AvatarFallback></Avatar><div><p className="font-bold text-sm">{pw.worker?.full_name}</p><p className="text-[10px] text-slate-500 font-medium">{pw.worker?.job_title}</p></div></div></TableCell><TableCell><Badge variant="outline" className="text-[10px] font-bold border-blue-200 text-blue-700 bg-blue-50/30">{pw.assigned_role}</Badge></TableCell><TableCell className="font-mono font-black">{pw.daily_hours}h</TableCell><TableCell className="font-black">{pw.worker?.daily_rate?.toLocaleString()} dzd</TableCell><TableCell className="text-right pe-6"><Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, id: pw.id, type: "worker", name: pw.worker?.full_name || "" })} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 3. قسم العتاد - تصميم Card للجوال */}
      <Card className="border-none md:border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-[24px] md:rounded-3xl mt-10">
        <CardHeader className="bg-emerald-50/10 dark:bg-emerald-950/20 border-b border-dashed border-emerald-200 p-4 md:p-6 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl"><Construction size={18} /></div>
            <CardTitle className="text-lg md:text-xl font-black">{isAr ? 'العتاد الثقيل' : 'Engins & Parc'}</CardTitle>
          </div>
          <AssignResourceModal type="equipment" projectId={project.id} isAr={isAr} onSuccess={() => fetchResources(true)} excludeIds={assignedEquipment.map(ae => ae.equipment_id)} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden">
            {assignedEquipment.length === 0 ? <EmptyMobile isAr={isAr} /> : assignedEquipment.map((pe) => (
              <div key={pe.id} className="p-5 border-b flex flex-col gap-4 text-start">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600"><Truck size={22} /></div>
                    <div>
                      <p className="font-black text-sm">{pe.equipment?.name}</p>
                      <Badge variant="secondary" className="text-[8px] px-2 font-black mt-1">{pe.equipment?.type}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, id: pe.id, type: "equipment", name: pe.equipment?.name || "" })} className="text-slate-300"><Trash2 size={18} /></Button>
                </div>
                <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  <div className="flex-1 space-y-1 text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{isAr ? 'الاستعمال' : 'Usage'}</p><div className="flex items-center justify-center gap-1.5 font-black text-blue-600"><Clock size={12} />{pe.usage_hours_per_day}h</div></div>
                  <div className="flex-1 space-y-1 text-center border-s"><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{isAr ? 'منذ' : 'Dép'}</p><div className="flex items-center justify-center gap-1.5 font-bold text-slate-500 font-mono text-[10px] uppercase"><Calendar size={12} />{pe.assigned_at ? new Date(pe.assigned_at).toLocaleDateString(isAr ? 'ar' : 'fr', { day: 'numeric', month: 'short' }) : '-'}</div></div>
                </div>
              </div>
            ))}
          </div>
          {/* الديسكتوب يظل جدولاً منظماً */}
          <div className="hidden md:block">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/40 uppercase font-black text-[10px]">
                  <TableRow>
                    <TableHead className="ps-6">المعدة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الاستخدام اليومي</TableHead>
                    <TableHead>منذ تاريخ</TableHead>
                    <TableHead className="text-right pe-6">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedEquipment.map((pe) => (
                    <TableRow key={pe.id} className="group hover:bg-slate-50/30 transition-colors">
                      <TableCell className="ps-6 font-bold text-slate-900 dark:text-white">
                        {pe.equipment?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[9px] font-black">{pe.equipment?.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-black text-blue-600">
                        {pe.usage_hours_per_day}h/j
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-bold uppercase tracking-tight">
                        {pe.assigned_at ? new Date(pe.assigned_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR') : '-'}
                      </TableCell>
                      <TableCell className="text-right pe-6">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setDeleteConfirm({ isOpen: true, id: pe.id, type: "equipment", name: pe.equipment?.name || "" })}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── AlertDialog (المودال الاحترافي المشترك) ─── */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(val) => setDeleteConfirm(prev => ({ ...prev, isOpen: val }))}>
        <AlertDialogContent className="sm:max-w-[420px] rounded-[40px] p-0 overflow-hidden shadow-2xl border-none" dir={isAr ? "rtl" : "ltr"}>
          <div className="bg-red-50 p-8 flex flex-col items-center gap-4 text-center border-b">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center shadow-inner"><AlertTriangle className="text-red-600" size={32} /></div>
            <AlertDialogTitle className="text-xl font-black">{isAr ? "سحب المورد من المشروع؟" : "Annuler l'affectation ?"}</AlertDialogTitle>
            <p className="text-xs font-black text-red-600 opacity-60 uppercase">{deleteConfirm.name}</p>
          </div>
          <div className="p-8 pt-6">
            <div className="bg-slate-50 p-4 rounded-2xl flex gap-3 text-start mb-8"><Info size={16} className="text-blue-500 mt-1 shrink-0" /><p className="text-[11px] font-bold leading-relaxed opacity-70">{isAr ? "هذا الإجراء لا يمسح بيانات العامل أو المعدة من نظام الشركة، فقط يتم سحبه من المشروع الحالي وتوقيف حساب كلفته اليومية فيه." : "Cette action ne supprime pas les données, elle détache seulement la ressource du projet en cours."}</p></div>
            <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:gap-3">
              <AlertDialogCancel className="h-12 flex-1 rounded-2xl font-black border-slate-100 hover:bg-slate-50 transition-all">{isAr ? "لا، رجوع" : "Non"}</AlertDialogCancel>
              <Button variant="destructive" className="h-12 flex-1 rounded-2xl font-black shadow-lg shadow-red-200" disabled={isDeleting} onClick={handleConfirmDelete}>
                {isDeleting ? <Loader2 className="animate-spin" /> : (isAr ? "تأكيد السحب" : "Oui, retirer")}
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── المكونات المصغرة (Helper Components) ──

function StatCard({ label, value, unit, icon, color, className }: any) {
  const styles: any = {
    blue: "bg-blue-600 shadow-blue-100",
    emerald: "bg-emerald-500 shadow-emerald-100",
    orange: "bg-orange-500 shadow-orange-100"
  };
  return (
    <div className={`p-4 rounded-[28px] text-white flex items-center justify-between shadow-xl transition-all active:scale-[0.98] ${styles[color]} ${className}`}>
      <div className="text-start space-y-0.5">
        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider leading-none">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-2xl font-black tabular-nums">{value}</h3>
          {unit && <span className="text-[10px] font-bold opacity-60 uppercase">{unit}</span>}
        </div>
      </div>
      <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">{icon}</div>
    </div>
  );
}

function DetailBox({ label, value, highlight = false }: any) {
  return (
    <div className={`${highlight ? 'bg-emerald-50/50' : 'bg-slate-50 dark:bg-slate-900'} p-3 rounded-[18px] border dark:border-slate-800 text-center flex flex-col justify-center min-w-0`}>
      <span className={`text-[8px] font-black uppercase block mb-0.5 ${highlight ? 'text-emerald-500' : 'text-slate-400'}`}>{label}</span>
      <p className={`text-[11px] font-black truncate px-0.5 ${highlight ? 'text-emerald-700' : 'text-slate-700 dark:text-slate-300'}`}>{value}</p>
    </div>
  );
}

function EmptyMobile({ isAr }: { isAr: boolean }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center grayscale opacity-30"><Construction size={40} /><p className="text-[10px] font-black mt-2 tracking-widest uppercase">{isAr ? "القائمة فارغة" : "Liste Vide"}</p></div>
  );
}