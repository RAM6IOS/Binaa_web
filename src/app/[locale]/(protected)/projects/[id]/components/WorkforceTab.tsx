"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  HardHat, UserMinus, Wallet, Users, Clock, Trash2, AlertTriangle, Loader2,
} from "lucide-react";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { Project, ProjectWorker } from "@/lib/types/projects";
import { AssignResourceModal } from "./AssignResourceModal";
import { PointageTab } from "./PointageTab";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkforceTabProps {
  project: Project;
  isAr: boolean;
}

export function WorkforceTab({ project, isAr }: WorkforceTabProps) {
  const [activeTab, setActiveTab] = useState("workers");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
        <TabsTrigger
          value="workers"
          className="flex-1 rounded-lg text-sm font-black gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md h-10"
        >
          <HardHat className="w-4 h-4" />
          {isAr ? "العمال" : "Ouvriers"}
        </TabsTrigger>
        <TabsTrigger
          value="attendance"
          className="flex-1 rounded-lg text-sm font-black gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md h-10"
        >
          <Clock className="w-4 h-4" />
          {isAr ? "تسجيل الحضور" : "Pointage"}
        </TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="workers" className="mt-0">
          <WorkersPanel project={project} isAr={isAr} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-0">
          <PointageTab project={project} isAr={isAr} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

/* ═══════════════════════════════════════════════════
   تبويب العمال — إدارة القوى العاملة
   ═══════════════════════════════════════════════════ */

function WorkersPanel({ project, isAr }: { project: Project; isAr: boolean }) {
  const [assignedWorkers, setAssignedWorkers] = useState<ProjectWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkers = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await projectWorkersService.fetchProjectWorkers(project.id);
      setAssignedWorkers(data || []);
    } catch {
      toast.error(isAr ? "فشل في تحديث البيانات" : "Erreur de mise à jour");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [project.id, isAr]);

  useEffect(() => {
    fetchWorkers();
    const unsub = projectWorkersService.subscribe(project.id, () => fetchWorkers(true));
    return unsub;
  }, [fetchWorkers]);

  useEffect(() => {
    if (!deleteTarget) {
      const t = setTimeout(() => { document.body.style.pointerEvents = "auto"; }, 100);
      return () => clearTimeout(t);
    }
  }, [deleteTarget]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await projectWorkersService.remove(deleteTarget.id);
      toast.success(isAr ? "تم السحب بنجاح ✓" : "Retiré ✓");
      setDeleteTarget(null);
      fetchWorkers(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const dailyTotal = useMemo(
    () => assignedWorkers.reduce((acc, pw) => acc + (pw.worker?.daily_rate || 0), 0),
    [assignedWorkers]
  );

  const getThumb = (url: string) => {
    if (!url || !url.includes("supabase.co")) return url;
    return `${url}?width=100&quality=80`;
  };

  if (isLoading && assignedWorkers.length === 0) {
    return (
      <div className="py-10 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500" dir={isAr ? "rtl" : "ltr"}>
      {/* ── إحصائيات ── */}
      <div className="grid grid-cols-2 gap-3">
        <MiniStat icon={<Users className="w-4 h-4" />} value={assignedWorkers.length} label={isAr ? "عمال" : "Ouv."} color="blue" />
        <MiniStat icon={<Wallet className="w-4 h-4" />} value={`${dailyTotal.toLocaleString()}`} label="DZD/j" color="emerald" />
      </div>

      {/* ── العمال ── */}
      <Card className="border-none md:border shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900 border-b p-4 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg">
              <HardHat size={16} />
            </div>
            <CardTitle className="text-base font-black">
              {isAr ? "إدارة القوى العاملة" : "Personnel"}
            </CardTitle>
          </div>
          <AssignResourceModal
            type="worker"
            projectId={project.id}
            isAr={isAr}
            onSuccess={() => fetchWorkers(true)}
            excludeIds={assignedWorkers.map((aw) => aw.worker_id)}
          />
        </CardHeader>

        <CardContent className="p-0">
          {/* موبايل */}
          <div className="md:hidden divide-y">
            {assignedWorkers.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <HardHat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">{isAr ? "لم يُعيَّن بعد" : "Aucun ouvrier"}</p>
              </div>
            )}
            {assignedWorkers.map((pw) => (
              <div key={pw.id} className="p-4 bg-white dark:bg-slate-950 flex flex-col gap-3 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                      {pw.worker?.photo_url && (
                        <AvatarImage src={getThumb(pw.worker.photo_url)} alt={pw.worker.full_name} />
                      )}
                      <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-bold">
                        {pw.worker?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-start">
                      <h4 className="font-bold text-sm truncate">{pw.worker?.full_name}</h4>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                        {pw.worker?.job_title}
                        {pw.worker?.deleted_at && (
                          <Badge variant="outline" className="text-[8px] ms-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0">
                            {isAr ? "معطل" : "Inactif"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget({ id: pw.id, name: pw.worker?.full_name || "" })}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <UserMinus size={18} />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <DetailBox label={isAr ? "الدور" : "Rôle"} value={pw.assigned_role} />
                  <DetailBox label={isAr ? "الساعات" : "Heures"} value={`${pw.daily_hours}h`} />
                  <DetailBox label={isAr ? "اليومية" : "Taux"} value={pw.worker?.daily_rate?.toLocaleString()} highlight />
                </div>
              </div>
            ))}
          </div>

          {/* ديسكتوب */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 uppercase font-black text-[10px]">
                <TableRow>
                  <TableHead className="ps-6">العامل</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الساعات</TableHead>
                  <TableHead>الأجر</TableHead>
                  <TableHead className="text-right pe-6">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-sm font-bold">
                      {isAr ? "لم يُعيَّن عمال بعد" : "Aucun ouvrier assigné"}
                    </TableCell>
                  </TableRow>
                )}
                {assignedWorkers.map((pw) => (
                  <TableRow key={pw.id} className="group h-16 transition-colors">
                    <TableCell className="ps-6 text-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-1 ring-slate-100 shrink-0">
                          {pw.worker?.photo_url && (
                            <AvatarImage src={getThumb(pw.worker.photo_url)} alt={pw.worker.full_name} />
                          )}
                          <AvatarFallback className="bg-slate-50 text-slate-400 text-xs font-bold">
                            {pw.worker?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm leading-none mb-1">
                            {pw.worker?.full_name}
                            {pw.worker?.deleted_at && (
                              <Badge variant="outline" className="text-[8px] ms-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0 align-middle">
                                {isAr ? "معطل" : "Inactif"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{pw.worker?.job_title}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-blue-100 bg-blue-50/30 text-blue-700 font-bold px-3 text-[10px] uppercase">
                        {pw.assigned_role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-black">{pw.daily_hours}h</TableCell>
                    <TableCell className="font-black text-slate-800">
                      {pw.worker?.daily_rate?.toLocaleString()} <span className="text-[9px] opacity-40">DZD</span>
                    </TableCell>
                    <TableCell className="text-right pe-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ id: pw.id, name: pw.worker?.full_name || "" })}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 transition-all rounded-full h-9 w-9"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── مودال الحذف ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-[420px] rounded-[32px] p-0 overflow-hidden shadow-2xl border-none" dir={isAr ? "rtl" : "ltr"}>
          <div className="bg-red-50 p-8 flex flex-col items-center gap-4 text-center border-b">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-bounce shadow-inner border border-white">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <AlertDialogTitle className="text-xl font-black">
              {isAr ? "هل تود فك الارتباط؟" : "Retirer cet ouvrier ?"}
            </AlertDialogTitle>
            <p className="text-xs font-black text-red-600/50 uppercase bg-white/50 px-3 py-1 rounded-full border border-red-50">
              {deleteTarget?.name}
            </p>
          </div>
          <div className="p-8 pt-6 space-y-6">
            <p className="text-xs font-bold leading-relaxed text-slate-600 text-center opacity-80">
              {isAr
                ? "سيتم سحب العامل من سجلات المشروع الحالية."
                : "Retire l'ouvrier de ce projet uniquement."}
            </p>
            <AlertDialogFooter className="flex-row gap-3">
              <AlertDialogCancel className="h-12 flex-1 rounded-2xl font-black border-slate-100">
                {isAr ? "إلغاء" : "Annuler"}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                className="h-12 flex-1 rounded-2xl font-black shadow-lg shadow-red-200"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? <Loader2 className="animate-spin" /> : isAr ? "تأكيد" : "Confirmer"}
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   مكوّنات مساعدة
   ═══════════════════════════════════════════════════ */

function MiniStat({ icon, value, label, color }: {
  icon: React.ReactNode; value: string | number; label: string; color: string;
}) {
  const styles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return (
    <div className={`rounded-2xl border p-3 flex items-center gap-2.5 ${styles[color]}`}>
      <div className="opacity-60">{icon}</div>
      <div>
        <p className="text-lg font-black tabular-nums leading-none">{value}</p>
        <p className="text-[9px] font-bold uppercase opacity-50 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function DetailBox({ label, value, highlight = false }: {
  label: string; value: string | number | undefined; highlight?: boolean;
}) {
  return (
    <div className={`${highlight ? "bg-emerald-50/50" : "bg-slate-50/50 dark:bg-slate-900"} p-2 rounded-[18px] border dark:border-slate-800 text-center flex flex-col justify-center`}>
      <span className={`text-[8px] font-black uppercase block mb-0.5 ${highlight ? "text-emerald-500" : "text-slate-400"}`}>{label}</span>
      <p className={`text-[10px] font-black truncate px-0.5 ${highlight ? "text-emerald-700" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}
