"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Clock, Trash2, AlertTriangle, Loader2, Construction } from "lucide-react";
import { projectEquipmentService } from "@/lib/services/project-equipment-service";
import { Project, ProjectEquipment } from "@/lib/types/projects";
import { AssignResourceModal } from "./AssignResourceModal";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface EquipmentTabProps {
  project: Project;
  isAr: boolean;
}

export function EquipmentTab({ project, isAr }: EquipmentTabProps) {
  const [assignedEquipment, setAssignedEquipment] = useState<ProjectEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEquipment = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await projectEquipmentService.fetchProjectEquipment(project.id);
      setAssignedEquipment(data || []);
    } catch {
      toast.error(isAr ? "فشل في تحديث البيانات" : "Erreur de mise à jour");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [project.id, isAr]);

  useEffect(() => {
    fetchEquipment();
    const unsub = projectEquipmentService.subscribe(project.id, () => fetchEquipment(true));
    return unsub;
  }, [fetchEquipment]);

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
      await projectEquipmentService.remove(deleteTarget.id);
      toast.success(isAr ? "تم السحب بنجاح ✓" : "Retiré ✓");
      setDeleteTarget(null);
      fetchEquipment(true);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && assignedEquipment.length === 0) {
    return (
      <div className="py-10 grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500" dir={isAr ? "rtl" : "ltr"}>
      <Card className="border-none md:border shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-emerald-50/10 border-b border-dashed border-emerald-200 p-4 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-inner">
              <Construction size={16} />
            </div>
            <CardTitle className="text-base font-black">
              {isAr ? "المعدات" : "Équipements"}
            </CardTitle>
          </div>
          <AssignResourceModal
            type="equipment"
            projectId={project.id}
            isAr={isAr}
            onSuccess={() => fetchEquipment(true)}
            excludeIds={assignedEquipment.map((ae) => ae.equipment_id)}
          />
        </CardHeader>

        <CardContent className="p-0">
          {/* موبايل */}
          <div className="md:hidden">
            {assignedEquipment.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">{isAr ? "لا يوجد عتاد" : "Aucun engin"}</p>
              </div>
            )}
            {assignedEquipment.map((pe) => (
              <div key={pe.id} className="p-4 border-b flex items-center justify-between bg-white text-start">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm truncate">
                      {pe.equipment?.name}
                      {pe.equipment?.deleted_at && (
                        <Badge variant="outline" className="text-[8px] ms-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0">
                          {isAr ? "معطل" : "Inactif"}
                        </Badge>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={11} className="text-blue-500" />
                      <span className="text-[10px] font-black">{pe.usage_hours_per_day}h/j</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget({ id: pe.id, name: pe.equipment?.name || "" })}
                  className="text-slate-300 rounded-full h-11 w-11"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
          </div>

          {/* ديسكتوب */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 uppercase font-black text-[10px]">
                <TableRow>
                  <TableHead className="ps-6">الآلة</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الاستعمال</TableHead>
                  <TableHead className="text-right pe-6">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedEquipment.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400 text-sm font-bold">
                      {isAr ? "لا يوجد عتاد" : "Aucun engin"}
                    </TableCell>
                  </TableRow>
                )}
                {assignedEquipment.map((pe) => (
                  <TableRow key={pe.id} className="group h-16">
                    <TableCell className="ps-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-50 text-orange-600"><Truck size={16} /></div>
                        <div className="font-bold text-sm">
                          {pe.equipment?.name}
                          {pe.equipment?.deleted_at && (
                            <Badge variant="outline" className="text-[8px] ms-1 border-amber-200 bg-amber-50 text-amber-700 font-black px-1.5 py-0">
                              {isAr ? "معطل" : "Inactif"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[9px] font-black">{pe.equipment?.type}</Badge></TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 bg-blue-50/30 px-3 py-1 rounded-full w-fit">{pe.usage_hours_per_day}h/j</TableCell>
                    <TableCell className="text-right pe-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ id: pe.id, name: pe.equipment?.name || "" })}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 rounded-full h-8 w-8"
                      >
                        <Trash2 size={14} />
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
              {isAr ? "هل تود فك الارتباط؟" : "Retirer cet engin ?"}
            </AlertDialogTitle>
            <p className="text-xs font-black text-red-600/50 uppercase bg-white/50 px-3 py-1 rounded-full border border-red-50">
              {deleteTarget?.name}
            </p>
          </div>
          <div className="p-8 pt-6 space-y-6">
            <p className="text-xs font-bold leading-relaxed text-slate-600 text-center opacity-80">
              {isAr
                ? "سيتم سحب العتاد من سجلات المشروع الحالية."
                : "Retire l'équipement de ce projet uniquement."}
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
