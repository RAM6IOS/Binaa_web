"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Clock, AlertCircle, Trash2 } from "lucide-react";
import { GanttTaskExtended } from "./GanttChart";
import { Worker } from "@/lib/types/projects";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";

export const PRESET_COLORS = [
    { value: "", label: "تلقائي", class: "bg-slate-300 dark:bg-slate-700" },
    { value: "blue", label: "أزرق", class: "bg-blue-500" },
    { value: "green", label: "أخضر", class: "bg-emerald-500" },
    { value: "amber", label: "برتقالي", class: "bg-amber-500" },
    { value: "purple", label: "بنفسجي", class: "bg-purple-500" },
    { value: "rose", label: "وردي", class: "bg-rose-500" },
    { value: "slate", label: "رمادي", class: "bg-slate-500" }
];

interface GanttTaskDialogProps {
    isAr: boolean;
    isDialogOpen: boolean;
    setIsDialogOpen: (open: boolean) => void;
    activeTask: Partial<GanttTaskExtended> | null;
    setActiveTask: (task: Partial<GanttTaskExtended> | null | ((prev: Partial<GanttTaskExtended> | null) => Partial<GanttTaskExtended> | null)) => void;
    isSaving: boolean;
    workers: Worker[];
    tasks: GanttTaskExtended[];
    handleSaveTask: (e: React.FormEvent) => Promise<void>;
    handleDeleteTask: () => void;
    isDeleteModalOpen: boolean;
    setIsDeleteModalOpen: (open: boolean) => void;
    handleConfirmDelete: () => Promise<void>;
    getStatusArabic: (status: string) => string;
}

export function GanttTaskDialog({
    isAr,
    isDialogOpen,
    setIsDialogOpen,
    activeTask,
    setActiveTask,
    isSaving,
    workers,
    tasks,
    handleSaveTask,
    handleDeleteTask,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    handleConfirmDelete,
    getStatusArabic,
}: GanttTaskDialogProps) {
    return (
        <>
            <DeleteConfirmationDialog
                isOpen={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                onConfirm={handleConfirmDelete}
                isLoading={isSaving}
                isAr={isAr}
                title={isAr ? "حذف المهمة من الجدول" : "Supprimer la tâche"}
                description={isAr
                    ? `هل أنت متأكد من حذف المهمة "${activeTask?.title}"؟ هذا الإجراء سيمسح المهمة وتبعاتها من المخطط الزمني.`
                    : `Êtes-vous sûr de vouloir supprimer "${activeTask?.title}" ? Cette action est irréversible.`}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent
                    className={`sm:max-w-[650px] max-h-[95vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl ${isAr ? "rtl font-sans" : "ltr"
                        }`}
                >
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                {activeTask?.id
                                    ? isAr
                                        ? "تعديل بيانات المهمة"
                                        : "Modifier la tâche"
                                    : isAr
                                        ? "إضافة مهمة جديدة للمشروع"
                                        : "Ajouter une tâche"}
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSaveTask} className="p-6 space-y-6 bg-white dark:bg-slate-950">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Title */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-500" />
                                    {isAr ? "عنوان المهمة" : "Titre"}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    required
                                    placeholder={isAr ? "أدخل عنوان المهمة..." : "Titre..."}
                                    value={activeTask?.title || ""}
                                    onChange={(e) => setActiveTask({ ...activeTask, title: e.target.value })}
                                    className="h-11 focus-visible:ring-blue-500 bg-white dark:bg-slate-900 border-slate-200"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label htmlFor="description" className="text-sm font-semibold">
                                    {isAr ? "وصف المهمة" : "Description"}
                                </Label>
                                <Textarea
                                    id="description"
                                    rows={3}
                                    placeholder={isAr ? "أدخل تفاصيل المهمة ووصفها..." : "Détails..."}
                                    value={activeTask?.description || ""}
                                    onChange={(e) =>
                                        setActiveTask({ ...activeTask, description: e.target.value })
                                    }
                                    className="resize-none focus-visible:ring-blue-500 bg-white dark:bg-slate-900 border-slate-200"
                                />
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <Label htmlFor="priority" className="text-sm font-semibold">
                                    {isAr ? "الأولوية" : "Priorité"}
                                </Label>
                                <Select
                                    value={activeTask?.priority || "medium"}
                                    onValueChange={(v) => setActiveTask({ ...activeTask, priority: v })}
                                >
                                    <SelectTrigger id="priority" className="h-11 bg-white dark:bg-slate-900">
                                        <SelectValue placeholder={isAr ? "اختر الأولوية" : "Choisir"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{isAr ? "منخفضة" : "Basse"}</SelectItem>
                                        <SelectItem value="medium">{isAr ? "متوسطة" : "Moyenne"}</SelectItem>
                                        <SelectItem value="high">{isAr ? "عالية" : "Haute"}</SelectItem>
                                        <SelectItem value="urgent">{isAr ? "عاجلة" : "Urgent"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-sm font-semibold">
                                    {isAr ? "الحالة" : "Statut"}
                                </Label>
                                <Select
                                    value={activeTask?.status || "todo"}
                                    onValueChange={(v) => {
                                        let prog = activeTask?.progress || 0;
                                        if (v === "done") prog = 100;
                                        if (v === "todo") prog = 0;
                                        setActiveTask({ ...activeTask, status: v, progress: prog });
                                    }}
                                >
                                    <SelectTrigger id="status" className="h-11 bg-white dark:bg-slate-900">
                                        <SelectValue placeholder={isAr ? "اختر الحالة" : "Choisir"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todo">{isAr ? "للقيام بها" : "À faire"}</SelectItem>
                                        <SelectItem value="in_progress">{isAr ? "قيد الإنجاز" : "En cours"}</SelectItem>
                                        <SelectItem value="done">{isAr ? "مكتملة" : "Terminée"}</SelectItem>
                                        <SelectItem value="delayed">{isAr ? "متأخرة" : "En retard"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Dates */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="start_date"
                                    className="text-sm font-semibold flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {isAr ? "تاريخ البدء" : "Date de début"}
                                </Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    disabled={!!activeTask?.is_milestone}
                                    value={activeTask?.start_date || ""}
                                    onChange={(e) =>
                                        setActiveTask({ ...activeTask, start_date: e.target.value })
                                    }
                                    className="h-11 bg-white dark:bg-slate-900 border-slate-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="due_date"
                                    className="text-sm font-semibold flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                    {activeTask?.is_milestone
                                        ? isAr
                                            ? "تاريخ المعلم الرئيسي"
                                            : "Date du jalon"
                                        : isAr
                                            ? "تاريخ الاستحقاق"
                                            : "Date d'échéance"}
                                </Label>
                                <Input
                                    id="due_date"
                                    type="date"
                                    required
                                    value={activeTask?.due_date || ""}
                                    onChange={(e) => {
                                        const dueD = e.target.value;
                                        const startD = activeTask?.is_milestone
                                            ? dueD
                                            : activeTask?.start_date || dueD;
                                        setActiveTask({
                                            ...activeTask,
                                            due_date: dueD,
                                            start_date: startD
                                        });
                                    }}
                                    className="h-11 bg-white dark:bg-slate-900 border-slate-200"
                                />
                            </div>

                            {/* Progress */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="progress" className="text-sm font-semibold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-500" />
                                        {isAr ? "نسبة الإنجاز" : "Progrès"}
                                    </Label>
                                    <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                                        {activeTask?.progress || 0}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        id="progress"
                                        type="range"
                                        min="0"
                                        max="100"
                                        disabled={!!activeTask?.is_milestone}
                                        value={activeTask?.progress || 0}
                                        onChange={(e) => {
                                            const prog = Number(e.target.value);
                                            let stat = activeTask?.status || "todo";
                                            if (prog === 100) stat = "done";
                                            if (prog === 0 && stat === "done") stat = "todo";
                                            setActiveTask({ ...activeTask, progress: prog, status: stat });
                                        }}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>

                            {/* Assignee */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label htmlFor="assigned_to" className="text-sm font-semibold flex items-center gap-2">
                                    <User className="w-4 h-4 text-emerald-500" />
                                    {isAr ? "تعيين عامل (المسؤول)" : "Assigner à"}
                                </Label>
                                <Select
                                    value={activeTask?.assigned_to || "unassigned"}
                                    onValueChange={(v) => setActiveTask({ ...activeTask, assigned_to: v })}
                                >
                                    <SelectTrigger id="assigned_to" className="h-11 bg-white dark:bg-slate-900">
                                        <SelectValue placeholder={isAr ? "غير معين" : "Choisir"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">{isAr ? "غير معين" : "Non assigné"}</SelectItem>
                                        {workers.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.full_name} ({w.job_title})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Bar Color picker */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label className="text-sm font-semibold">
                                    {isAr ? "تخصيص لون شريط المهمة" : "Couleur personnalisée"}
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setActiveTask({ ...activeTask, color: c.value })}
                                            className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${c.class
                                                } ${activeTask?.color === c.value
                                                    ? "border-blue-600 dark:border-white scale-110 shadow-lg"
                                                    : "border-transparent hover:scale-105"
                                                }`}
                                            title={c.label}
                                        >
                                            {activeTask?.color === c.value && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <DialogFooter className="mt-8 flex flex-row gap-3 sm:justify-between w-full">
                            <div>
                                {activeTask?.id && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleDeleteTask}
                                        disabled={isSaving}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 gap-1.5 text-xs font-bold"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {isAr ? "حذف المهمة" : "Supprimer"}
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-row gap-3 sm:justify-end flex-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    disabled={isSaving}
                                    className="text-xs font-bold"
                                >
                                    {isAr ? "إلغاء" : "Annuler"}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] font-bold text-xs"
                                >
                                    {isSaving && (
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    )}
                                    {isAr ? "حفظ التغييرات" : "Enregistrer"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
