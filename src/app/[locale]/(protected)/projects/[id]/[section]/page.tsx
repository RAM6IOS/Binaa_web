"use client";

import { use } from "react";
import { ProjectSectionPage } from "../components/ProjectSectionPage";

/**
 * صفحة قسم داخل مشروع — تخدم كل الأقسام التي لا تملك صفحة مخصّصة قائمة
 * (daily-logs وplanning لهما مسارات ساكنة ثابتة تسبق هذا المسار).
 * `segment` من المستخدم ⇒ يُطابَق مع سجل الأقسام داخل المكوّن قبل أي تحميل.
 */
export default function ProjectSectionRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string; section: string }>;
}) {
  const { locale, id, section } = use(params);

  return <ProjectSectionPage isAr={locale === "ar"} projectId={id} segment={section} />;
}
