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
  Info, ArrowRightLeft, UserMinus
} from "lucide-react";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import { Project, ProjectWorker, ProjectEquipment } from "@/lib/types/projects";
import { AssignResourceModal } from "./AssignResourceModal";
import { toast } from "sonner";

interface ResourcesTabProps {
  project: Project;
  isAr: boolean;
}

export function ResourcesTab({ project, isAr }: ResourcesTabProps) {
  const [assignedWorkers, setAssignedWorkers] = useState<ProjectWorker[]>([]);
  const [assignedEquipment, setAssignedEquipment] = useState<ProjectEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── إدارة حالة الحذف المخصص (Custom Deletion State) ───
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    type: "worker" | "equipment" | null;
    name: string;
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
      toast.error(isAr ? 'فشل في تحديث قائمة الموارد' : 'Échec de la mise à jour des ressources');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();

    // الاشتراك في التغييرات اللحظية (Real-time)
    const unsubWorkers = projectWorkersService.subscribe(project.id, () => fetchResources(true));
    const unsubEquipment = projectEquipmentService.subscribe(project.id, () => fetchResources(true));

    return () => {
      unsubWorkers();
      unsubEquipment();
    };
  }, [project.id]);

  // ─── تنفيذ عملية الحذف ───
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type) return;
    setIsDeleting(true);

    try {
      if (deleteConfirm.type === "worker") {
        await projectWorkersService.remove(deleteConfirm.id);
      } else {
        await projectEquipmentService.remove(deleteConfirm.id);
      }
      toast.success(isAr ? 'تم سحب المورد من المشروع بنجاح' : 'Ressource retirée avec succès');
      await fetchResources(true);
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ أثناء المحاولة، يرجى إعادة المحاولة' : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({ isOpen: false, id: "", type: null, name: "" });
    }
  };

  // ─── حسابات الملخص (Stats) ───
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
        <p className="font-medium animate-pulse">{isAr ? 'جاري تحضير قائمة الموارد...' : 'Préparation des ressources...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10" dir={isAr ? "rtl" : "ltr"}>

      {/* 1. قسم الإحصائيات العلوي (Stats Section) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label={isAr ? 'القوى العاملة' : 'Effectif'}
          value={stats.workerCount}
          unit={isAr ? 'عامل' : 'ouvrier(s)'}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          color="blue"
        />
        <StatCard
          label={isAr ? 'كلفة العمل اليومية' : 'Coût MO/Jour'}
          value={stats.workerDailyTotal.toLocaleString()}
          unit="DZD"
          icon={<Wallet className="w-6 h-6 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          label={isAr ? 'العتاد الثقيل' : 'Engins & Matériel'}
          value={stats.equipmentCount}
          unit={isAr ? 'قطعة' : 'unité(s)'}
          icon={<Truck className="w-6 h-6 text-orange-600" />}
          color="orange"
        />
      </div>

      {/* 2. قسم إدارة العمال (Workers Management) */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-start">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
                <HardHat className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">{isAr ? 'العمال المخصصون للورشة' : 'Personnel affecté'}</CardTitle>
                <CardDescription className="text-xs">{isAr ? 'توزيع المهام وساعات العمل اليومية' : 'Distribution des rôles et horaires'}</CardDescription>
              </div>
            </div>
            <AssignResourceModal
              type="worker" projectId={project.id} isAr={isAr} onSuccess={() => fetchResources(true)}
              excludeIds={assignedWorkers.map(aw => aw.worker_id)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table className="font-sans">
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="text-xs uppercase font-bold text-slate-500">
                <TableHead className="w-[300px] h-12">{isAr ? 'اسم العامل / التخصص' : 'Ouvrier / Métier'}</TableHead>
                <TableHead>{isAr ? 'الدور في المشروع' : 'Poste'}</TableHead>
                <TableHead>{isAr ? 'ساعات اليوم' : 'Quota'}</TableHead>
                <TableHead>{isAr ? 'الأجر اليومي' : 'Journalier'}</TableHead>
                <TableHead className="text-right h-12">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedWorkers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                    {isAr ? 'لا يوجد عمال مسجلون لهذا المشروع.' : 'Aucun ouvrier enregistré.'}
                  </TableCell>
                </TableRow>
              ) : (
                assignedWorkers.map((pw) => (
                  <TableRow key={pw.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3 text-start">
                        <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                          <AvatarImage src={pw.worker?.photo_url} />
                          <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">{pw.worker?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">{pw.worker?.full_name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{pw.worker?.job_title}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white dark:bg-slate-900 border-blue-200 text-blue-700 dark:border-blue-900/30 dark:text-blue-400 font-semibold px-2 py-0 h-6 text-[10.5px]">
                        {pw.assigned_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {pw.daily_hours}h
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                      {pw.worker?.daily_rate?.toLocaleString()} <span className="text-[9px] text-slate-400 ml-1 uppercase">dzd</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost" size="icon"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8"
                        onClick={() => setDeleteConfirm({ isOpen: true, id: pw.id, type: "worker", name: pw.worker?.full_name || "" })}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. قسم إدارة العتاد (Equipment Management) */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl mt-10">
        <CardHeader className="bg-slate-50/40 dark:bg-slate-900/60 border-b flex flex-row items-center justify-between py-6">
          <div className="flex items-center gap-3 text-start">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <Construction className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">{isAr ? 'قائمة الآلات والمعدات' : 'Équipements du chantier'}</CardTitle>
            </div>
          </div>
          <AssignResourceModal
            type="equipment" projectId={project.id} isAr={isAr} onSuccess={() => fetchResources(true)}
            excludeIds={assignedEquipment.map(ae => ae.equipment_id)}
          />
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/40">
              <TableRow className="text-xs uppercase text-slate-500 font-bold">
                <TableHead className="w-[300px] h-12">{isAr ? 'الآلة / المعدة' : 'Machine / Type'}</TableHead>
                <TableHead>{isAr ? 'نظام الاستخدام' : 'Usage / j'}</TableHead>
                <TableHead>{isAr ? 'تاريخ الدخول' : 'Depuis'}</TableHead>
                <TableHead className="text-right h-12">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedEquipment.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400 italic font-medium">{isAr ? 'لم يتم تخصيص عتاد حالياً.' : 'Aucun équipement disponible.'}</TableCell></TableRow>
              ) : (
                assignedEquipment.map((pe) => (
                  <TableRow key={pe.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3 text-start">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
                          <Truck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{pe.equipment?.name}</p>
                          <p className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 inline-block uppercase font-bold tracking-tight mt-1">{pe.equipment?.type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20 px-3 py-1 rounded-full w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        {pe.usage_hours_per_day}h/j
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                      {pe.assigned_at ? new Date(pe.assigned_at).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button
                        variant="ghost" size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full h-8 w-8"
                        onClick={() => setDeleteConfirm({ isOpen: true, id: pe.id, type: "equipment", name: pe.equipment?.name || "" })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── 4. AlertDialog (نظام الحذف والرسائل الاحترافي) ─── */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(isOpen) => setDeleteConfirm(prev => ({ ...prev, isOpen }))}
      >
        <AlertDialogContent className="sm:max-w-[440px] p-0 border-none overflow-hidden shadow-2xl" dir={isAr ? "rtl" : "ltr"}>
          {/* Danger Top Section */}
          <div className="bg-red-50 dark:bg-red-950/20 p-8 flex flex-col items-center gap-4 text-center border-b dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center animate-bounce shadow-inner">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-2xl font-black text-red-900 dark:text-red-200">
                {isAr ? "إلغاء التخصيص؟" : "Annuler l'affectation ?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm mt-1.5 font-bold text-red-700/70 dark:text-red-400/70 uppercase">
                {deleteConfirm.name}
              </AlertDialogDescription>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl flex gap-3 text-start border dark:border-slate-800">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {isAr
                  ? "تحذير: لن يتم حذف البيانات من سجلات الشركة، ولكن سيتم فك ارتباط العامل/المعدة بهذا المشروع فوراً. سيؤثر هذا على نظام الحضور واليوميات مستقبلاً."
                  : "Attention: Les données resteront dans la base, mais le lien avec ce chantier sera coupé. Cela affectera le pointage et les futurs rapports."}
              </p>
            </div>

            <AlertDialogFooter className="mt-8 flex gap-3 sm:justify-end w-full">
              <AlertDialogCancel className="h-12 border-slate-200 font-bold bg-white dark:bg-slate-950 flex-1 hover:bg-slate-100" disabled={isDeleting}>
                {isAr ? "لا، اتركها كما هي" : "Annuler"}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                className="h-12 font-black flex-1 shadow-lg shadow-red-200 dark:shadow-none"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <ArrowRightLeft className="w-5 h-5 ml-2 opacity-60" />
                )}
                {isAr ? "تأكيد فك الارتباط" : "Confirmer"}
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// ── المكونات المساعدة لزيادة جمالية الصفحة ──

function StatCard({ label, value, unit, icon, color }: { label: string, value: any, unit: string, icon: any, color: string }) {
  const styles: any = {
    blue: "border-blue-100 bg-blue-50/40 text-blue-600 dark:bg-blue-900/10 dark:border-blue-900/30",
    emerald: "border-emerald-100 bg-emerald-50/40 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-900/30",
    orange: "border-orange-100 bg-orange-50/40 text-orange-600 dark:bg-orange-900/10 dark:border-orange-900/30"
  };

  return (
    <Card className={`border-2 border-dashed ${styles[color]} rounded-3xl overflow-hidden transition-transform hover:scale-[1.02] duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-start">
            <p className="text-[10px] uppercase font-black opacity-60 tracking-wider mb-1">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</h3>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{unit}</span>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/50 p-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}