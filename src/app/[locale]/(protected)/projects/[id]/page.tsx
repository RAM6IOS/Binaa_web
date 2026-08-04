"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { GanttChart as ProjectGanttChart } from "./components/GanttChart";
import {
  MapPin, Calendar, Loader2, AlertCircle, RefreshCcw, Landmark,
  ArrowRight, ArrowLeft, Eye, ClipboardList, Ruler, Users, CheckSquare,
  FileText, BarChart3, Package, Truck
} from "lucide-react";
import { Project, ProjectDocument, ProjectTask } from "@/lib/types/projects";
import { projectsService } from "@/lib/services/projects-service";
import { documentsService } from "@/lib/services/documents-service";
import { tasksService } from "@/lib/services/tasks-service";
import { useRouter } from "@/i18n/routing";
import { OverviewTab } from "./components/OverviewTab";
import { TaskBoardTab } from "./components/TaskBoardTab";
import { WorkforceTab } from "./components/WorkforceTab";
import { EquipmentTab } from "./components/EquipmentTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { DailyLogsTab } from "./components/DailyLogsTab";
import { WorkAttachmentsTab } from "./components/WorkAttachmentsTab";
import { SituationsTab } from "./components/SituationsTab";
import { MetresTab } from "./components/MetresTab";
import { MaterialsTab } from "./components/MaterialsTab";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectWithJoins = Project & {
  project_documents: ProjectDocument[];
  tasks: ProjectTask[];
};

const SECTIONS = [
  { id: 'overview',    icon: Eye,          labelAr: 'نظرة عامة',      labelFr: 'Vue d\'ensemble', color: 'bg-blue-50 dark:bg-blue-950',    iconColor: 'text-blue-600' },
  { id: 'daily-logs',  icon: ClipboardList, labelAr: 'السجل اليومي',   labelFr: 'Journal de bord', color: 'bg-amber-50 dark:bg-amber-950',  iconColor: 'text-amber-600' },
  { id: 'metres',      icon: Ruler,        labelAr: 'الكميات',        labelFr: 'Métrés',          color: 'bg-emerald-50 dark:bg-emerald-950', iconColor: 'text-emerald-600' },
  { id: 'work-attachments', icon: FileText, labelAr: 'محاضر القيس', labelFr: 'Attachements', color: 'bg-teal-50 dark:bg-teal-950', iconColor: 'text-teal-600' },
  { id: 'situations',  icon: Landmark,     labelAr: 'الوضعيات',       labelFr: 'Situations',      color: 'bg-emerald-50 dark:bg-emerald-950', iconColor: 'text-emerald-600' },
  { id: 'materials',   icon: Package,      labelAr: 'المواد',         labelFr: 'Matériaux',       color: 'bg-amber-50 dark:bg-amber-950',   iconColor: 'text-amber-600' },
  { id: 'workforce',   icon: Users,        labelAr: 'اليد العاملة',   labelFr: 'Main-d\'œuvre',   color: 'bg-violet-50 dark:bg-violet-950', iconColor: 'text-violet-600' },
  { id: 'resources',   icon: Truck,        labelAr: 'المعدات',        labelFr: 'Équipements',     color: 'bg-orange-50 dark:bg-orange-950', iconColor: 'text-orange-600' },
  { id: 'tasks',       icon: CheckSquare,  labelAr: 'المهام',         labelFr: 'Tâches',          color: 'bg-rose-50 dark:bg-rose-950',    iconColor: 'text-rose-600' },
  { id: 'documents',   icon: FileText,     labelAr: 'الوثائق',        labelFr: 'Documents',       color: 'bg-cyan-50 dark:bg-cyan-950',    iconColor: 'text-cyan-600' },
  { id: 'gantt',       icon: BarChart3,    labelAr: 'التخطيط',        labelFr: 'Gantt',           color: 'bg-indigo-50 dark:bg-indigo-950', iconColor: 'text-indigo-600' },
] as const;

export default function ProjectDetailPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const { locale, id } = use(params);
  const isAr = locale === 'ar';
  const router = useRouter();

  const [project, setProject] = useState<ProjectWithJoins | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mobileSection, setMobileSection] = useState<string | null>(null);

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  const handleTabsScroll = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) {
      setScrollEdges({ left: false, right: false });
      return;
    }
    const isRtl = document.documentElement.dir === "rtl";
    const scrolled = isRtl ? maxScroll + el.scrollLeft : el.scrollLeft;
    setScrollEdges({
      left: scrolled > 4,
      right: scrolled < maxScroll - 4,
    });
  }, []);

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

  useEffect(() => { fetchProject(); }, [id, fetchProject]);

  useEffect(() => {
    if (!isLoading && project) requestAnimationFrame(handleTabsScroll);
  }, [isLoading, project, handleTabsScroll]);

  const getOptimizedImage = (url: string) => {
    if (!url.includes('supabase.co')) return url;
    return `${url}?width=800&quality=75&resize=contain`;
  };

  if (isLoading && !project) return <ProjectDetailSkeleton isAr={isAr} />;
  if (error || !project) return <ErrorState error={error} isAr={isAr} retry={() => fetchProject()} />;

  const activeSection = SECTIONS.find(s => s.id === mobileSection);

  return (
    <div className="space-y-3 md:space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300 md:duration-500 pb-6 md:pb-12" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ─── زر الرجوع ─── */}
      <Button
        variant="ghost"
        onClick={() => router.push('/projects')}
        className="gap-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold"
      >
        {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {isAr ? 'العودة إلى المشاريع' : 'Retour aux projets'}
      </Button>

      {/* ─── هيدر المشروع ─── */}
      <header className="bg-white dark:bg-slate-950 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {project.cover_image && (
          <div className="relative w-full h-48 md:h-72 lg:h-80 bg-slate-100">
            <Image
              src={getOptimizedImage(project.cover_image)}
              alt={project.name}
              fill
              priority
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 768px) 100vw, 1400px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:hidden" />
          </div>
        )}

        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-4">
            <div className="space-y-2 w-full">
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

          <div className="mt-4 md:mt-8 space-y-2">
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

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── الموبايل: شبكة الأقسام أو محتوى القسم ── */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        {!mobileSection ? (
          /* ── شبكة الأقسام ── */
          <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setMobileSection(section.id)}
                  className={`${section.color} rounded-2xl p-5 flex flex-col items-center gap-3 text-center active:scale-95 transition-all duration-200 border border-transparent active:border-slate-300 dark:active:border-slate-600 min-h-[110px]`}
                >
                  <div className={`p-2.5 rounded-xl bg-white/70 dark:bg-black/30 ${section.iconColor}`}>
                    <Icon className="w-6 h-6" strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                    {isAr ? section.labelAr : section.labelFr}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* ── محتوى القسم المحدد ── */
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">
            <div className="flex items-center justify-between">
              {activeSection && (
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${activeSection.color} ${activeSection.iconColor}`}>
                    <activeSection.icon className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {isAr ? activeSection.labelAr : activeSection.labelFr}
                  </h2>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileSection(null)}
                className="gap-2 text-xs font-bold rounded-xl"
              >
                {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                {isAr ? 'العودة للأقسام' : 'Retour aux sections'}
              </Button>
            </div>
            <SectionContent sectionId={mobileSection} project={project} isAr={isAr} onRefresh={() => fetchProject(true)} />
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── سطح المكتب: التبويبات الأفقية ── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full hidden md:block">
        <div className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md -mx-4 px-4 border-b border-slate-200 dark:border-slate-800">
          <div
            ref={tabsScrollRef}
            onScroll={handleTabsScroll}
            className="overflow-x-auto no-scrollbar scroll-smooth"
          >
            <TabsList className="w-auto justify-start h-14 p-0 bg-transparent rounded-none gap-6">
              {SECTIONS.map(section => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="relative h-14 min-w-0 shrink-0 rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-all px-2 text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400"
                >
                  {isAr ? section.labelAr : section.labelFr}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="pt-6">
          <TabsContent value="overview"><OverviewTab project={project} isAr={isAr} onRefresh={() => fetchProject(true)} /></TabsContent>
          <TabsContent value="tasks"><TaskBoardTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="daily-logs"><DailyLogsTab project={project} isAr={isAr} onRefresh={() => fetchProject(true)} /></TabsContent>
          <TabsContent value="metres"><MetresTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="work-attachments"><WorkAttachmentsTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="situations"><SituationsTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="gantt" className="min-h-[500px]"><ProjectGanttChart projectId={project.id} isAr={isAr} /></TabsContent>
          <TabsContent value="workforce"><WorkforceTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="resources"><EquipmentTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="materials"><MaterialsTab project={project} isAr={isAr} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab project={project} isAr={isAr} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ── مكوّن عرض محتوى القسم على الموبايل ──

function SectionContent({ sectionId, project, isAr, onRefresh }: {
  sectionId: string;
  project: ProjectWithJoins;
  isAr: boolean;
  onRefresh: () => void;
}) {
  switch (sectionId) {
    case 'overview':    return <OverviewTab project={project} isAr={isAr} onRefresh={onRefresh} />;
    case 'tasks':       return <TaskBoardTab project={project} isAr={isAr} />;
    case 'daily-logs':  return <DailyLogsTab project={project} isAr={isAr} onRefresh={onRefresh} />;
    case 'metres':      return <MetresTab project={project} isAr={isAr} />;
    case 'work-attachments': return <WorkAttachmentsTab project={project} isAr={isAr} />;
    case 'situations':  return <SituationsTab project={project} isAr={isAr} />;
    case 'materials':   return <MaterialsTab project={project} isAr={isAr} />;
    case 'workforce':   return <WorkforceTab project={project} isAr={isAr} />;
    case 'resources':   return <EquipmentTab project={project} isAr={isAr} />;
    case 'documents':   return <DocumentsTab project={project} isAr={isAr} />;
    case 'gantt':       return <div className="min-h-[500px]"><ProjectGanttChart projectId={project.id} isAr={isAr} /></div>;
    default:            return null;
  }
}

// ── سكيلتون ──

function ProjectDetailSkeleton({ isAr }: { isAr: boolean }) {
  return (
    <div className="space-y-3 md:space-y-6 max-w-[1400px] mx-auto p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Skeleton className="h-48 md:h-80 w-full rounded-2xl md:rounded-3xl" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-full rounded-full" />
      </div>
      {/* محاكاة الشبكة على الموبايل */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ── حالة الخطأ ──

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
