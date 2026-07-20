"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Project, ProjectTask, TaskStatus, Worker } from "@/lib/types/projects";
import { tasksService } from "@/lib/services/tasks-service";
import { workersService } from "@/lib/services/workers-service";
import { Loader2, LayoutGrid, List, Calendar, User, Clock, CheckCircle2, Edit2, GripVertical, Plus } from "lucide-react";
import { AddTaskDialog } from './AddTaskDialog';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { ProgressBar } from "@/components/projects/ProgressBar";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

// --- المكونات المساعدة ---

function TaskStatusBadge({ status, isAr }: { status: TaskStatus, isAr: boolean }) {
  const configs: Record<TaskStatus, { labelAr: string, labelFr: string, className: string }> = {
    todo: { labelAr: 'للقيام بها', labelFr: 'À faire', className: 'bg-slate-100 text-slate-700' },
    in_progress: { labelAr: 'قيد الإنجاز', labelFr: 'En cours', className: 'bg-blue-100 text-blue-700' },
    done: { labelAr: 'مكتملة', labelFr: 'Terminée', className: 'bg-emerald-100 text-emerald-700' },
    delayed: { labelAr: 'متأخرة', labelFr: 'En retard', className: 'bg-red-100 text-red-700' },
  };
  const config = configs[status];
  return <Badge variant="secondary" className={`font-bold text-[10px] ${config.className}`}>{isAr ? config.labelAr : config.labelFr}</Badge>;
}

function KanbanColumn({ id, title, count, children }: { id: string, title: string, count: number, children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="flex-1 min-w-[300px] bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-4 flex flex-col border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest">{title}</h3>
        <Badge variant="outline" className="bg-white dark:bg-slate-800 font-black">{count}</Badge>
      </div>
      <div className="flex-1 flex flex-col gap-3 min-h-[400px]">{children}</div>
    </div>
  );
}

function SortableTaskCard({ task, isAr, workers, projectId, onRefresh }: { task: ProjectTask, isAr: boolean, workers: Worker[], projectId: string, onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const assignedWorker = workers.find(w => w.id === task.assigned_to);

  return (
    <div ref={setNodeRef} style={style} className={`bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-blue-400 group ${isDragging ? 'z-50 shadow-2xl scale-105' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-blue-500 transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold leading-tight truncate max-w-[180px]">{task.title}</h4>
        </div>
        <AddTaskDialog isAr={isAr} projectId={projectId} onSuccess={onRefresh} task={task} trigger={
          <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg" aria-label="Edit task"><Edit2 className="w-3 h-3" /></button>
        } />
      </div>
      <div className="space-y-3 pl-7">
        <div className="flex flex-wrap gap-2">
          <TaskPriorityBadge priority={task.priority} isAr={isAr} />
          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 rounded flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{task.estimated_hours}h</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full ${task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${task.progress}%` }} />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 border-t pt-2 mt-2">
          <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-blue-500" />{assignedWorker?.full_name || (isAr ? 'غير معين' : 'Non assigné')}</span>
          <span className="font-mono">{task.due_date}</span>
        </div>
      </div>
    </div>
  );
}

// --- المكون الرئيسي ---

export function TaskBoardTab({ project, isAr }: { project: Project, isAr: boolean }) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null);

  const columns: { id: TaskStatus; title_ar: string; title_fr: string }[] = [
    { id: 'todo', title_ar: 'المهام الجديدة', title_fr: 'À faire' },
    { id: 'in_progress', title_ar: 'قيد الإنجاز', title_fr: 'En cours' },
    { id: 'done', title_ar: 'مكتملة', title_fr: 'Terminées' },
    { id: 'delayed', title_ar: 'متأخرة', title_fr: 'En retard' },
  ];

  // دالة جلب البيانات الصافية من قاعدة البيانات
  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [workersData, tasksData] = await Promise.all([
        workersService.getAll(),
        tasksService.getByProjectId(project.id)
      ]);
      setWorkers(workersData);
      // الترتيب حسب الـ Index المحفوظ لضمان بقاء الترتيب عند السحب
      setTasks(tasksData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (e) { console.error("Sync Error", e); }
    finally { setIsLoading(false); }
  }, [project.id]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) refreshData();

    // الاشتراك اللحظي لمنع ضياع البيانات عند التحديث من جهاز آخر
    const unsubscribe = tasksService.subscribe(project.id, () => {
      refreshData(true);
    });

    return () => { isMounted = false; unsubscribe(); };
  }, [refreshData, project.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) { setActiveTask(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;

    const taskToMove = tasks.find(t => t.id === activeId);
    if (!taskToMove) return;

    // فحص ما إذا كان الهدف "عمود" أو "مهمة أخرى"
    const isOverAColumn = columns.some(c => c.id === overId);
    let newStatus = taskToMove.status;

    if (isOverAColumn) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    // --- تحديث الواجهة فوراً (Optimistic UI) ---
    const prevTasks = [...tasks];
    const newTasks = [...tasks];
    const activeIndex = newTasks.findIndex(t => t.id === activeId);
    const overIndex = newTasks.findIndex(t => t.id === overId);

    // تحديث الحالة والتقدم آلياً
    newTasks[activeIndex] = {
      ...taskToMove,
      status: newStatus,
      progress: newStatus === 'done' ? 100 : (newStatus === 'todo' ? 0 : taskToMove.progress)
    };

    setTasks(arrayMove(newTasks, activeIndex, overIndex !== -1 ? overIndex : activeIndex));

    // --- تحديث قاعدة البيانات في الخلفية ---
    try {
      if (newStatus !== taskToMove.status) {
        await tasksService.updateStatus(activeId, newStatus);
      }
      // ملاحظة: لترتيب كامل يفضل تحديث order_index لكل المهام هنا مستقبلاً
    } catch (err) {
      toast.error(isAr ? 'فشل التحديث، جاري إعادة المزامنة...' : 'Error, syncing...');
      refreshData(true);
    } finally {
      setActiveTask(null);
    }
  };

  if (isLoading && tasks.length === 0) {
    return <div className="flex h-64 items-center justify-center gap-2"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="text-slate-400 font-bold">{isAr ? "جاري تحميل اللوحة..." : "Chargement..."}</span></div>;
  }

  return (
    <Card className="animate-in fade-in duration-500 border-none shadow-none bg-transparent overflow-hidden">
      <CardHeader className="px-0 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8">
        <div>
          <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl"><CheckCircle2 className="w-6 h-6 text-white" /></div>
            {isAr ? 'إدارة مهام المشروع' : 'Workboard'}
          </CardTitle>
          <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-70">
            {isAr ? 'تخطيط العمليات والمراحل الزمنية' : 'Process Planning & Flow'}
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border dark:bg-slate-900 p-1 rounded-xl shadow-sm">
            <button onClick={() => setView('kanban')} className={`p-2 rounded-lg transition-all ${view === 'kanban' ? 'bg-slate-100 text-blue-600' : 'text-slate-400'}`} aria-label="Kanban view"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-slate-100 text-blue-600' : 'text-slate-400'}`} aria-label="List view"><List className="w-4 h-4" /></button>
          </div>
          <AddTaskDialog isAr={isAr} projectId={project.id} onSuccess={() => refreshData(true)} />
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {view === 'kanban' ? (
          <div className="flex flex-col lg:flex-row gap-5 min-h-[600px] overflow-x-auto pb-6 custom-scrollbar">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveTask(tasks.find(t => t.id === e.active.id) || null)} onDragEnd={handleDragEnd}>
              {columns.map(col => {
                const columnTasks = tasks.filter(t => t.status === col.id);
                return (
                  <KanbanColumn key={col.id} id={col.id} title={isAr ? col.title_ar : col.title_fr} count={columnTasks.length}>
                    <SortableContext id={col.id} items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {columnTasks.map(task => (
                        <SortableTaskCard key={task.id} task={task} isAr={isAr} workers={workers} projectId={project.id} onRefresh={() => refreshData(true)} />
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center opacity-30">
                          <Plus className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">{isAr ? "فارغ" : "Empty"}</span>
                        </div>
                      )}
                    </SortableContext>
                  </KanbanColumn>
                );
              })}
              <DragOverlay>
                {activeTask ? (
                  <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-blue-500 scale-105 -rotate-2 w-[280px]">
                    <h4 className="text-xs font-black truncate">{activeTask.title}</h4>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-3"><div className="bg-blue-600 h-full" style={{ width: `${activeTask.progress}%` }} /></div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          /* List View Implementation (يمكنك إضافة جدول الـ Shadcn هنا) */
          <div className="py-20 text-center border-2 border-dashed rounded-3xl text-slate-300">
            {isAr ? "عرض القائمة قيد التحميل..." : "List view is ready for data."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}