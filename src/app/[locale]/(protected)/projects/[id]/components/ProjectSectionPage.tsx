"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataState } from "@/components/ui/data-state";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher";
import { projectsService } from "@/lib/services/projects-service";
import { useCan } from "@/hooks/use-can";
import { Link, useRouter } from "@/i18n/routing";
import {
  projectSiteHref,
  resolveProjectSectionBySegment,
  sectionLabel,
  sectionPageHref,
} from "@/lib/projects/sections";
import { ProjectSectionContent, type ProjectWithJoins } from "./ProjectSectionContent";

type Props = {
  isAr: boolean;
  projectId: string;
  segment: string;
};

/**
 * صفحة قسم مستقلة: /projects/[id]/<segment>
 *
 * هذه هي الوجهة التي تفتحها بطاقة القسم في وضع الموقع، فالرابط قابل
 * للمشاركة ويفتح مباشرةً على القسم وحده.
 */
export function ProjectSectionPage({ isAr, projectId, segment }: Props) {
  const router = useRouter();
  const { can } = useCan();
  const canManageProjects = can("manage_projects");

  const [project, setProject] = useState<ProjectWithJoins | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // مدخل غير موثوق ⇒ يُطابَق مع مقاطع السجل فقط، وأي قيمة أخرى أو نقص
  // صلاحية يعطي "غير متاح" بدل تحميل بيانات.
  const activeSection = resolveProjectSectionBySegment(segment, can);

  const loadProject = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await projectsService.getById(projectId);
      if (!data) {
        setHasError(true);
        return;
      }
      setProject({
        ...data,
        project_documents: [],
        tasks: [],
      } as ProjectWithJoins);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject, reloadToken]);

  const handleRefresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  if (!activeSection) {
    return (
      <PageContainer dir={isAr ? "rtl" : "ltr"}>
        <DataState.Empty
          title={isAr ? "القسم غير متاح" : "Section indisponible"}
          description={
            isAr
              ? "هذا القسم غير موجود أو لا تملك صلاحية الوصول إليه."
              : "Cette section n'existe pas ou vous n'avez pas l'accès."
          }
          action={
            <Button variant="outline" asChild className="h-11 gap-2 md:h-10">
              <Link href="/projects">
                <BackArrow className="h-4 w-4" />
                {isAr ? "العودة إلى وضع الموقع" : "Retour au mode site"}
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      dir={isAr ? "rtl" : "ltr"}
      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
      header={{
        title: sectionLabel(activeSection, isAr),
        description: isAr
          ? `مشروع ${project?.name ?? "…"}`
          : `Projet ${project?.name ?? "…"}`,
        actions: (
          <>
            <ProjectSwitcher
              currentProjectId={projectId}
              isAr={isAr}
              onChange={(nextProjectId) =>
                router.push(sectionPageHref(nextProjectId, activeSection))
              }
              hideWhenSingle={false}
            />
            <Button variant="outline" asChild className="h-11 gap-2 md:h-10">
              <Link href={projectSiteHref(projectId)}>
                <BackArrow className="h-4 w-4" />
                {isAr ? "وضع الموقع" : "Mode site"}
              </Link>
            </Button>
          </>
        ),
      }}
    >
      {isLoading ? (
        <DataState.Loading rows={4} />
      ) : hasError || !project ? (
        <DataState.Error
          title={isAr ? "تعذّر تحميل بيانات المشروع" : "Erreur de chargement du projet"}
          message={
            isAr
              ? "تحقّق من الاتصال ثم أعد المحاولة."
              : "Vérifiez la connexion, puis réessayez."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Réessayer"}
          onRetry={handleRefresh}
        />
      ) : (
        <ProjectSectionContent
          sectionId={activeSection.id}
          project={project}
          isAr={isAr}
          canManageProjects={canManageProjects}
          onRefresh={handleRefresh}
        />
      )}
    </PageContainer>
  );
}
