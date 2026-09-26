"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { projectsService } from "@/lib/services/projects-service";
import type { Project } from "@/lib/types/projects";
import { cn } from "@/lib/utils";

type Props = {
  /** معرّف المشروع المختار حالياً (فارغ = لم يُختر بعد). */
  currentProjectId: string;
  isAr: boolean;
  onChange: (projectId: string) => void;
  /** يبقى بعد إضافة/حذف مشروع، فتُعاد قراءة القائمة ليشمل المشروع الجديد. */
  refreshToken?: number;
  /** في وضع الموقع المبدّل هو الأداة الأساسية ⇒ نُبقيه مع مشروع واحد. */
  hideWhenSingle?: boolean;
  /** تُستدعى بالقائمة المقروءة فعلياً (لا بمعرّف من الرابط) للتحقق من وجود المشروع. */
  onProjectsLoaded?: (projects: Project[]) => void;
  /** أي تغيّر في هذا العدّاد يفتح القائمة — نداءً من صفحة "اختر مشروعاً" دون hijack للتركيز. */
  openSignal?: number;
  className?: string;
};

/**
 * قائمة تبديل المشروع.
 * تُحمَّل من projectsService.getAll() وهي مرشَّحة بـ RLS على الشركة الحالية،
 * ونضيف فوقها فلترة company_id دفاعاً في العمق.
 *
 * الأسماء الطويلة تُقصّ (truncate) مع `title` يعرض الاسم الكامل عند المرور
 * بالفأرة، وعرض القائمة محدود بـ max-w حتى لا تتمدّد على عرض الشاشة.
 */
export function ProjectSwitcher({
  currentProjectId,
  isAr,
  onChange,
  refreshToken = 0,
  hideWhenSingle = true,
  onProjectsLoaded,
  openSignal = 0,
  className,
}: Props) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const retry = useCallback(() => {
    setProjects(null);
    setHasError(false);
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHasError(false);
    projectsService
      .getAll()
      .then((list) => {
        if (cancelled) return;
        const current = list.find((project) => project.id === currentProjectId);
        // لا نُظهر مشروعاً من شركة أخرى حتى لو أعادته الاستجابة.
        const scoped = list.filter(
          (project) => !current?.company_id || project.company_id === current.company_id
        );
        setProjects(scoped);
        onProjectsLoaded?.(scoped);
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
        setHasError(true);
      });
    return () => {
      cancelled = true;
    };
    // onProjectsLoaded يمرَّر من المُنشئ كدالة مستقرة (useCallback)،
    // فلا داعي لإعادة تحميل القائمة على كل رسم.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, refreshToken, reloadToken]);

  // طلب فتح القائمة قادم من خارج المكوّن (نقرة بطاقة بلا مشروع محدّد).
  useEffect(() => {
    if (openSignal > 0) setIsOpen(true);
  }, [openSignal]);

  if (projects === null) {
    return <Skeleton className="h-11 w-56 rounded-md md:w-64" />;
  }

  // فشل الشبكة ≠ "لا مشاريع": نُظهر خطأً مع إعادة محاولة صريحة،
  // لأنقاع الجوّال في الموقع قد ينقطع في أي لحظة.
  if (hasError) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={retry}
        className={cn("h-11 gap-2 md:h-10", className)}
        aria-label={isAr ? "إعادة تحميل قائمة المشاريع" : "Recharger la liste des projets"}
      >
        <AlertTriangle className="h-4 w-4 text-destructive" />
        {isAr ? "تعذّر التحميل — إعادة المحاولة" : "Échec du chargement — Réessayer"}
      </Button>
    );
  }

  if (projects.length <= 1 && hideWhenSingle) {
    return null;
  }

  const hasProjects = projects.length > 0;
  const selectedProject = projects.find((project) => project.id === currentProjectId);
  const emptyLabel = isAr ? "لا توجد مشاريع بعد" : "Aucun projet pour l'instant";
  const placeholder = isAr ? "اختيار المشروع" : "Choisir un projet";
  // الاسم الكامل في title ⇒ يُقرأ عند hover على الأسماء المقصوصة.
  const triggerTitle = selectedProject?.name ?? (hasProjects ? placeholder : emptyLabel);

  return (
    <Select
      open={isOpen}
      onOpenChange={setIsOpen}
      value={currentProjectId || undefined}
      onValueChange={onChange}
      disabled={!hasProjects}
    >
      <SelectTrigger
        title={triggerTitle}
        className={cn(
          "h-11 max-w-64 min-w-0 md:h-10",
          !hasProjects && "w-56",
          className
        )}
        aria-label={isAr ? "تبديل المشروع" : "Changer de projet"}
      >
        {hasProjects ? (
          <SelectValue placeholder={placeholder} />
        ) : (
          <span className="truncate text-muted-foreground">{emptyLabel}</span>
        )}
      </SelectTrigger>
      <SelectContent className="max-w-80">
        {projects.map((project) => (
          <SelectItem
            key={project.id}
            value={project.id}
            title={project.name}
            className="min-w-0 py-3 [&>span]:min-w-0"
          >
            <span className="flex min-w-0 flex-col items-start">
              <span className="w-full truncate font-medium">{project.name}</span>
              <span className="w-full truncate text-xs text-muted-foreground">
                {project.wilaya} · {project.contract_number || "—"}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
