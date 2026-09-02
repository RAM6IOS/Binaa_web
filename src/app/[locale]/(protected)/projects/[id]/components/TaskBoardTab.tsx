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
import { Loader2, LayoutGrid, List, Calendar, User, Clock, CheckCircle2, Edit2, GripVertical, Plus, Filter } from "lucide-react";
import { AddTaskDialog } from './AddTaskDialog';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { ProgressBar } from "@/components/projects/ProgressBar";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

// --- المكونات المساعدة ---

function KanbanColumn({ id, title, count, children }: { id: string, title: string, count: number, children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="flex-1 min-w-0 md:min-w-72 bg-muted/50 dark:bg-secondary/50 rounded-lg p-4 flex flex-col border border-border">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-widest">{title}</h3>
        <Badge variant="outline" className="bg-card dark:bg-secondary font-bold">{count}</Badge>
      </div>
      <div className="flex-1 flex flex-col gap-3 min-h-50 md:min-h-100">{children}</div>
    </div>
  );
}

function SortableTaskCard({ task, isAr, workers, projectId, onRefresh }: { task: ProjectTask, isAr: boolean, workers: Worker[], projectId: string, onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const assignedWorker = workers.find(w => w.id === task.assigned_to);

  return (
    <div ref={setNodeRef} style={style} className={`bg-card p-4 rounded-lg shadow-sm border border-border transition-all hover:border-primary group ${isDragging ? 'z-50 shadow-sm scale-105' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold leading-tight truncate">{task.title}</h4>
        </div>
        <AddTaskDialog isAr={isAr} projectId={projectId} onSuccess={onRefresh} task={task} trigger={
          <button className="p-2.5 md:p-1.5 text-muted-foreground hover:text-primary bg-muted dark:bg-secondary rounded-lg active:scale-95 transition-all shrink-0" aria-label="Edit task"><Edit2 className="w-4 h-4 md:w-3 md:h-3" /></button>
        } />
      </div>
      <div className="space-y-3 pl-7">
        <div className="flex flex-wrap gap-2">
          <TaskPriorityBadge priority={task.priority} isAr={isAr} />
          <span className="text-xs text-muted-foreground font-bold bg-muted px-2 rounded flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{task.estimated_hours}h</span>
        </div>
        <div className="w-full bg-muted dark:bg-secondary rounded-full h-1.5 overflow-hidden">
          <div className={`h-full ${task.progress === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${task.progress}%` }} />
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2 mt-2">
          <span className="flex items-center gap-1.5 truncate"><User className="w-3 h-3 text-primary shrink-0" />{assignedWorker?.full_name || (isAr ? 'غير معين' : 'Non assigné')}</span>
          <span className="font-mono shrink-0">{task.due_date}</span>
        </div>
      </div>
    </div>
  );
}

// ── بطاقة مهمة للعرض القائمي (Mobile) ──

function MobileTaskCard({ task, isAr, workers, projectId, onRefresh }: { task: ProjectTask, isAr: boolean, workers: Worker[], projectId: string, onRefresh: () => void }) {
  const assignedWorker = workers.find(w => w.id === task.assigned_to);

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border active:bg-muted dark:active:bg-secondary transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <h4 className="text-sm font-bold leading-tight truncate">{task.title}</h4>
        </div>
        <AddTaskDialog isAr={isAr} projectId={projectId} onSuccess={onRefresh} task={task} trigger={
          <button className="p-2.5 text-muted-foreground hover:text-primary bg-muted dark:bg-secondary rounded-lg active:scale-95 transition-all shrink-0" aria-label="Edit task"><Edit2 className="w-4 h-4" /></button>
        } />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <TaskStatusBadge status={task.status} isAr={isAr} />
        <TaskPriorityBadge priority={task.priority} isAr={isAr} />
        <span className="text-xs text-muted-foreground font-bold bg-muted px-2 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />{task.estimated_hours}h
        </span>
      </div>
      <div className="w-full bg-muted dark:bg-secondary rounded-full h-1.5 overflow-hidden mb-2">
        <div className={`h-full ${task.progress === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${task.progress}%` }} />
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 truncate"><User className="w-3 h-3 text-primary shrink-0" />{assignedWorker?.full_name || (isAr ? 'غير معين' : 'Non assigné')}</span>
        <span className="font-mono shrink-0">{task.due_date}</span>
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
  const [mobileFilter, setMobileFilter] = useState<TaskStatus | 'all'>('all');

  const columns: { id: TaskStatus; title_ar: string; title_fr: string }[] = [
    { id: 'todo', title_ar: 'المهام الجديدة', title_fr: 'À faire' },
    { id: 'in_progress', title_ar: 'قيد الإنجاز', title_fr: 'En cours' },
    { id: 'done', title_ar: 'مكتملة', title_fr: 'Terminées' },
    { id: 'delayed', title_ar: 'متأخرة', title_fr: 'En retard' },
  ];

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [workersData, tasksData] = await Promise.all([
        workersService.getAll(),
        tasksService.getByProjectId(project.id)
      ]);
      setWorkers(workersData);
      setTasks(tasksData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (e) { console.error("Sync Error", e); }
    finally { setIsLoading(false); }
  }, [project.id]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) refreshData();

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

    const isOverAColumn = columns.some(c => c.id === overId);
    let newStatus = taskToMove.status;

    if (isOverAColumn) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    const newTasks = [...tasks];
    const activeIndex = newTasks.findIndex(t => t.id === activeId);
    const overIndex = newTasks.findIndex(t => t.id === overId);

    newTasks[activeIndex] = {
      ...taskToMove,
      status: newStatus,
      progress: newStatus === 'done' ? 100 : (newStatus === 'todo' ? 0 : taskToMove.progress)
    };

    setTasks(arrayMove(newTasks, activeIndex, overIndex !== -1 ? overIndex : activeIndex));

    try {
      if (newStatus !== taskToMove.status) {
        await tasksService.updateStatus(activeId, newStatus);
      }
    } catch (err) {
      toast.error(isAr ? 'فشل التحديث، جاري إعادة المزامنة...' : 'Error, syncing...');
      refreshData(true);
    } finally {
      setActiveTask(null);
    }
  };

  const filteredTasks = mobileFilter === 'all' ? tasks : tasks.filter(t => t.status === mobileFilter);
  const taskCounts = columns.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id).length;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading && tasks.length === 0) {
    return <div className="flex h-64 items-center justify-center gap-2"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="text-muted-foreground font-bold">{isAr ? "جاري تحميل اللوحة..." : "Chargement..."}</span></div>;
  }

  return (
    <Card className="animate-in fade-in duration-300 md:duration-500 border-none shadow-none bg-transparent overflow-hidden">
      <CardHeader className="px-0 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 pb-6 md:pb-8">
        <div>
          <CardTitle className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg"><CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" /></div>
            {isAr ? 'إدارة مهام المشروع' : 'Workboard'}
          </CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1 opacity-70">
            {isAr ? 'تخطيط العمليات والمراحل الزمنية' : 'Process Planning & Flow'}
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          {/* زر التبديل بين العرضين — سطح المكتب فقط */}
          <div className="hidden md:flex bg-background border dark:bg-secondary p-1 rounded-lg shadow-sm">
            <button onClick={() => setView('kanban')} className={`p-2 rounded-lg transition-all ${view === 'kanban' ? 'bg-muted text-primary' : 'text-muted-foreground'}`} aria-label="Kanban view"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-muted text-primary' : 'text-muted-foreground'}`} aria-label="List view"><List className="w-4 h-4" /></button>
          </div>
          <AddTaskDialog isAr={isAr} projectId={project.id} onSuccess={() => refreshData(true)} />
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {/* ── سطح المكتب: Kanban أو List ── */}
        <div className="hidden md:block">
          {view === 'kanban' ? (
            <div className="flex gap-5 min-h-150 overflow-x-auto pb-6 custom-scrollbar">
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
                          <div className="h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center opacity-30">
                            <Plus className="w-6 h-6 mb-1" />
                            <span className="text-xs font-bold uppercase tracking-tighter">{isAr ? "فارغ" : "Empty"}</span>
                          </div>
                        )}
                      </SortableContext>
                    </KanbanColumn>
                  );
                })}
                <DragOverlay>
                  {activeTask ? (
                    <div className="bg-card p-4 rounded-lg shadow-sm border-2 border-primary scale-105 -rotate-2 w-70">
                      <h4 className="text-xs font-bold truncate">{activeTask.title}</h4>
                      <div className="w-full bg-muted h-1 rounded-full mt-3"><div className="bg-primary h-full" style={{ width: `${activeTask.progress}%` }} /></div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          ) : (
            <div className="py-20 text-center border-2 border-dashed rounded-lg text-muted-foreground">
              {isAr ? "عرض القائمة قيد التحميل..." : "List view is ready for data."}
            </div>
          )}
        </div>

        {/* ── الموبايل: فلاتر + قائمة مسطحة ── */}
        <div className="md:hidden space-y-4">
          {/* فلاتر الحالة */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setMobileFilter('all')}
              className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${mobileFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background dark:bg-secondary text-muted-foreground border border-border'}`}
            >
              {isAr ? 'الكل' : 'Tout'} <span className="opacity-60">({tasks.length})</span>
            </button>
            {columns.map(col => (
              <button
                key={col.id}
                onClick={() => setMobileFilter(col.id)}
                className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${mobileFilter === col.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background dark:bg-secondary text-muted-foreground border border-border'}`}
              >
                {isAr ? col.title_ar : col.title_fr} <span className="opacity-60">({taskCounts[col.id] || 0})</span>
              </button>
            ))}
          </div>

          {/* قائمة المهام المسطحة */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-border rounded-lg">
                <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-bold text-muted-foreground">{isAr ? 'لا توجد مهام في هذا التصنيف' : 'Aucune tâche dans cette catégorie'}</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <MobileTaskCard key={task.id} task={task} isAr={isAr} workers={workers} projectId={project.id} onRefresh={() => refreshData(true)} />
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}