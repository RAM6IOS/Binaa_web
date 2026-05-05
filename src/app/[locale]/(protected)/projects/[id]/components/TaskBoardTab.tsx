"use client";

import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Project, ProjectTask, TaskStatus, Worker } from "@/lib/types/projects";
import { tasksService } from "@/lib/services/tasks-service";
import { workersService } from "@/lib/services/workers-service";
import { Loader2, LayoutGrid, List, Calendar, User, Clock, CheckCircle2, AlertCircle, Edit2, GripVertical } from "lucide-react";
import { AddTaskDialog } from './AddTaskDialog';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { ProgressBar } from "@/components/projects/ProgressBar";

// Helper components for Kanban
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function TaskStatusBadge({ status, isAr }: { status: TaskStatus, isAr: boolean }) {
  const configs: Record<TaskStatus, { labelAr: string, labelFr: string, className: string }> = {
    todo: { labelAr: 'للقيام بها', labelFr: 'À faire', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    in_progress: { labelAr: 'قيد الإنجاز', labelFr: 'En cours', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    done: { labelAr: 'مكتملة', labelFr: 'Terminé', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    delayed: { labelAr: 'متأخرة', labelFr: 'En retard', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  const config = configs[status];
  return (
    <Badge variant="secondary" className={`font-medium ${config.className}`}>
      {isAr ? config.labelAr : config.labelFr}
    </Badge>
  );
}

function KanbanColumn({ id, title, count, children }: { id: string, title: string, count: number, children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div ref={setNodeRef} className="flex-1 min-w-[280px] bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 flex flex-col border border-slate-100 dark:border-slate-800/50">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest">{title}</h3>
        <Badge variant="outline" className="bg-white dark:bg-slate-800 font-bold text-[10px]">{count}</Badge>
      </div>
      <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function SortableTaskCard({ task, isAr, workers, projectId, onRefresh }: { task: ProjectTask, isAr: boolean, workers: Worker[], projectId: string, onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const assignedWorker = workers.find(w => w.id === task.assigned_to);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white dark:bg-slate-950 p-3 rounded-md shadow-sm border border-slate-200 dark:border-slate-800 mb-2 touch-none hover:border-blue-300 dark:hover:border-blue-700 transition-colors group relative ${isDragging ? 'z-50 ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
         <div className="flex items-start gap-2 flex-1">
            <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
               <GripVertical className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-semibold leading-tight">{task.title}</h4>
         </div>
         
         <div className="flex items-center gap-1">
            <AddTaskDialog 
               isAr={isAr} 
               projectId={projectId} 
               onSuccess={onRefresh} 
               task={task}
               trigger={
                 <button className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
                   <Edit2 className="w-3 h-3" />
                 </button>
               }
            />
            <TaskPriorityBadge priority={task.priority} isAr={isAr} />
         </div>
      </div>
      
      <div className="flex flex-col gap-2 mt-3 pl-5">
        <div className="flex justify-between items-center text-[11px] text-slate-500">
           <span className="flex items-center gap-1">
             <Calendar className="w-3 h-3" />
             {task.due_date}
           </span>
           <span className="flex items-center gap-1">
             <Clock className="w-3 h-3" />
             {task.estimated_hours || 0}h
           </span>
        </div>
        
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full transition-all duration-500 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${task.progress}%` }}></div>
        </div>

        <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1 max-w-[120px] truncate">
             <User className="w-2.5 h-2.5" />
             {assignedWorker ? assignedWorker.full_name : (isAr ? 'غير معين' : 'Non assigné')}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${task.progress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
             {task.progress}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  project: Project & { tasks?: ProjectTask[] };
  isAr: boolean;
}

export function TaskBoardTab({ project, isAr }: Props) {
  const [tasks, setTasks] = useState<ProjectTask[]>(project.tasks || []);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(!project.tasks);
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const columns: { id: TaskStatus; title_ar: string; title_fr: string }[] = [
    { id: 'todo', title_ar: 'المهام الجديدة', title_fr: 'À faire' },
    { id: 'in_progress', title_ar: 'قيد الإنجاز', title_fr: 'En cours' },
    { id: 'done', title_ar: 'مكتملة', title_fr: 'Terminé' },
    { id: 'delayed', title_ar: 'متأخرة', title_fr: 'En retard' },
  ];

  const fetchTasks = async () => {
    try {
      const data = await tasksService.getByProjectId(project.id);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
       if (!project.tasks) setIsLoading(true);
       try {
         const [workersData, tasksData] = await Promise.all([
            workersService.getAll(),
            project.tasks ? Promise.resolve(project.tasks) : tasksService.getByProjectId(project.id)
         ]);
         setWorkers(workersData);
         setTasks(tasksData);
       } catch (error) {
         console.error('Error fetching initial TaskBoard data:', error);
       } finally {
         setIsLoading(false);
       }
    };
    fetchInitialData();

    const unsubscribe = tasksService.subscribe(project.id, () => {
      fetchTasks();
    });

    return () => { unsubscribe(); };
  }, [project.id, project.tasks]);


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveTask(tasks.find(t => t.id === active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isOverAColumn = columns.find(c => c.id === overId);
    
    setTasks(prev => {
      const activeIndex = prev.findIndex(t => t.id === activeId);
      const activeTask = prev[activeIndex];
      let overIndex = prev.findIndex(t => t.id === overId);
      let newStatus = activeTask.status;

      if (isOverAColumn) {
        newStatus = overId as TaskStatus;
      } else {
        const overTask = prev[overIndex];
        if (overTask) newStatus = overTask.status;
      }

      if (activeTask.status !== newStatus) {
        // Status changed, update DB asynchronously
        tasksService.updateStatus(activeTask.id, newStatus);
        
        // Optimistic UI update
        const newTasks = [...prev];
        const updatedTask = { ...newTasks[activeIndex], status: newStatus };
        if (newStatus === 'done') updatedTask.progress = 100;
        else if (newStatus === 'todo') updatedTask.progress = 0;
        
        newTasks[activeIndex] = updatedTask;
        
        if (!isOverAColumn) {
           return arrayMove(newTasks, activeIndex, overIndex);
        }
        return newTasks;
      } else if (overIndex !== -1) {
        // Just reordering within the same column
        return arrayMove(prev, activeIndex, overIndex);
      }
      return prev;
    });
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <Card className="animate-in fade-in duration-500 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b mb-6">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            {isAr ? 'إدارة مهام المشروع' : 'Gestion des tâches'}
          </CardTitle>
          <CardDescription>{isAr ? 'تتبع سير العمل وتنظيم المهام اليومية' : 'Suivez l\'avancement et organisez les tâches quotidiennes'}</CardDescription>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border">
            <button 
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              title={isAr ? 'عرض كانبان' : 'Vue Kanban'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              title={isAr ? 'عرض القائمة' : 'Vue Liste'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <AddTaskDialog isAr={isAr} projectId={project.id} onSuccess={fetchTasks} />
        </div>
      </CardHeader>
      
      <CardContent>
        {view === 'kanban' ? (
          <div className="flex flex-col md:flex-row gap-4 min-h-[600px] overflow-x-auto pb-4">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {columns.map(col => {
                const columnTasks = tasks.filter(t => t.status === col.id);
                return (
                  <KanbanColumn 
                    key={col.id} 
                    id={col.id} 
                    title={isAr ? col.title_ar : col.title_fr} 
                    count={columnTasks.length}
                  >
                    <SortableContext id={col.id} items={columnTasks.map(t => t.id)}>
                      <div className="flex-1 overflow-y-auto w-full min-h-[100px]" style={{ touchAction: 'none' }}>
                        {columnTasks.map(task => (
                          <SortableTaskCard 
                            key={task.id} 
                            task={task} 
                            isAr={isAr} 
                            workers={workers} 
                            projectId={project.id} 
                            onRefresh={fetchTasks} 
                          />
                        ))}
                        {columnTasks.length === 0 && (
                          <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-400 italic">
                             {isAr ? 'لا توجد مهام' : 'Aucune tâche'}
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </KanbanColumn>
                );
              })}
              <DragOverlay>
                {activeTask ? (
                  <div className="bg-white dark:bg-slate-950 p-3 rounded-md shadow-2xl border-2 border-blue-500 rotate-2 cursor-grabbing opacity-90 w-[280px]">
                    <div className="flex justify-between items-start gap-2 mb-2">
                       <div className="flex items-start gap-2 flex-1">
                          <GripVertical className="w-3.5 h-3.5 mt-1 text-blue-500" />
                          <h4 className="text-sm font-bold leading-tight">{activeTask.title}</h4>
                       </div>
                       <TaskPriorityBadge priority={activeTask.priority} isAr={isAr} />
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-2">
                       <div className="bg-blue-500 h-full" style={{ width: `${activeTask.progress}%` }}></div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableHead className="w-[300px]">{isAr ? 'المهمة' : 'Tâche'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Statut'}</TableHead>
                  <TableHead>{isAr ? 'الأولوية' : 'Priorité'}</TableHead>
                  <TableHead>{isAr ? 'تاريخ الاستحقاق' : 'Échéance'}</TableHead>
                  <TableHead>{isAr ? 'التقدم' : 'Progrès'}</TableHead>
                  <TableHead>{isAr ? 'المسؤول' : 'Responsable'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic">
                      {isAr ? 'لا توجد مهام مضافة بعد.' : 'Aucune tâche ajoutée pour le moment.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => {
                    const assignedWorker = workers.find(w => w.id === task.assigned_to);
                    return (
                      <TableRow key={task.id} className="group transition-colors">
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {task.title}
                          {task.description && (
                            <p className="text-xs text-slate-500 font-normal mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <TaskStatusBadge status={task.status} isAr={isAr} />
                        </TableCell>
                        <TableCell>
                          <TaskPriorityBadge priority={task.priority} isAr={isAr} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {task.due_date}
                          </div>
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <div className="flex items-center gap-2">
                             <div className="flex-1">
                               <ProgressBar progress={task.progress} status="in_progress" showText={false} className="h-1.5" />
                             </div>
                             <span className="text-xs font-bold w-8">{task.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border">
                              {assignedWorker?.photo_url ? (
                                <img src={assignedWorker.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <span className="text-sm truncate max-w-[120px]">
                              {assignedWorker ? assignedWorker.full_name : (isAr ? 'غير معين' : 'Non assigné')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <AddTaskDialog 
                            isAr={isAr} 
                            projectId={project.id} 
                            onSuccess={fetchTasks} 
                            task={task}
                            trigger={
                              <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
