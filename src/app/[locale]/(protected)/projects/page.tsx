"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectsSiteHub } from "./components/ProjectsSiteHub";
import { ProjectsTableView } from "./components/ProjectsTableView";

/** معامل الجدول في /projects — الوضع الثانوي. */
const TABLE_VIEW_PARAM = "view";
const TABLE_VIEW_VALUE = "table";

function ProjectsViewSwitch({ isAr }: { isAr: boolean }) {
  const searchParams = useSearchParams();
  const isTableView = searchParams.get(TABLE_VIEW_PARAM) === TABLE_VIEW_VALUE;

  return isTableView ? <ProjectsTableView isAr={isAr} /> : <ProjectsSiteHub isAr={isAr} />;
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

/**
 * مُوجِّه /projects.
 *
 * الوضع الافتراضي = وضع الموقع (Site Mode): إضافة مشروع، تبديل مشروع،
 * وشبكة أقسام تفتح صفحات الأقسام الحقيقية.
 * محفظة المشاريع (الجدول) ما زالت موجودة لكن على بُعد ?view=table.
 */
export default function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";

  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsViewSwitch isAr={isAr} />
    </Suspense>
  );
}
