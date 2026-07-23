"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ganttService, GanttTask } from "@/lib/services/gantt-service";
import { tasksService } from "@/lib/services/tasks-service";
import { projectWorkersService } from "@/lib/services/project-workers-service";
import { projectsService } from "@/lib/services/projects-service";
import { Worker, Project } from "@/lib/types/projects";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { GanttTaskDialog, PRESET_COLORS } from "./GanttTaskDialog";
import {
    Plus,
    ZoomIn,
    ZoomOut,
    Calendar,
    User,
    Clock,
    AlertCircle,
    Trash2,
    Search,
    SlidersHorizontal,
    GitBranch,
    ArrowRightLeft,
    CheckCircle2,
    AlertTriangle,
    Edit2,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    CornerDownLeft,
    CornerDownRight
} from "lucide-react";
import {
    differenceInDays,
    addDays,
    format,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    getDaysInMonth,
    getWeek,
    isToday
} from "date-fns";
import { arDZ, fr } from "date-fns/locale";

interface GanttChartProps {
    projectId: string;
    isAr: boolean;
}

export interface GanttTaskExtended extends GanttTask {
    assigned_worker?: {
        id: string;
        full_name: string;
        job_title: string;
    };
}

interface DragState {
    taskId: string;
    mode: "move" | "resize-start" | "resize-end";
    startX: number;
    originalStart: Date;
    originalDue: Date;
}

export function GanttChart({ projectId, isAr }: GanttChartProps) {
    const [tasks, setTasks] = useState<GanttTaskExtended[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState<"day" | "week" | "month">("week");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Collapsed tasks record: task_id -> expanded (default true)
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

    // Dynamic timeline range padding/margins in days (initially 15 days before/after)
    const [addedMarginBefore, setAddedMarginBefore] = useState(15);
    const [addedMarginAfter, setAddedMarginAfter] = useState(15);

    // Dialog state
    const [activeTask, setActiveTask] = useState<Partial<GanttTaskExtended> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Drag and drop state
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [hasSetDefaultZoom, setHasSetDefaultZoom] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const dateLocale = isAr ? arDZ : fr;
    // ─── إدارة حالة الحذف الاحترافي ───
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // ─── Mobile View & Sidebar Responsiveness ───
    const [mobileViewMode, setMobileViewMode] = useState<"list" | "gantt">("list");
    const [sidebarWidth, setSidebarWidth] = useState(320);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setMobileViewMode(window.innerWidth < 768 ? "list" : "gantt");
            setSidebarWidth(window.innerWidth < 768 ? 130 : 320);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setSidebarWidth(window.innerWidth < 768 ? 130 : 320);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Load tasks, workers, and project details
    const loadTasks = async () => {
        try {
            const data = await ganttService.getProjectTasks(projectId);
            setTasks(data as GanttTaskExtended[]);
        } catch (error) {
            console.error("Error loading Gantt tasks:", error);
            toast.error(isAr ? "فشل تحميل المهام" : "Erreur de chargement des tâches");
        }
    };

    const loadWorkers = async () => {
        try {
            const projectWorkers = await projectWorkersService.getByProjectId(projectId);
            if (projectWorkers && Array.isArray(projectWorkers)) {
                const workersList = projectWorkers
                    .map((pw) => pw.worker)
                    .filter((w): w is Worker => !!w);
                setWorkers(workersList);
            }
        } catch (error) {
            console.error("Error loading project workers:", error);
        }
    };

    const loadProject = async () => {
        try {
            const data = await projectsService.getById(projectId);
            setProject(data);
        } catch (error) {
            console.error("Error loading project details:", error);
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([loadTasks(), loadWorkers(), loadProject()]).finally(() => setLoading(false));
    }, [projectId]);

    // Real-time updates subscription
    useEffect(() => {
        const unsubscribe = tasksService.subscribe(projectId, () => {
            if (!dragState) {
                loadTasks();
            }
        });
        return () => {
            unsubscribe();
        };
    }, [projectId, dragState]);

    // Sort tasks by order_index
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => a.order_index - b.order_index);
    }, [tasks]);

    // Calculate project bounds and duration strictly based on project dates
    const projectBounds = useMemo(() => {
        let start = project?.start_date ? new Date(project.start_date) : null;
        let end = project?.expected_end_date ? new Date(project.expected_end_date) : null;

        // Final fallback if project dates are missing
        if (!start) start = new Date();
        if (!end) end = addDays(start, 30);

        return {
            start,
            end,
            duration: differenceInDays(end, start)
        };
    }, [project]);

    // Adjust timeline margins dynamically based on tasks on load and updates
    // Ignore tasks with dates unreasonably far outside project range (e.g. more than 365 days) to avoid rendering issues caused by typos or legacy data.
    useEffect(() => {
        if (tasks.length > 0 && projectBounds.start && projectBounds.end) {
            let maxBefore = 15;
            let maxAfter = 15;

            tasks.forEach((t) => {
                if (!t.start_date || !t.due_date) return;
                const taskStart = new Date(t.start_date);
                const taskDue = new Date(t.due_date);

                // Ensure dates are valid
                if (!isNaN(taskStart.getTime()) && !isNaN(taskDue.getTime())) {
                    if (taskStart < projectBounds.start) {
                        const diff = differenceInDays(projectBounds.start, taskStart);
                        if (diff < 365) {
                            maxBefore = Math.max(maxBefore, diff + 5);
                        }
                    }
                    if (taskDue > projectBounds.end) {
                        const diff = differenceInDays(taskDue, projectBounds.end);
                        if (diff < 365) {
                            maxAfter = Math.max(maxAfter, diff + 5);
                        }
                    }
                }
            });

            setAddedMarginBefore(maxBefore);
            setAddedMarginAfter(maxAfter);
        }
    }, [tasks, projectBounds.start, projectBounds.end]);

    // Set dynamic default zoom level based on project duration (run once when project loads)
    // Short project (< 3 months / 90 days) -> weekly zoom.
    // Long project (>= 3 months) -> monthly zoom.
    useEffect(() => {
        if (project && !hasSetDefaultZoom) {
            const duration = projectBounds.duration;
            if (duration < 90) {
                setZoomLevel("week");
            } else {
                setZoomLevel("month");
            }
            setHasSetDefaultZoom(true);
        }
    }, [project, projectBounds.duration, hasSetDefaultZoom]);

    // Compute timeline range dynamically with margins (initially 15 days before/after, expandable)
    const timelineRange = useMemo(() => {
        const startWithPad = addDays(projectBounds.start, -addedMarginBefore);
        const endWithPad = addDays(projectBounds.end, addedMarginAfter);

        if (zoomLevel === "day" || zoomLevel === "week") {
            return {
                start: startOfWeek(startWithPad, { weekStartsOn: 6 }), // Saturday start
                end: endOfWeek(endWithPad, { weekStartsOn: 6 })
            };
        } else {
            return {
                start: startOfMonth(startWithPad),
                end: endOfMonth(endWithPad)
            };
        }
    }, [projectBounds, addedMarginBefore, addedMarginAfter, zoomLevel]);

    const { start: timelineStart, end: timelineEnd } = timelineRange;
    const totalDays = useMemo(() => {
        return differenceInDays(timelineEnd, timelineStart) + 1;
    }, [timelineStart, timelineEnd]);

    // Set widths based on zoom level
    const dayWidth = zoomLevel === "day" ? 64 : zoomLevel === "week" ? 18 : 5;
    const rowHeight = 56;

    // Helpers
    const getDaysFromStart = (dateStr: string) => {
        const date = new Date(dateStr);
        return differenceInDays(date, timelineStart);
    };

    const getTaskX = (startDateStr: string) => {
        return getDaysFromStart(startDateStr) * dayWidth;
    };

    const getTaskWidth = (startDateStr: string, endDateStr: string) => {
        const days = differenceInDays(new Date(endDateStr), new Date(startDateStr)) + 1;
        return Math.max(1, days) * dayWidth;
    };

    // Keep the timeline viewport centered on the project center when zoom level changes
    useEffect(() => {
        if (!loading && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const projectStartStr = format(projectBounds.start, "yyyy-MM-dd");
            const projectEndStr = format(projectBounds.end, "yyyy-MM-dd");
            const startX = getTaskX(projectStartStr);
            const projectW = getTaskWidth(projectStartStr, projectEndStr);
            const centerX = startX + projectW / 2;

            // Scroll to center the project
            container.scrollLeft = centerX - container.clientWidth / 2;
        }
    }, [zoomLevel, loading]);

    // Construct hierarchical visibility list
    const visibleTasks = useMemo(() => {
        // Flat view if searching or filtering status
        if (searchQuery || (statusFilter && statusFilter !== "all")) {
            return sortedTasks
                .filter((task) => {
                    const matchesSearch = searchQuery
                        ? task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
                        : true;
                    const matchesStatus =
                        statusFilter && statusFilter !== "all" ? task.status === statusFilter : true;
                    return matchesSearch && matchesStatus;
                })
                .map((task) => ({
                    task,
                    level: 0,
                    hasChildren: false
                }));
        }

        // ─── منطق الحذف ───
        const handleConfirmDelete = async () => {
            if (!activeTask?.id) return;
            setIsSaving(true);
            try {
                await tasksService.delete(activeTask.id);
                toast.success(isAr ? "تم حذف المهمة بنجاح" : "Tâche supprimée");
                setIsDeleteModalOpen(false);
                setIsDialogOpen(false); // نغلق ديالوج التعديل أيضاً
                loadTasks();
            } catch (error) {
                toast.error(isAr ? "فشل حذف المهمة" : "Erreur");
            } finally {
                setIsSaving(false);
            }
        };
        const result: { task: GanttTaskExtended; level: number; hasChildren: boolean }[] = [];

        // Group children
        const childrenMap: Record<string, GanttTaskExtended[]> = {};
        tasks.forEach((t) => {
            if (t.parent_task_id) {
                if (!childrenMap[t.parent_task_id]) {
                    childrenMap[t.parent_task_id] = [];
                }
                childrenMap[t.parent_task_id].push(t);
            }
        });

        // Find root tasks (no parent, or parent not in list)
        const taskIds = new Set(tasks.map((t) => t.id));
        const rootTasks = tasks
            .filter((t) => !t.parent_task_id || !taskIds.has(t.parent_task_id))
            .sort((a, b) => a.order_index - b.order_index);

        const traverse = (task: GanttTaskExtended, level: number, isParentVisible: boolean) => {
            const children = childrenMap[task.id] || [];
            const hasChildren = children.length > 0;

            if (isParentVisible) {
                result.push({
                    task,
                    level,
                    hasChildren
                });
            }

            const isExpanded = expandedTasks[task.id] !== false; // expanded by default
            children
                .sort((a, b) => a.order_index - b.order_index)
                .forEach((child) => traverse(child, level + 1, isParentVisible && isExpanded));
        };

        rootTasks.forEach((t) => traverse(t, 0, true));

        return result;
    }, [tasks, expandedTasks, searchQuery, statusFilter, sortedTasks]);

    // Construct columns and headers based on zoom level
    const { subHeaderCells, parentHeaderCells } = useMemo(() => {
        const sub: { label: string; subLabel: string; width: number; key: string }[] = [];
        const parent: { label: string; width: number; key: string }[] = [];

        if (zoomLevel === "day") {
            const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd });
            days.forEach((day) => {
                sub.push({
                    label: format(day, "d"),
                    subLabel: format(day, "E", { locale: dateLocale }),
                    width: dayWidth,
                    key: day.toISOString()
                });
            });

            // Group by month
            let currentMonth = timelineStart;
            let currentWidth = 0;
            days.forEach((day) => {
                if (
                    day.getMonth() !== currentMonth.getMonth() ||
                    day.getFullYear() !== currentMonth.getFullYear()
                ) {
                    parent.push({
                        label: format(currentMonth, "MMMM yyyy", { locale: dateLocale }),
                        width: currentWidth,
                        key: currentMonth.toISOString()
                    });
                    currentMonth = day;
                    currentWidth = 0;
                }
                currentWidth += dayWidth;
            });
            parent.push({
                label: format(currentMonth, "MMMM yyyy", { locale: dateLocale }),
                width: currentWidth,
                key: currentMonth.toISOString()
            });
        } else if (zoomLevel === "week") {
            const weeks = eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 6 });
            weeks.forEach((week, idx) => {
                const weekEnd = endOfWeek(week, { weekStartsOn: 6 });
                sub.push({
                    label: isAr ? `أسبوع ${idx + 1}` : `Sem ${idx + 1}`,
                    subLabel: `${format(week, "d/M")} - ${format(weekEnd, "d/M")}`,
                    width: 7 * dayWidth,
                    key: week.toISOString()
                });
            });

            // Group by month
            let currentMonth = timelineStart;
            let currentWidth = 0;
            weeks.forEach((week) => {
                if (
                    week.getMonth() !== currentMonth.getMonth() ||
                    week.getFullYear() !== currentMonth.getFullYear()
                ) {
                    parent.push({
                        label: format(currentMonth, "MMMM yyyy", { locale: dateLocale }),
                        width: currentWidth,
                        key: currentMonth.toISOString()
                    });
                    currentMonth = week;
                    currentWidth = 0;
                }
                currentWidth += 7 * dayWidth;
            });
            parent.push({
                label: format(currentMonth, "MMMM yyyy", { locale: dateLocale }),
                width: currentWidth,
                key: currentMonth.toISOString()
            });
        } else {
            const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
            months.forEach((month) => {
                const daysInMonth = getDaysInMonth(month);
                sub.push({
                    label: format(month, "MMMM", { locale: dateLocale }),
                    subLabel: format(month, "yyyy"),
                    width: daysInMonth * dayWidth,
                    key: month.toISOString()
                });
            });

            // Group by year
            let currentYear = timelineStart;
            let currentWidth = 0;
            months.forEach((month) => {
                const daysInMonth = getDaysInMonth(month);
                if (month.getFullYear() !== currentYear.getFullYear()) {
                    parent.push({
                        label: format(currentYear, "yyyy"),
                        width: currentWidth,
                        key: currentYear.toISOString()
                    });
                    currentYear = month;
                    currentWidth = 0;
                }
                currentWidth += daysInMonth * dayWidth;
            });
            parent.push({
                label: format(currentYear, "yyyy"),
                width: currentWidth,
                key: currentYear.toISOString()
            });
        }

        return { subHeaderCells: sub, parentHeaderCells: parent };
    }, [timelineStart, timelineEnd, zoomLevel, dayWidth, dateLocale, isAr]);

    // Today indicator coordinate
    const todayIndicator = useMemo(() => {
        const today = new Date();
        const active = today >= timelineStart && today <= timelineEnd;
        return {
            active,
            x: active ? getTaskX(format(today, "yyyy-MM-dd")) : 0
        };
    }, [timelineStart, timelineEnd, dayWidth]);

    // Map tasks to positions in coordinates
    const taskPositions = useMemo(() => {
        const positions: Record<string, { xStart: number; xEnd: number; y: number; index: number }> = {};
        visibleTasks.forEach((item, index) => {
            const { task } = item;
            const xStart = getTaskX(task.start_date);
            const xEnd = xStart + getTaskWidth(task.start_date, task.due_date);
            const y = index * rowHeight + rowHeight / 2;
            positions[task.id] = { xStart, xEnd, y, index };
        });
        return positions;
    }, [visibleTasks, timelineStart, dayWidth]);

    // SVG Dependency connectors
    const dependencyLines = useMemo(() => {
        const lines: { path: string; id: string; isConflict: boolean }[] = [];
        visibleTasks.forEach((item) => {
            const { task } = item;
            if (!task.dependency_ids || !Array.isArray(task.dependency_ids)) return;

            const targetPos = taskPositions[task.id];
            if (!targetPos) return;

            task.dependency_ids.forEach((depId) => {
                const sourcePos = taskPositions[depId];
                if (!sourcePos) return;

                const x1 = sourcePos.xEnd;
                const y1 = sourcePos.y;
                const x2 = targetPos.xStart;
                const y2 = targetPos.y;

                const isConflict = x2 < x1;

                // Step path layout
                let path = "";
                if (x2 >= x1 + 16) {
                    const midX = x1 + (x2 - x1) / 2;
                    path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                } else {
                    const offset = 12;
                    const branchY = y1 + (y2 - y1) / 2;
                    path = `M ${x1} ${y1} L ${x1 + offset} ${y1} L ${x1 + offset} ${branchY} L ${x2 - offset} ${branchY} L ${x2 - offset} ${y2} L ${x2} ${y2}`;
                }

                lines.push({
                    path,
                    id: `${depId}-${task.id}`,
                    isConflict
                });
            });
        });
        return lines;
    }, [visibleTasks, taskPositions]);

    // Scroll viewport left/right
    const handlePrevPeriod = () => {
        if (scrollContainerRef.current) {
            const scrollAmount = zoomLevel === "day" ? 300 : zoomLevel === "week" ? 200 : 100;
            scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        }
    };

    const handleNextPeriod = () => {
        if (scrollContainerRef.current) {
            const scrollAmount = zoomLevel === "day" ? 300 : zoomLevel === "week" ? 200 : 100;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    const handleResetPeriod = () => {
        // Reset added margins to default 15 days
        setAddedMarginBefore(15);
        setAddedMarginAfter(15);

        // Scroll back to center of project
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const projectStartStr = format(projectBounds.start, "yyyy-MM-dd");
            const projectEndStr = format(projectBounds.end, "yyyy-MM-dd");
            const startX = getTaskX(projectStartStr);
            const projectW = getTaskWidth(projectStartStr, projectEndStr);
            const centerX = startX + projectW / 2;
            container.scrollTo({ left: centerX - container.clientWidth / 2, behavior: "smooth" });
        }
    };

    // Handle drag start
    const handleDragStart = (
        e: React.MouseEvent | React.TouchEvent,
        task: GanttTaskExtended,
        mode: "move" | "resize-start" | "resize-end"
    ) => {
        // Disable drag-and-drop date modification on mobile/touch view to prevent scrolling gesture conflicts
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

        setDragState({
            taskId: task.id,
            mode,
            startX: clientX,
            originalStart: new Date(task.start_date),
            originalDue: new Date(task.due_date)
        });
    };

    // Drag / Resize movements handler
    useEffect(() => {
        if (!dragState) return;

        const handleMove = (clientX: number) => {
            const deltaX = clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / dayWidth);

            if (deltaDays === 0) return;

            setTasks((prevTasks) =>
                prevTasks.map((t) => {
                    if (t.id !== dragState.taskId) return t;

                    const newStart = new Date(dragState.originalStart);
                    const newDue = new Date(dragState.originalDue);

                    if (dragState.mode === "move") {
                        newStart.setDate(newStart.getDate() + deltaDays);
                        newDue.setDate(newDue.getDate() + deltaDays);
                    } else if (dragState.mode === "resize-start") {
                        newStart.setDate(newStart.getDate() + deltaDays);
                        if (newStart > newDue) {
                            newStart.setTime(newDue.getTime());
                        }
                    } else if (dragState.mode === "resize-end") {
                        newDue.setDate(newDue.getDate() + deltaDays);
                        if (newDue < newStart) {
                            newDue.setTime(newStart.getTime());
                        }
                    }

                    return {
                        ...t,
                        start_date: format(newStart, "yyyy-MM-dd"),
                        due_date: format(newDue, "yyyy-MM-dd")
                    };
                })
            );
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX);
            }
        };

        const handleRelease = async () => {
            const updatedTask = tasks.find((t) => t.id === dragState.taskId);
            setDragState(null);

            if (updatedTask) {
                try {
                    await ganttService.updateTaskDates(
                        updatedTask.id,
                        updatedTask.start_date,
                        updatedTask.due_date
                    );
                    toast.success(
                        isAr ? "تم تحديث تاريخ المهمة بنجاح" : "Dates mises à jour"
                    );
                    loadTasks();
                } catch (error) {
                    console.error("Failed to update task dates", error);
                    toast.error(
                        isAr
                            ? "خطأ في تحديث تاريخ المهمة"
                            : "Erreur lors de la mise à jour des dates"
                    );
                    loadTasks(); // Reset to backend state
                }
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("mouseup", handleRelease);
        window.addEventListener("touchend", handleRelease);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("mouseup", handleRelease);
            window.removeEventListener("touchend", handleRelease);
        };
    }, [dragState, dayWidth, tasks]);

    const handleDoubleClickTask = (task: GanttTaskExtended) => {
        setActiveTask(task);
        setIsDialogOpen(true);
    };

    // Filter potential parent tasks to avoid circular dependencies
    const potentialParents = useMemo(() => {
        if (!activeTask) return [];
        const taskId = activeTask.id;
        if (!taskId) return tasks;

        const descendants = new Set<string>();
        const findDescendants = (id: string) => {
            tasks.forEach((t) => {
                if (t.parent_task_id === id) {
                    descendants.add(t.id);
                    findDescendants(t.id);
                }
            });
        };
        findDescendants(taskId);

        return tasks.filter((t) => t.id !== taskId && !descendants.has(t.id));
    }, [activeTask, tasks]);

    // Handle Save / Edit Task
    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTask || !activeTask.title) {
            toast.error(isAr ? "عنوان المهمة مطلوب" : "Le titre est requis");
            return;
        }

        setIsSaving(true);
        try {
            const startD = activeTask.start_date || new Date().toISOString().split("T")[0];
            const dueD = activeTask.due_date || startD;

            if (new Date(startD) > new Date(dueD)) {
                toast.error(
                    isAr
                        ? "تاريخ البدء لا يمكن أن يكون بعد تاريخ الاستحقاق"
                        : "La date de début ne peut pas être après la date de fin"
                );
                setIsSaving(false);
                return;
            }

            const payload = {
                title: activeTask.title,
                description: activeTask.description || "",
                status: activeTask.status || "todo",
                priority: activeTask.priority || "medium",
                start_date: startD,
                due_date: dueD,
                progress: typeof activeTask.progress === "number" ? activeTask.progress : 0,
                assigned_to:
                    activeTask.assigned_to === "unassigned" ? null : activeTask.assigned_to,
                parent_task_id:
                    activeTask.parent_task_id === "none" ? null : activeTask.parent_task_id,
                is_milestone: !!activeTask.is_milestone,
                dependency_ids: activeTask.dependency_ids || [],
                color: activeTask.color || "",
                project_id: projectId
            };

            if (activeTask.id) {
                // Edit task
                await tasksService.update(activeTask.id, payload as any);
                toast.success(
                    isAr ? "تم تحديث المهمة بنجاح" : "Tâche mise à jour avec succès"
                );
            } else {
                // Create task
                const nextOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order_index || 0)) + 1 : 0;
                await tasksService.create({
                    ...payload,
                    order_index: nextOrder
                } as any);
                toast.success(
                    isAr ? "تم إضافة المهمة بنجاح" : "Tâche ajoutée avec succès"
                );
            }

            setIsDialogOpen(false);
            loadTasks();
        } catch (error) {
            console.error("Error saving task:", error);
            toast.error(isAr ? "فشل حفظ المهمة" : "Erreur d'enregistrement");
        } finally {
            setIsSaving(false);
        }
    };
    // ────── معالجة الحذف الاحترافي ──────
    const handleDeleteTask = () => {
        if (!activeTask?.id) return;
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!activeTask?.id) return;
        setIsSaving(true);
        try {
            await tasksService.delete(activeTask.id);
            toast.success(isAr ? "تم حذف المهمة بنجاح" : "Tâche supprimée");
            setIsDeleteModalOpen(false);
            setIsDialogOpen(false); // إغلاق نافذة التعديل
            loadTasks(); // إعادة تحميل المهام
        } catch (error) {
            toast.error(isAr ? "فشل حذف المهمة" : "Erreur");
        } finally {
            setIsSaving(false);
        }
    };



    // Color codes based on status and custom picker override
    const getBarColor = (task: GanttTaskExtended) => {
        if (task.color) {
            switch (task.color) {
                case "blue":
                    return {
                        bg: "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800",
                        fill: "bg-blue-500 shadow-md shadow-blue-500/20 text-white",
                        text: "text-blue-600 dark:text-blue-400"
                    };
                case "green":
                    return {
                        bg: "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800",
                        fill: "bg-emerald-500 shadow-md shadow-emerald-500/20 text-white",
                        text: "text-emerald-600 dark:text-emerald-400"
                    };
                case "amber":
                    return {
                        bg: "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800",
                        fill: "bg-amber-500 shadow-md shadow-amber-500/20 text-white",
                        text: "text-amber-600 dark:text-amber-400"
                    };
                case "purple":
                    return {
                        bg: "bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-800",
                        fill: "bg-purple-500 shadow-md shadow-purple-500/20 text-white",
                        text: "text-purple-600 dark:text-purple-400"
                    };
                case "rose":
                    return {
                        bg: "bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-800",
                        fill: "bg-rose-500 shadow-md shadow-rose-500/20 text-white",
                        text: "text-rose-600 dark:text-rose-400"
                    };
                case "slate":
                    return {
                        bg: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700",
                        fill: "bg-slate-500 shadow-md shadow-slate-500/20 text-white",
                        text: "text-slate-600 dark:text-slate-400"
                    };
                default:
                    break;
            }
        }

        switch (task.status) {
            case "done":
                return {
                    bg: "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/5",
                    fill: "bg-gradient-to-r from-emerald-500 to-green-600 shadow shadow-emerald-500/15 text-white",
                    text: "text-emerald-600 dark:text-emerald-400"
                };
            case "in_progress":
                return {
                    bg: "bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/5",
                    fill: "bg-gradient-to-r from-blue-500 to-indigo-600 shadow shadow-blue-500/15 text-white",
                    text: "text-blue-600 dark:text-blue-400"
                };
            case "delayed":
                return {
                    bg: "bg-red-500/10 border-red-500/30 dark:bg-red-500/5",
                    fill: "bg-gradient-to-r from-red-500 to-rose-600 shadow shadow-red-500/15 text-white",
                    text: "text-red-600 dark:text-red-400"
                };
            case "todo":
            default:
                return {
                    bg: "bg-slate-500/10 border-slate-500/20 dark:bg-slate-500/5",
                    fill: "bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 text-white",
                    text: "text-slate-600 dark:text-slate-400"
                };
        }
    };

    const getStatusArabic = (status: string) => {
        switch (status) {
            case "todo":
                return "للقيام بها";
            case "in_progress":
                return "قيد الإنجاز";
            case "done":
                return "مكتملة";
            case "delayed":
                return "متأخرة";
            default:
                return status;
        }
    };

    const getPriorityArabic = (priority: string) => {
        switch (priority) {
            case "low":
                return "منخفضة";
            case "medium":
                return "متوسطة";
            case "high":
                return "عالية";
            case "urgent":
                return "عاجلة";
            default:
                return priority;
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-slate-500 font-sans">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
                <p className="animate-pulse">
                    {isAr ? "جاري تحميل مخطط Gantt..." : "Chargement du diagramme de Gantt..."}
                </p>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <Card className="animate-in fade-in duration-500 shadow-xl border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 font-sans">
                {/* Header Toolbar */}


                {/* ─── الديالوج الموحد لتأكيد الحذف ─── */}
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


                {/* Header Toolbar - تصميم محسن وأنظف */}
                <div className="border-b bg-white dark:bg-slate-950 px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 dark:bg-blue-950 rounded-2xl">
                                    <SlidersHorizontal className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {isAr ? "مخطط غانت التفاعلي" : "Gantt Chart"}
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 -mt-0.5">
                                        {isAr ? "جدولة زمنية، تبعيات، وسحب وإسقاط" : "Timeline, dependencies & drag & drop"}
                                    </p>
                                </div>
                            </div>

                            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                                {visibleTasks.length} {isAr ? "مهمة" : "tâches"}
                            </Badge>
                        </div>

                        {/* View Switcher for Mobile Devices */}
                        <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 w-full sm:w-64">
                            <button
                                type="button"
                                onClick={() => setMobileViewMode("list")}
                                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                                    mobileViewMode === "list"
                                        ? "bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                {isAr ? "قائمة الجدول الزمني" : "Liste"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileViewMode("gantt")}
                                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                                    mobileViewMode === "gantt"
                                        ? "bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                {isAr ? "مخطط غانت" : "Gantt"}
                            </button>
                        </div>
                    </div>

                    {/* Controls Group */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">

                        {/* Search */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute right-4 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={isAr ? "بحث في المهام..." : "Rechercher une tâche..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-4 pr-11 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 focus-visible:ring-blue-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-11 w-full sm:w-40 bg-slate-50 dark:bg-slate-900 border-slate-200">
                                <SelectValue placeholder={isAr ? "كل الحالات" : "Tous les statuts"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                                <SelectItem value="todo">{isAr ? "للقيام بها" : "À faire"}</SelectItem>
                                <SelectItem value="in_progress">{isAr ? "قيد الإنجاز" : "En cours"}</SelectItem>
                                <SelectItem value="done">{isAr ? "مكتملة" : "Terminé"}</SelectItem>
                                <SelectItem value="delayed">{isAr ? "متأخرة" : "En retard"}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Zoom Controls */}
                        <div className={`items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 ${mobileViewMode === "list" ? "hidden md:flex" : "flex"}`}>
                            <Button
                                variant={zoomLevel === "day" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setZoomLevel("day")}
                                className="rounded-lg px-4 text-xs font-semibold"
                            >
                                {isAr ? "يوم" : "Jour"}
                            </Button>
                            <Button
                                variant={zoomLevel === "week" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setZoomLevel("week")}
                                className="rounded-lg px-4 text-xs font-semibold"
                            >
                                {isAr ? "أسبوع" : "Semaine"}
                            </Button>
                            <Button
                                variant={zoomLevel === "month" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setZoomLevel("month")}
                                className="rounded-lg px-4 text-xs font-semibold"
                            >
                                {isAr ? "شهر" : "Mois"}
                            </Button>
                        </div>

                        {/* Add Task Button */}
                        <Button
                            onClick={() => {
                                setActiveTask({
                                    title: "",
                                    description: "",
                                    start_date: format(new Date(), "yyyy-MM-dd"),
                                    due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
                                    progress: 0,
                                    status: "todo",
                                    priority: "medium",
                                    is_milestone: false,
                                    dependency_ids: [],
                                    parent_task_id: "none"
                                });
                                setIsDialogOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 h-11 w-full sm:w-auto px-6 font-semibold shadow-sm flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus className="w-5 h-5" />
                            {isAr ? "إضافة مهمة" : "Nouvelle tâche"}
                        </Button>
                    </div>
                </div>



                {/* Sub Legend Bar */}
                <div className={`border-b px-6 py-2 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/20 ${mobileViewMode === "list" ? "hidden md:flex" : "flex"}`}>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span>{isAr ? "للقيام بها" : "À faire"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.3)]" />
                        <span>{isAr ? "قيد الإنجاز" : "En cours"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
                        <span>{isAr ? "مكتملة" : "Terminée"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.3)]" />
                        <span>{isAr ? "متأخرة" : "En retard"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l pl-6 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-6 border-slate-200 dark:border-slate-800">
                        <span className="w-3.5 h-3.5 rotate-45 bg-amber-500 inline-block border border-white dark:border-slate-900 shadow-sm" />
                        <span>{isAr ? "معلم رئيسي (Milestone)" : "Jalon"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-5 h-0.5 border-t-2 border-dashed border-red-500 inline-block" />
                        <span className="text-red-500 font-semibold">{isAr ? "تعارض جدولة" : "Conflit"}</span>
                    </div>
                </div>

                {/* Mobile Timeline List Feed View */}
                {mobileViewMode === "list" ? (
                    <div className="md:hidden px-4 py-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/10 min-h-[400px]">
                        {visibleTasks.length === 0 ? (
                            <div className="text-center text-slate-400 py-16 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-500" />
                                <p className="text-sm font-medium">
                                    {isAr ? "لا توجد مهام مطابقة للمواصفات" : "Aucune tâche disponible"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 relative before:absolute before:bottom-0 before:top-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:left-4 rtl:before:left-auto rtl:before:right-4">
                                {visibleTasks.map((item) => {
                                    const { task, level, hasChildren } = item;
                                    const isExpanded = expandedTasks[task.id] !== false;
                                    const workerInitials = task.assigned_worker?.full_name
                                        ? task.assigned_worker.full_name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .substring(0, 2)
                                        : "";

                                    return (
                                        <div
                                            key={task.id}
                                            className="relative transition-all duration-300 group"
                                            style={{
                                                paddingLeft: !isAr ? `${level * 12}px` : "0px",
                                                paddingRight: isAr ? `${level * 12}px` : "0px"
                                            }}
                                        >
                                            {/* Connecting node marker */}
                                            <div className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-5 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 z-10 border border-white dark:border-slate-950" />

                                            {/* Card */}
                                            <Card
                                                className={`bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                                                    task.status === "in_progress"
                                                        ? "border-l-4 border-l-blue-500 shadow-blue-500/5"
                                                        : task.status === "done"
                                                        ? "border-l-4 border-l-emerald-500 shadow-emerald-500/5"
                                                        : task.status === "delayed"
                                                        ? "border-l-4 border-l-red-500 shadow-red-500/5"
                                                        : "border-l-4 border-l-slate-400"
                                                }`}
                                            >
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="space-y-1 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {level > 0 && (
                                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-50 dark:bg-slate-900 border-slate-200">
                                                                        {isAr ? "مهمة فرعية" : "Sous-tâche"}
                                                                    </Badge>
                                                                )}
                                                                {task.is_milestone && (
                                                                    <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 text-white border-none font-bold">
                                                                        {isAr ? "🔸 معلم رئيسي" : "🔸 Jalon"}
                                                                    </Badge>
                                                                )}
                                                                <Badge
                                                                    className={`text-[9px] px-1.5 py-0 rounded font-semibold uppercase ${
                                                                        task.priority === "urgent"
                                                                            ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                                                                            : task.priority === "high"
                                                                            ? "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                                                                            : task.priority === "low"
                                                                            ? "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                                                                            : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                                                    }`}
                                                                >
                                                                    {isAr ? getPriorityArabic(task.priority) : task.priority}
                                                                </Badge>
                                                            </div>
                                                            
                                                            <h3
                                                                onClick={() => handleDoubleClickTask(task)}
                                                                className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 cursor-pointer transition-colors leading-tight"
                                                            >
                                                                {task.title}
                                                            </h3>
                                                        </div>

                                                        {!task.is_milestone && (
                                                            <div className="flex-shrink-0 flex items-center justify-center relative w-9 h-9">
                                                                <svg className="w-full h-full transform -rotate-90">
                                                                    <circle
                                                                        cx="18"
                                                                        cy="18"
                                                                        r="14"
                                                                        className="stroke-slate-100 dark:stroke-slate-800"
                                                                        strokeWidth="2.5"
                                                                        fill="transparent"
                                                                    />
                                                                    <circle
                                                                        cx="18"
                                                                        cy="18"
                                                                        r="14"
                                                                        className={
                                                                            task.status === "done"
                                                                                ? "stroke-emerald-500"
                                                                                : task.status === "in_progress"
                                                                                ? "stroke-blue-500"
                                                                                : task.status === "delayed"
                                                                                ? "stroke-red-500"
                                                                                : "stroke-slate-400"
                                                                        }
                                                                        strokeWidth="2.5"
                                                                        fill="transparent"
                                                                        strokeDasharray={2 * Math.PI * 14}
                                                                        strokeDashoffset={
                                                                            2 * Math.PI * 14 - (task.progress / 100) * 2 * Math.PI * 14
                                                                        }
                                                                        strokeLinecap="round"
                                                                    />
                                                                </svg>
                                                                <span className="absolute text-[8px] font-black text-slate-800 dark:text-slate-200">
                                                                    {task.progress}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {task.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40 italic">
                                                            "{task.description}"
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-900 text-xs">
                                                        <div className="flex items-center gap-1 text-slate-500 font-medium">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>
                                                                {task.start_date} → {task.due_date}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {task.assigned_worker ? (
                                                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 pl-2 pr-1 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">
                                                                    <Avatar className="w-5 h-5 bg-slate-200 dark:bg-slate-800 text-[8px] font-bold">
                                                                        <AvatarFallback>{workerInitials}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-350 max-w-[80px] truncate">
                                                                        {task.assigned_worker.full_name}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-slate-400">
                                                                    <User className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] font-medium">{isAr ? "غير معين" : "Non assigné"}</span>
                                                                </div>
                                                            )}

                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-2.5 rounded-lg border-slate-200 hover:bg-slate-100 text-slate-600 dark:text-slate-350 hover:text-blue-600 flex items-center gap-1"
                                                                onClick={() => handleDoubleClickTask(task)}
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                                <span>{isAr ? "تعديل" : "Modifier"}</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Main Gantt Viewport */}
                {/* We force dir="ltr" internally for calculations, but layout remains consistent */}
                <div className={`p-0 overflow-hidden relative flex flex-col dir-ltr ${mobileViewMode === "list" ? "hidden md:flex" : "flex"}`}>
                    <div
                        ref={scrollContainerRef}
                        className="overflow-x-auto overflow-y-hidden custom-scrollbar relative w-full"
                    >
                        {/* Horizontal timeline layout */}
                        <div
                            className="flex flex-col relative"
                            style={{ width: `${sidebarWidth + totalDays * dayWidth}px` }}
                        >
                            {/* 1. Header Grid Row */}
                            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 select-none z-30 sticky top-0">
                                {/* Left Sidebar Header */}
                                <div
                                    className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-40 h-16 shadow-[5px_0_10px_-3px_rgba(0,0,0,0.07)]"
                                    dir={isAr ? "rtl" : "ltr"}
                                    style={{ width: `${sidebarWidth}px` }}
                                >
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                                        {isAr ? "الهيكل الهرمي للمهام" : "Structure des tâches"}
                                    </span>
                                </div>

                                {/* Timeline Header calendar */}
                                <div className="flex-1 flex flex-col relative h-16">
                                    {/* Parent Level: Month / Year */}
                                    <div className="flex h-8 border-b border-slate-100 dark:border-slate-800/60 font-sans">
                                        {parentHeaderCells.map((pCell) => (
                                            <div
                                                key={pCell.key}
                                                className="border-r border-slate-100 dark:border-slate-800/40 text-[10px] font-extrabold text-slate-500 tracking-wider flex items-center justify-center bg-slate-50/30 dark:bg-slate-900/10 truncate px-2"
                                                style={{ width: pCell.width }}
                                            >
                                                {pCell.label}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Sub Level: Days / Weeks */}
                                    <div className="flex h-8 font-sans">
                                        {subHeaderCells.map((sCell) => (
                                            <div
                                                key={sCell.key}
                                                className="border-r border-slate-100 dark:border-slate-800/40 flex flex-col items-center justify-center flex-shrink-0 bg-white/40 dark:bg-slate-950/20"
                                                style={{ width: sCell.width }}
                                            >
                                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                                    {sCell.label}
                                                </span>
                                                <span className="text-[8px] font-medium text-slate-400 -mt-0.5">
                                                    {sCell.subLabel}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Tasks Rows Grid */}
                            <div className="flex flex-col relative z-10 bg-white dark:bg-slate-950">
                                {visibleTasks.length === 0 ? (
                                    <div className="text-center text-slate-400 py-24 bg-slate-50/10 dark:bg-slate-900/5 border-b">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-500" />
                                        <p className="text-sm font-medium">
                                            {isAr ? "لا توجد مهام مطابقة للمواصفات" : "Aucune tâche disponible"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col relative">
                                        {/* Timeline Content Grid - Absolute Columns Background */}
                                        <div
                                            className="absolute top-0 bottom-0 flex pointer-events-none z-0"
                                            style={{ left: sidebarWidth, right: 0 }}
                                        >
                                            {subHeaderCells.map((cell) => (
                                                <div
                                                    key={cell.key}
                                                    className="h-full border-r border-slate-100/60 dark:border-slate-800/30 last:border-r-0"
                                                    style={{ width: cell.width }}
                                                />
                                            ))}

                                            {/* Today line overlay inside timeline */}
                                            {todayIndicator.active && (
                                                <div
                                                    className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-15 pointer-events-none opacity-60 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                                                    style={{ left: todayIndicator.x }}
                                                >
                                                    <div className="absolute top-0 -left-[5px] w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-950 shadow-md" />
                                                </div>
                                            )}
                                        </div>

                                        {/* SVG Overlay for Connections */}
                                        <div
                                            className="absolute top-0 bottom-0 pointer-events-none z-10"
                                            style={{ left: sidebarWidth, right: 0, width: `${totalDays * dayWidth}px` }}
                                        >
                                            <svg className="w-full h-full">
                                                <defs>
                                                    <marker
                                                        id="arrow"
                                                        viewBox="0 0 10 10"
                                                        refX="6"
                                                        refY="5"
                                                        markerWidth="6"
                                                        markerHeight="6"
                                                        orient="auto-start-reverse"
                                                    >
                                                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
                                                    </marker>
                                                    <marker
                                                        id="arrow-conflict"
                                                        viewBox="0 0 10 10"
                                                        refX="6"
                                                        refY="5"
                                                        markerWidth="6"
                                                        markerHeight="6"
                                                        orient="auto-start-reverse"
                                                    >
                                                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
                                                    </marker>
                                                </defs>
                                                {dependencyLines.map((line) => (
                                                    <path
                                                        key={line.id}
                                                        d={line.path}
                                                        fill="none"
                                                        stroke={line.isConflict ? "#ef4444" : "#cbd5e1"}
                                                        strokeWidth={line.isConflict ? 2 : 1.5}
                                                        strokeDasharray={line.isConflict ? "3 3" : "0"}
                                                        markerEnd={`url(#${line.isConflict ? "arrow-conflict" : "arrow"})`}
                                                        className="transition-colors duration-200"
                                                    />
                                                ))}
                                            </svg>
                                        </div>

                                        {/* Task Rows */}
                                        {visibleTasks.map((item, index) => {
                                            const { task, level, hasChildren } = item;
                                            const colorSpec = getBarColor(task);
                                            const workerInitials = task.assigned_worker?.full_name
                                                ? task.assigned_worker.full_name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .substring(0, 2)
                                                : "";

                                            const startX = getTaskX(task.start_date);
                                            const taskW = getTaskWidth(task.start_date, task.due_date);
                                            const showTextInside = taskW > 140;
                                            const isExpanded = expandedTasks[task.id] !== false;

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="flex border-b border-slate-100 dark:border-slate-900/60 items-center hover:bg-slate-50/40 dark:hover:bg-slate-900/5 group h-14 relative"
                                                >
                                                    {/* Left Sidebar Sticky Cell (Hierarchical list) */}
                                                    <div
                                                        className="flex-shrink-0 flex items-center justify-between px-2 md:px-4 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/60 sticky left-0 z-30 h-full shadow-[5px_0_10px_-3px_rgba(0,0,0,0.05)]"
                                                        dir={isAr ? "rtl" : "ltr"}
                                                        style={{ width: `${sidebarWidth}px` }}
                                                        onDoubleClick={() => handleDoubleClickTask(task)}
                                                    >
                                                        <div
                                                            className="flex items-center truncate gap-1 md:gap-1.5"
                                                            style={{
                                                                paddingRight: isAr ? `${level * (sidebarWidth === 130 ? 8 : 16)}px` : "0px",
                                                                paddingLeft: !isAr ? `${level * (sidebarWidth === 130 ? 8 : 16)}px` : "0px"
                                                            }}
                                                        >
                                                            {/* Collapse Toggle */}
                                                            {hasChildren ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedTasks((prev) => ({
                                                                            ...prev,
                                                                            [task.id]: !isExpanded
                                                                        }));
                                                                    }}
                                                                    className="w-4 h-4 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                                    ) : isAr ? (
                                                                        <ChevronLeft className="w-3.5 h-3.5" />
                                                                    ) : (
                                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <div className="w-4 h-4 flex items-center justify-center text-slate-300">
                                                                    {level > 0 && (
                                                                        isAr ? (
                                                                            <CornerDownLeft className="w-3 h-3 opacity-60" />
                                                                        ) : (
                                                                            <CornerDownRight className="w-3 h-3 opacity-60" />
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col truncate">
                                                                <span
                                                                    className={`text-xs truncate cursor-pointer hover:text-blue-600 transition-colors ${level === 0 ? "font-bold text-slate-800 dark:text-slate-200" : "font-semibold text-slate-600 dark:text-slate-350"
                                                                        }`}
                                                                    title={task.title}
                                                                >
                                                                    {task.title}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 font-medium hidden md:inline">
                                                                    {task.start_date} → {task.due_date}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                                                            {/* User avatar */}
                                                            {task.assigned_worker ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Avatar className="w-6 h-6 border border-slate-150 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold">
                                                                            <AvatarFallback className="text-[9.5px]">
                                                                                {workerInitials}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="text-xs">
                                                                        {task.assigned_worker.full_name} (
                                                                        {task.assigned_worker.job_title})
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <User className="w-3.5 h-3.5 text-slate-300" />
                                                            )}

                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="w-7 h-7 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors rounded-full"
                                                                onClick={() => handleDoubleClickTask(task)}
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Timeline Row Cell */}
                                                    <div
                                                        className="flex-1 relative h-full overflow-visible z-0 bg-transparent"
                                                        style={{ width: `${totalDays * dayWidth}px` }}
                                                    >
                                                        {task.is_milestone ? (
                                                            // Milestone diamond
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div
                                                                        className="absolute w-5 h-5 rotate-45 border-2 border-white dark:border-slate-950 bg-amber-500 hover:bg-amber-600 cursor-pointer shadow shadow-amber-500/30 transition-all hover:scale-110 active:scale-95 z-20 flex items-center justify-center animate-in fade-in"
                                                                        style={{
                                                                            left: `${startX + taskW / 2 - 10}px`,
                                                                            top: "18px"
                                                                        }}
                                                                        onMouseDown={(e) =>
                                                                            handleDragStart(e, task, "move")
                                                                        }
                                                                        onTouchStart={(e) =>
                                                                            handleDragStart(e, task, "move")
                                                                        }
                                                                        onDoubleClick={() =>
                                                                            handleDoubleClickTask(task)
                                                                        }
                                                                    >
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-white rotate-45" />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs p-3 space-y-1">
                                                                    <p className="font-bold text-amber-600 flex items-center gap-1.5">
                                                                        🔸 {isAr ? "معلم رئيسي" : "Jalon"}: {task.title}
                                                                    </p>
                                                                    <p className="text-slate-500">
                                                                        📅 {isAr ? "التاريخ" : "Date"}: {task.due_date}
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            // Standard Task bar
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div
                                                                        className={`absolute h-8 rounded-lg border cursor-grab active:cursor-grabbing hover:shadow-lg transition-all z-20 group/bar flex items-center overflow-visible select-none ${colorSpec.bg}`}
                                                                        style={{
                                                                            left: `${startX}px`,
                                                                            width: `${taskW}px`,
                                                                            top: "12px"
                                                                        }}
                                                                        onMouseDown={(e) =>
                                                                            handleDragStart(e, task, "move")
                                                                        }
                                                                        onTouchStart={(e) =>
                                                                            handleDragStart(e, task, "move")
                                                                        }
                                                                        onDoubleClick={() =>
                                                                            handleDoubleClickTask(task)
                                                                        }
                                                                    >
                                                                        {/* Drag left handler */}
                                                                        <div
                                                                            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-l-lg transition-opacity flex items-center justify-center"
                                                                            onMouseDown={(e) =>
                                                                                handleDragStart(
                                                                                    e,
                                                                                    task,
                                                                                    "resize-start"
                                                                                )
                                                                            }
                                                                            onTouchStart={(e) =>
                                                                                handleDragStart(
                                                                                    e,
                                                                                    task,
                                                                                    "resize-start"
                                                                                )
                                                                            }
                                                                        />

                                                                        {/* Progress fill */}
                                                                        <div
                                                                            className={`h-full rounded-l-lg transition-all duration-350 pointer-events-none ${colorSpec.fill} ${task.progress === 100
                                                                                ? "rounded-r-lg"
                                                                                : ""
                                                                                }`}
                                                                            style={{ width: `${task.progress}%` }}
                                                                        />

                                                                        {/* Task text inside/outside */}
                                                                        {showTextInside ? (
                                                                            <span className="absolute inset-0 flex items-center justify-start px-3 text-[10px] font-black text-white pointer-events-none truncate drop-shadow">
                                                                                {task.progress}% | {task.title}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="absolute left-full ml-3 text-[10px] font-bold whitespace-nowrap text-slate-700 dark:text-slate-300 pointer-events-none bg-white/70 dark:bg-slate-900/70 px-1 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-800">
                                                                                {task.progress}% | {task.title}
                                                                            </span>
                                                                        )}

                                                                        {/* Drag right handler */}
                                                                        <div
                                                                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-r-lg transition-opacity flex items-center justify-center"
                                                                            onMouseDown={(e) =>
                                                                                handleDragStart(
                                                                                    e,
                                                                                    task,
                                                                                    "resize-end"
                                                                                )
                                                                            }
                                                                            onTouchStart={(e) =>
                                                                                handleDragStart(
                                                                                    e,
                                                                                    task,
                                                                                    "resize-end"
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="p-4 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl z-50">
                                                                    <div className="space-y-3" dir={isAr ? "rtl" : "ltr"}>
                                                                        <div className="flex justify-between items-start">
                                                                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                                                                {task.title}
                                                                            </p>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-[9px] font-bold px-2 py-0.5 uppercase ${colorSpec.text}`}
                                                                            >
                                                                                {isAr
                                                                                    ? getStatusArabic(task.status)
                                                                                    : task.status}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                                <Calendar className="w-3.5 h-3.5" />
                                                                                <span>
                                                                                    {task.start_date} → {task.due_date}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                                <User className="w-3.5 h-3.5" />
                                                                                <span className="truncate">
                                                                                    {task.assigned_worker
                                                                                        ? task.assigned_worker.full_name
                                                                                        : isAr
                                                                                            ? "غير معين"
                                                                                            : "Non assigné"}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                                <Clock className="w-3.5 h-3.5" />
                                                                                <span>
                                                                                    {isAr ? "الإنجاز" : "Avancement"}:{" "}
                                                                                    {task.progress}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                                <GitBranch className="w-3.5 h-3.5" />
                                                                                <span>
                                                                                    {isAr ? "التبعيات" : "Deps"}:{" "}
                                                                                    {task.dependency_ids?.length || 0}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {task.description && (
                                                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 border-t pt-2 mt-2 leading-relaxed italic">
                                                                                "{task.description}"
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Edit / Create Task Dialog */}
            <GanttTaskDialog
                isAr={isAr}
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                activeTask={activeTask}
                setActiveTask={setActiveTask}
                isSaving={isSaving}
                workers={workers}
                tasks={tasks}
                handleSaveTask={handleSaveTask}
                handleDeleteTask={handleDeleteTask}
                isDeleteModalOpen={isDeleteModalOpen}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                handleConfirmDelete={handleConfirmDelete}
                getStatusArabic={getStatusArabic}
            />
        </TooltipProvider>
    );
}