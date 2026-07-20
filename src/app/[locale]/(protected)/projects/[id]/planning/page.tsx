"use client";

import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { projectsService } from "@/lib/services/projects-service";
import { Project } from "@/lib/types/projects";
import { GanttChart } from "../components/GanttChart";

interface PageParams {
  locale: string;
  id: string;
}

export default function PlanningPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, id: projectId } = use(params);
  const isAr = locale === "ar";
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsService.getById(projectId);
      setProject(data as Project);
    } catch (err: any) {
      setError(err?.message || (isAr ? "حدث خطأ في تحميل بيانات المشروع" : "Erreur de chargement"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <Calendar className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">
          {isAr ? "جاري تحميل تفاصيل التخطيط..." : "Chargement du planning..."}
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-6 p-6 text-center">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{isAr ? "حدث خطأ" : "Une erreur est survenue"}</h2>
          <p className="text-slate-500 text-sm max-w-md">{error || (isAr ? "المشروع غير موجود" : "Projet introuvable")}</p>
        </div>
        <Button onClick={fetchProject} className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          {isAr ? "إعادة المحاولة" : "Réessayer"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push(`/projects/${projectId}`)}
        className="gap-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold"
      >
        {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {isAr ? "العودة إلى المشروع" : "Retour au projet"}
      </Button>

      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-blue-700 via-indigo-600 to-violet-500 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 w-32 h-32 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {isAr ? "التخطيط الزمني (Gantt Chart)" : "Timeline Planning"}
                </h1>
                <p className="text-blue-100 text-sm mt-0.5 font-medium">
                  {project.name} · {project.wilaya}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart component */}
      <GanttChart projectId={projectId} isAr={isAr} />
    </div>
  );
}
