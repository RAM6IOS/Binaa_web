"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Project, ProjectTask, Worker } from "@/lib/types/projects";
import { tasksService } from "@/lib/services/tasks-service";
import { workersService } from "@/lib/services/workers-service";
import { Loader2, Calendar, User, Clock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays, startOfYear, endOfYear, addDays, isWithinInterval, isToday } from "date-fns";
import { fr, arDZ } from "date-fns/locale";

interface Props {
  project: Project;
  isAr: boolean;
}

export function GanttTab({ project, isAr }: Props) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const locale = isAr ? arDZ : fr;

  const fetchTasks = async () => {
    const data = await tasksService.getByProjectId(project.id);
    setTasks(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksData, workersData] = await Promise.all([
          tasksService.getByProjectId(project.id),
          workersService.getAll(),
        ]);
        setTasks(tasksData);
        setWorkers(workersData);
      } catch (error) {
        console.error('Error fetching Gantt data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const unsubscribe = tasksService.subscribe(project.id, () => {
      fetchTasks();
    });

    return () => { unsubscribe(); };
  }, [project.id]);

  // Timeline configuration
  const timelineStart = useMemo(() => startOfYear(new Date(2024, 0, 1)), []);
  const timelineEnd = useMemo(() => endOfYear(new Date(2024, 11, 31)), []);
  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;

  const months = useMemo(() => {
    const m = [];
    for (let i = 0; i < 12; i++) {
      m.push(format(new Date(2024, i, 1), 'MMM', { locale }));
    }
    return m;
  }, [locale]);

  const getPosition = (dateStr: string) => {
    const date = new Date(dateStr);
    const daysFromStart = differenceInDays(date, timelineStart);
    return (daysFromStart / totalDays) * 100;
  };

  const todayPos = useMemo(() => {
    const today = new Date();
    if (isWithinInterval(today, { start: timelineStart, end: timelineEnd })) {
      return getPosition(format(today, 'yyyy-MM-dd'));
    }
    return -1;
  }, [timelineStart, timelineEnd]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground font-sans">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="animate-pulse">{isAr ? 'جاري تحميل المخطط الزمني...' : 'Chargement du planning...'}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-sm border-border overflow-hidden">
        <CardHeader className="border-b bg-muted/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                {isAr ? 'الجدول الزمني التفاعلي' : 'Planning Interactif'}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {isAr ? 'عرض مرئي للمهام والمواعيد النهائية' : 'Visualisation interactive des tâches et échéances'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span>{isAr ? 'قيد الإنجاز' : 'En cours'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span>{isAr ? 'مكتمل' : 'Terminé'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive"></div>
                <span>{isAr ? 'متأخر' : 'Retard'}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Gantt Chart */}
          <div className="hidden md:block overflow-x-auto overflow-y-hidden custom-scrollbar">
            <div className="min-w-[1200px] p-6 relative">
              
              {/* Timeline Header */}
              <div className="flex border-b border-border pb-4 mb-6 sticky top-0 bg-card dark:bg-background z-20">
                <div className="w-[300px] font-bold text-sm text-muted-foreground uppercase tracking-widest">{isAr ? 'قائمة المهام' : 'Liste des Tâches'}</div>
                <div className="flex-1 flex">
                  {months.map((m, i) => (
                    <div key={i} className="flex-1 text-center text-xs font-bold text-muted-foreground border-l border-border last:border-r rtl:border-l-0 rtl:border-r">
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Today Line Indicator */}
              {todayPos !== -1 && (
                <div 
                  className="absolute top-0 bottom-0 w-px bg-destructive z-10 pointer-events-none opacity-50"
                  style={{ 
                    left: isAr ? 'auto' : `calc(300px + (100% - 348px) * ${todayPos / 100})`,
                    right: isAr ? `calc(300px + (100% - 348px) * ${todayPos / 100})` : 'auto'
                  }}
                >
                   <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-destructive"></div>
                   <div className="absolute top-0 left-2 text-xs font-bold text-destructive whitespace-nowrap bg-card px-1 rounded border border-destructive/20">
                     {isAr ? 'اليوم' : 'Aujourd\'hui'}
                   </div>
                </div>
              )}

              {/* Grid Lines */}
              <div className="absolute top-0 left-[324px] right-6 bottom-0 flex pointer-events-none">
                {Array.from({ length: 13 }).map((_, i) => (
                  <div key={i} className="flex-1 border-l border-border"></div>
                ))}
              </div>

              {/* Tasks Rows */}
              <div className="space-y-6 relative z-10">
                {tasks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-20 bg-muted/50 rounded-lg border-2 border-dashed border-border">
                     <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p className="text-lg font-medium">{isAr ? 'لا توجد مهام حالياً' : 'Aucune tâche planifiée'}</p>
                  </div>
                ) : (
                  tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map((task) => {
                    const startStr = task.start_date || task.due_date;
                    const startP = getPosition(startStr);
                    const endP = getPosition(task.due_date);
                    const durationP = Math.max(2, endP - startP);
                    const assignedWorker = workers.find(w => w.id === task.assigned_to);

                    return (
                      <div key={task.id} className="flex items-center group">
                        <div className="w-[300px] pr-8 rtl:pr-0 rtl:pl-8">
                          <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate" title={task.title}>
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5">
                               <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded-sm 
                                 ${task.priority === 'urgent' ? 'bg-destructive/10 text-destructive' : 
                                   task.priority === 'high' ? 'bg-warning/10 text-warning' : 
                                   'bg-primary/10 text-primary'}`}>
                                 {task.priority}
                               </span>
                               <span className="text-xs text-muted-foreground font-medium">
                                 {format(new Date(task.due_date), 'dd MMM', { locale })}
                               </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 relative h-10 flex items-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={`absolute h-7 rounded-lg flex items-center px-3 cursor-pointer transition-all hover:scale-[1.02] group/bar z-10
                                  ${task.status === 'done' ? 'bg-success text-success-foreground' : 
                                    task.status === 'in_progress' ? 'bg-primary text-primary-foreground' : 
                                    task.status === 'delayed' ? 'bg-destructive text-destructive-foreground' :
                                    'bg-muted text-foreground'}
                                `}
                                style={{
                                  left: isAr ? 'auto' : `${startP}%`,
                                  right: isAr ? `${startP}%` : 'auto',
                                  width: `${durationP}%`
                                }}
                              >
                                <div className="absolute inset-0 bg-background/10 opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-lg"></div>
                                <span className="text-xs font-bold overflow-hidden whitespace-nowrap">
                                  {task.progress}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-4 w-72 bg-popover text-popover-foreground backdrop-blur-md border-border rounded-lg" side="top">
                               <div className="space-y-3">
                                 <div className="flex justify-between items-start">
                                   <p className="font-bold text-foreground leading-tight">{task.title}</p>
                                   <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase 
                                     ${task.status === 'done' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                     {task.status}
                                   </span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-3 text-xs">
                                   <div className="flex items-center gap-2 text-muted-foreground">
                                     <Calendar className="w-3.5 h-3.5" />
                                     <span>{task.start_date || '-'} → {task.due_date}</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-muted-foreground">
                                     <User className="w-3.5 h-3.5" />
                                     <span className="truncate">{assignedWorker?.full_name || (isAr ? 'غير معين' : 'Non assigné')}</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-muted-foreground">
                                     <Clock className="w-3.5 h-3.5" />
                                     <span>{task.actual_hours || 0}h / {task.estimated_hours || 0}h</span>
                                   </div>
                                 </div>
                                 {task.description && (
                                   <p className="text-xs text-muted-foreground border-t pt-2 mt-2 leading-relaxed italic">
                                     "{task.description}"
                                   </p>
                                 )}
                               </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Mobile Task Cards */}
          <div className="md:hidden p-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">{isAr ? 'لا توجد مهام حالياً' : 'Aucune tâche planifiée'}</p>
              </div>
            ) : (
              tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map((task) => {
                const assignedWorker = workers.find(w => w.id === task.assigned_to);
                return (
                  <div key={task.id} className="border rounded-lg p-4 bg-card shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded 
                            ${task.priority === 'urgent' ? 'bg-destructive/10 text-destructive' : 
                              task.priority === 'high' ? 'bg-warning/10 text-warning' : 
                              'bg-primary/10 text-primary'}`}>
                            {task.priority}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase 
                            ${task.status === 'done' ? 'bg-success/10 text-success' : 
                              task.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                              task.status === 'delayed' ? 'bg-destructive/10 text-destructive' :
                              'bg-muted text-foreground'}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">{task.due_date}</span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full ${task.progress === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${task.progress}%` }} />
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{assignedWorker?.full_name || (isAr ? 'غير معين' : 'Non assigné')}</span>
                      <span>{task.actual_hours || 0}h / {task.estimated_hours || 0}h</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
