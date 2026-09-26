"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Info, LayoutGrid, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { ProjectSectionGrid } from "@/components/projects/ProjectSectionGrid";
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher";
import { useRouter } from "@/i18n/routing";
import { useCan } from "@/hooks/use-can";
import type { Project } from "@/lib/types/projects";
import {
  PROJECT_QUERY_PARAM,
  projectSiteHref,
  sectionPageHref,
  visibleProjectSections,
} from "@/lib/projects/sections";

type Props = { isAr: boolean };

/** معامل جدول المحفظة (الوضع الثانوي) في /projects. */
const TABLE_VIEW_PARAM = "view";

/**
 * وضع الموقع — الواجهة الأولى والوحيدة لإدخال المشاريع.
 *
 * المشروع المختار يعيش في `?project=` (مصدر الحقيقة الوحيد) بعد أن يُقابَل
 * بمشروع حُمِّل فعلاً من projectsService، فيتبع زرّا الرجوع/التالي تلقائياً،
 * ولا تُفعَّل البطاقات بمعرّف مكتوب يدوياً أو لمشروع محذوف.
 */
export function ProjectsSiteHub({ isAr }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const { can } = useCan();

  const canManageProjects = can("manage_projects");
  const sections = visibleProjectSections(can);

  const [loadedProjects, setLoadedProjects] = useState<Project[]>([]);
  const [switcherRefreshToken, setSwitcherRefreshToken] = useState(0);
  const [openSignal, setOpenSignal] = useState(0);

  const requestedProjectId = searchParams.get(PROJECT_QUERY_PARAM);
  const currentProject =
    loadedProjects.find((project) => project.id === requestedProjectId) ?? null;
  const currentProjectId = currentProject?.id ?? "";
  const hasProject = currentProject !== null;

  const handleProjectsLoaded = useCallback((list: Project[]) => {
    setLoadedProjects(list);
  }, []);

  const selectProject = useCallback(
    (projectId: string) => {
      // تحديث العنوان على نفس المسار: بلا إعادة جلب من الشبكة (قد تكون
      // ضعيفة في الموقع) وبلا فقد لترشّحات الأقسام، وuseSearchParams
      // يلتقط التغيير ⇒ الاختيار يبقى متزامناً مع العنوان.
      //
      // البادئة تُبنى من useLocale لا من projectSiteHref وحده، لأن
      // localePrefix=always وبوابة الروابط بلا لغة ⇒ كان العنوان يخرج
      // من /fr/projects إلى /projects (رابط غير قابل للمشاركة كما هو).
      window.history.pushState(
        null,
        "",
        `/${locale}${projectSiteHref(projectId)}`
      );
    },
    [locale]
  );

  // نقرة على بطاقة بلا مشروع: لا تنقّل، بل تشرح وتوجّه إلى قائمة الاختيار.
  const handleBlockedClick = useCallback(() => {
    toast.info(
      isAr
        ? "اختر مشروعاً أولاً من القائمة أعلاه"
        : "Choisissez d'abord un projet dans la liste ci-dessus"
    );
    setOpenSignal((signal) => signal + 1);
  }, [isAr]);

  const openTableView = useCallback(() => {
    router.push(`/projects?${TABLE_VIEW_PARAM}=table`);
  }, [router]);

  const headerDescription = currentProject
    ? `${currentProject.name}${currentProject.wilaya ? ` · ${currentProject.wilaya}` : ""}`
    : isAr
      ? "أقسام المشاريع"
      : "Sections des projets";

  return (
    <PageContainer
      dir={isAr ? "rtl" : "ltr"}
      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
      header={{
        title: isAr ? "الموقع" : "Mode site",
        description: headerDescription,
        actions: (
          <>
            <ProjectSwitcher
              currentProjectId={currentProjectId}
              isAr={isAr}
              onChange={selectProject}
              refreshToken={switcherRefreshToken}
              onProjectsLoaded={handleProjectsLoaded}
              hideWhenSingle={false}
              openSignal={openSignal}
            />
            {canManageProjects ? (
              <CreateProjectDialog
                isAr={isAr}
                onSuccess={() => setSwitcherRefreshToken((token) => token + 1)}
              />
            ) : null}
          </>
        ),
      }}
    >
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight md:text-xl">
            <LayoutGrid className="h-5 w-5" />
            {isAr ? "أقسام المشروع" : "Sections du projet"}
          </h2>
          {currentProject ? (
            <div className="flex items-center gap-3">
              {currentProject.wilaya ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {currentProject.wilaya}
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={openTableView}
                className="h-11 gap-2 text-xs font-bold md:h-10"
              >
                {isAr ? "عرض محفظة المشاريع كجدول" : "Voir la portfolio en tableau"}
              </Button>
            </div>
          ) : null}
        </div>

        {!hasProject ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            {isAr
              ? "اختر مشروعاً من القائمة أعلاه لتفعيل الأقسام."
              : "Choisissez un projet dans la liste ci-dessus pour activer les sections."}
          </p>
        ) : null}

        <ProjectSectionGrid
          sections={sections}
          isAr={isAr}
          disabled={!hasProject}
          disabledHint={isAr ? "اختر مشروعاً أولاً" : "Choisissez d'abord un projet"}
          onBlocked={handleBlockedClick}
          getHref={(section) => sectionPageHref(currentProjectId, section)}
        />
      </section>
    </PageContainer>
  );
}
