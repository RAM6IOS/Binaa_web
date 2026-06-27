"use client";

import { use, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GanttChart as ProjectGanttChart } from "./components/GanttChart";
import { MapPin, Calendar, Loader2, ArrowLeft, ArrowRight, AlertCircle, RefreshCcw, BookOpen, UserCheck } from "lucide-react";
import { Project, ProjectDocument, ProjectTask } from "@/lib/types/projects";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/routing";

// Tabs
import { OverviewTab } from "./components/OverviewTab";
import { TaskBoardTab } from "./components/TaskBoardTab";
import { ResourcesTab } from "./components/ResourcesTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { DailyLogsTab } from "./components/DailyLogsTab";


type ProjectWithJoins = Project & {
  project_documents: ProjectDocument[];
  tasks: ProjectTask[];
};

export default function ProjectDetailPage({
  params
}: {
  params: Promise<{ locale: string, id: string }>
}) {
  const unwrappedParams = use(params);
  const { locale, id } = unwrappedParams;
  const isAr = locale === 'ar';
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<ProjectWithJoins | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('projects')
        .select(`
          *,
          project_documents (*),
          tasks (*)
        `)
        .eq('id', id)
        .single();

      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw supabaseError;
      }

      if (!data) {
        setProject(null);
      } else {
        setProject(data as ProjectWithJoins);
      }
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to fetch project');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();

    // Subscribe to changes
    const channel = supabase
      .channel(`project-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${id}` },
        () => fetchProject(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)] items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">
          {isAr ? 'جاري تحميل تفاصيل المشروع...' : 'Chargement des détails du projet...'}
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)] items-center justify-center gap-6 p-6 text-center">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'لم يتم العثور على المشروع' : 'Projet introuvable'}
          </h2>
          <p className="text-slate-500 max-w-md mx-auto">
            {error ?
              (isAr ? `خطأ: ${error}` : `Erreur: ${error}`) :
              (isAr ? 'المشروع الذي تبحث عنه غير موجود أو تم حذفه.' : 'Le projet que vous recherchez n\'existe pas ou a été supprimé.')
            }
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/projects')}>
            {isAr ? 'العودة للمشاريع' : 'Retour aux projects'}
          </Button>
          <Button onClick={() => fetchProject()} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            {isAr ? 'إعادة المحاولة' : 'Réessayer'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Back Button & Title Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/projects')}
          className="gap-2 -ml-2 text-slate-500 hover:text-slate-900"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isAr ? 'العودة إلى قائمة المشاريع' : 'Retour aux projets'}
        </Button>

        {/* <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Share2 className="w-4 h-4" />
            {isAr ? 'مشاركة' : 'Partager'}
          </Button>
        </div> */}
      </div>

      {/* Header Profile */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="grid md:grid-cols-[1fr,300px] gap-8 relative z-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {project.name}
              </h1>
              <ProjectStatusBadge status={project.status} isAr={isAr} />
            </div>

            <p className="text-slate-600 dark:text-slate-400 max-w-2xl line-clamp-2">
              {project.description || (isAr ? 'لا يوجد وصف متاح للمشروع.' : 'Aucune description disponible.')}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 font-medium">
                <MapPin className="w-4 h-4 text-blue-500" /> {project.wilaya}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 font-medium">
                <Calendar className="w-4 h-4 text-orange-500" />
                {new Date(project.start_date).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')} → {new Date(project.expected_end_date).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span>{isAr ? 'الإنجاز الكلي' : 'Progression globale'}</span>
                <span>{project.progress}%</span>
              </div>
              <ProgressBar progress={project.progress} status={project.status} showText={false} className="h-2.5" />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4">

              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">{isAr ? 'العميل' : 'Client'}</p>
                <p className="font-bold text-slate-900 dark:text-white truncate" title={project.client_name}>
                  {project.client_name || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-slate-200 dark:border-slate-800 rounded-none mb-6 gap-8 overflow-x-auto">
          <TabsTrigger value="overview" className="pb-4 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all">
            {isAr ? 'نظرة عامة' : 'Aperçu'}
          </TabsTrigger>
          <TabsTrigger value="gantt" className="pb-4 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all">
            {isAr ? 'الجدول الزمني' : 'Gantt'}

          </TabsTrigger>

          <TabsTrigger value="tasks" className="pb-4 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all">
            {isAr ? 'المهام' : 'Tâches'}
          </TabsTrigger>
          <TabsTrigger value="resources" className="pb-4 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all">
            {isAr ? 'العمال والعتاد' : 'Ressources'}
          </TabsTrigger>
          <TabsTrigger value="documents" className="pb-4 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all">
            {isAr ? 'الوثائق' : 'Documents'}
          </TabsTrigger>

          <TabsTrigger value="daily-logs" className="pb-4 pt-0 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-semibold transition-all text-orange-600 dark:text-orange-400 data-[state=active]:text-orange-600 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            {isAr ? 'التقارير اليومية' : 'Rapports journaliers'}
          </TabsTrigger>

        </TabsList>

        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <OverviewTab project={project} isAr={isAr} onRefresh={() => fetchProject(true)} />
        </TabsContent>
        <TabsContent value="gantt" className="mt-0 focus-visible:outline-none">
          <ProjectGanttChart projectId={project.id} isAr={isAr} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-0 focus-visible:outline-none">
          <TaskBoardTab project={project} isAr={isAr} />
        </TabsContent>

        <TabsContent value="resources" className="mt-0 focus-visible:outline-none">
          <ResourcesTab project={project} isAr={isAr} />
        </TabsContent>

        <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
          <DocumentsTab project={project} isAr={isAr} />
        </TabsContent>



        <TabsContent value="daily-logs" className="mt-0 focus-visible:outline-none">
          <DailyLogsTab project={project} isAr={isAr} />
        </TabsContent>


      </Tabs>
    </div>
  );
}

