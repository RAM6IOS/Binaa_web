"use client";

import { use, useEffect, useState, useCallback, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { GanttChart as ProjectGanttChart } from "./components/GanttChart";
import { MapPin, Calendar, Loader2, AlertCircle, RefreshCcw, Landmark, MoreHorizontal } from "lucide-react";
import { Project, ProjectDocument, ProjectTask } from "@/lib/types/projects";
import { createClient } from "@/lib/supabase/client";
import { projectsService } from "@/lib/services/projects-service";
import { documentsService } from "@/lib/services/documents-service";
import { tasksService } from "@/lib/services/tasks-service";
import { useRouter } from "@/i18n/routing";
import { OverviewTab } from "./components/OverviewTab";
import { TaskBoardTab } from "./components/TaskBoardTab";
import { ResourcesTab } from "./components/ResourcesTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { DailyLogsTab } from "./components/DailyLogsTab";
import { MetresTab } from "./components/MetresTab";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectWithJoins = Project & {
  project_documents: ProjectDocument[];
  tasks: ProjectTask[];
};

export default function ProjectDetailPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const { locale, id } = use(params);
  const isAr = locale === 'ar';
  const router = useRouter();

  const [project, setProject] = useState<ProjectWithJoins | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. تحسين جلب البيانات (Optimization: Selective Fetching)
  const fetchProject = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [projectData, docsData, tasksData] = await Promise.all([
        projectsService.getById(id),
        documentsService.getByProjectId(id).catch(() => []),
        tasksService.getByProjectId(id).catch(() => []),
      ]);
      setProject({ ...projectData, project_documents: docsData, tasks: tasksData } as ProjectWithJoins);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [id, fetchProject]);

  // 2. معالجة روابط الصور لتكون أصغر (Supabase Image Transformation)
  const getOptimizedImage = (url: string) => {
    if (!url.includes('supabase.co')) return url;
    // إضافة باراميترز التصغير من طرف السيرفر لتوفير الداتا
    return `${url}?width=800&quality=75&resize=contain`;
  };

  if (isLoading && !project) return <ProjectDetailSkeleton isAr={isAr} />;

  if (error || !project) return <ErrorState error={error} isAr={isAr} retry={() => fetchProject()} />;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-12" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ─── الملحظة رقم 1: هيدر المشروع المحسّن (Mobile Responsive) ─── */}
      <header className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {project.cover_image && (
          <div className="relative w-full h-48 md:h-72 lg:h-80 bg-slate-100">
            <Image
              src={getOptimizedImage(project.cover_image)}
              alt={project.name}
              fill
              priority // يعطي أولوية للتحميل لخفض LCP
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 768px) 100vw, 1400px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:hidden" />
          </div>
        )}

        <div className="p-5 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-3 w-full">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {project.name}
                </h1>
                <ProjectStatusBadge status={project.status} isAr={isAr} />
              </div>

              <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-500 uppercase tracking-tighter tabular-nums">
                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> {project.wilaya}
                </span>
                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  {new Date(project.start_date).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}
                </span>
                <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">
                  <Landmark className="w-3.5 h-3.5" />
                  {(project.budget || 0).toLocaleString()} <span className="text-[10px]">DZD</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <div className="flex justify-between items-end">
              <div className="text-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAr ? "نسبة التقدم الميداني" : "Avancement Réel"}</p>
                <p className="text-xl font-black text-blue-600">{project.progress}%</p>
              </div>
            </div>
            <ProgressBar progress={project.progress} status={project.status} className="h-2.5 rounded-full" />
          </div>
        </div>
      </header>

      {/* ─── الملحظة رقم 2: نظام التبويبات (Scrollable on Mobile) ─── */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md -mx-4 px-4 border-b border-slate-200 dark:border-slate-800">
          <TabsList className="w-full justify-start h-14 p-0 bg-transparent rounded-none gap-6 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: isAr ? 'نظرة عامة' : 'Aperçu' },
              { id: 'tasks', label: isAr ? 'لوحة المهام' : 'Tâches' },
              { id: 'daily-logs', label: isAr ? 'التقارير اليومية' : 'Situations' },
              { id: 'metres', label: isAr ? 'الكميات المنجزة' : 'Métrés' },
              { id: 'gantt', label: isAr ? 'الجدول الزمني' : 'Gantt' },
              { id: 'resources', label: isAr ? 'العمال والعتاد' : 'Resources' },
              { id: 'documents', label: isAr ? 'الوثائق' : 'Documents' },
            ].map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-all px-2"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="pt-6">
          <TabsContent value="overview"><OverviewTab project={project} isAr={isAr} onRefresh={() => fetchProject(true)} /></TabsContent>
          <TabsContent value="tasks"><TaskBoardTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="daily-logs"><DailyLogsTab project={project} isAr={isAr} onRefresh={() => fetchProject(true)} /></TabsContent>
          <TabsContent value="metres"><MetresTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="gantt" className="min-h-[500px]"><ProjectGanttChart projectId={project.id} isAr={isAr} /></TabsContent>
          <TabsContent value="resources"><ResourcesTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab project={project} isAr={isAr} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ── Components المساعدة لتحسين الـ Performance والـ UX ──

function ProjectDetailSkeleton({ isAr }: { isAr: boolean }) {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Skeleton className="h-64 md:h-80 w-full rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-full rounded-full" />
      </div>
      <div className="flex gap-8 border-b py-2"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-20" /></div>
    </div>
  );
}

function ErrorState({ error, isAr, retry }: any) {
  return (
    <div className="flex flex-col h-[70vh] items-center justify-center text-center p-6">
      <div className="p-5 bg-red-50 rounded-3xl mb-4 text-red-500"><AlertCircle size={40} /></div>
      <h2 className="text-xl font-black mb-2">{isAr ? "عذراً، وقع خطأ في التحميل" : "Erreur de chargement"}</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">{error}</p>
      <Button onClick={retry} className="rounded-2xl gap-2 font-bold bg-blue-600 px-8 h-12 hover:bg-blue-700">
        <RefreshCcw size={16} /> {isAr ? "إعادة المحاولة" : "Réessayer"}
      </Button>
    </div>
  );
}