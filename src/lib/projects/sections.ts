/**
 * سجل أقسام المشروع — المصدر الوحيد.
 *
 * كل ما يخص ترتيب/تسمية/تبديل ألوان بطاقات الأقسام يأتي من هنا، حتى لا
 * تتفرّق بين الشبكة (ProjectSectionGrid) والمحتوى (ProjectSectionContent).
 * إضافة قسم جديد = سطر واحد هنا + حالة في ProjectSectionContent.
 */

import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  Eye,
  FileText,
  Landmark,
  Package,
  Ruler,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type SectionTone = "primary" | "info" | "warning" | "success" | "destructive";

export type ProjectSectionId =
  | "overview"
  | "daily-logs"
  | "metres"
  | "work-attachments"
  | "situations"
  | "tasks"
  | "gantt"
  | "workforce"
  | "resources"
  | "materials"
  | "orders"
  | "documents";

export type ProjectSection = {
  id: ProjectSectionId;
  icon: LucideIcon;
  tone: SectionTone;
  labelAr: string;
  labelFr: string;
  descAr: string;
  descFr: string;
  /**
   * صلاحية مطلوبة لعرض القسم.
   * ملاحظة أمنية: إخفاء البطاقة لا يكفي — يجب إعادة الفحص عند العرض لأن
   * معامل `?section=` مكتوب من المستخدم ويمكن تزويره يدوياً.
   */
  requiresPermission?: Permission;
  /**
   * مقطع المسار الخاص بالقسم في `/projects/[id]/<segment>`.
   * معظم الأقسام تُخدَم بمسار موحّد (= معرّف القسم)، وبعضها له صفحة
   * قائمة بالفعل: `daily-logs` و`planning` (المخطط الزمني gantt ⇒ planning).
   */
  fullPageHref?: string;
};

/** ترتيب ميداني: التوثيق اليومي أولاً، ثم الكميات والوضعيات، ثم التخطيط، ثم الموارد. */
export const PROJECT_SECTIONS: readonly ProjectSection[] = [
  {
    id: "overview",
    icon: Eye,
    tone: "primary",
    labelAr: "نظرة عامة",
    labelFr: "Vue d'ensemble",
    descAr: "حالة المشروع ونسب التقدم وملخص عام",
    descFr: "Statut, avancement et résumé du chantier",
  },
  {
    id: "daily-logs",
    icon: ClipboardList,
    tone: "warning",
    labelAr: "السجل اليومي",
    labelFr: "Journal de bord",
    descAr: "تقرير يومي: العمل المنجز، الحضور، الطقس والصور",
    descFr: "Rapport quotidien : travaux, présence, météo, photos",
    fullPageHref: "daily-logs",
  },
  {
    id: "metres",
    icon: Ruler,
    tone: "success",
    labelAr: "الكميات",
    labelFr: "Métrés",
    descAr: "قياس أعمال الجسات ومتابعة الكميات المنجزة",
    descFr: "Relevé des quantités de travaux",
  },
  {
    id: "work-attachments",
    icon: FileText,
    tone: "info",
    labelAr: "محاضر القيس",
    labelFr: "Attachements",
    descAr: "محاضر تسوية الكميات والقيس مع المالك",
    descFr: "Attachements de décompte des quantités",
    requiresPermission: "manage_finance",
  },
  {
    id: "situations",
    icon: Landmark,
    tone: "success",
    labelAr: "الوضعيات",
    labelFr: "Situations",
    descAr: "الوضعية الشهرية ومبالغ التسديد للمالك",
    descFr: "Situations mensuelles et décomptes",
    requiresPermission: "manage_finance",
  },
  {
    id: "tasks",
    icon: CheckSquare,
    tone: "destructive",
    labelAr: "المهام",
    labelFr: "Tâches",
    descAr: "لوحة المهام: من ينفّذ ماذا ومتى وبأي نسبة إنجاز",
    descFr: "Tableau des tâches : qui fait quoi et quand",
  },
  {
    id: "gantt",
    icon: BarChart3,
    tone: "info",
    labelAr: "التخطيط الزمني",
    labelFr: "Planning (Gantt)",
    descAr: "مخطط زمني للمراحل وتواريخ البدء والانتهاء",
    descFr: "Diagramme de Gantt des phases",
    fullPageHref: "planning",
  },
  {
    id: "workforce",
    icon: Users,
    tone: "info",
    labelAr: "اليد العاملة والحضور",
    labelFr: "Main-d'œuvre et pointage",
    descAr: "توزيع العمال على الورشة وتسجيل الحضور",
    descFr: "Affectation des ouvriers et suivi du pointage",
  },
  {
    id: "resources",
    icon: Truck,
    tone: "warning",
    labelAr: "المعدات",
    labelFr: "Équipements",
    descAr: "المعدات المخصّصة والصيانة ومؤشرات الاستغلال",
    descFr: "Engins affectés, maintenance et utilisation",
  },
  {
    id: "materials",
    icon: Package,
    tone: "warning",
    labelAr: "المواد",
    labelFr: "Matériaux",
    descAr: "مواد البناء المستهلكة ومخزون الورشة",
    descFr: "Matériaux consommés et stock du chantier",
  },
  {
    id: "orders",
    icon: ShoppingCart,
    tone: "info",
    labelAr: "أوامر الطلب",
    labelFr: "Bons de commande",
    descAr: "أوامر الشراء والموردون وكميات التوريد",
    descFr: "Bons de commande, fournisseurs et livraisons",
  },
  {
    id: "documents",
    icon: FileText,
    tone: "info",
    labelAr: "الوثائق",
    labelFr: "Documents",
    descAr: "ملفات المشروع: عقود، دراسات، صور ومخططات",
    descFr: "Marchés, études, plans et photos",
  },
];

/** تسمية القسم حسب اللغة. */
export function sectionLabel(section: ProjectSection, isAr: boolean): string {
  return isAr ? section.labelAr : section.labelFr;
}

/** وصف مختصر للقسم حسب اللغة. */
export function sectionDescription(section: ProjectSection, isAr: boolean): string {
  return isAr ? section.descAr : section.descFr;
}

/** اسم المقطع في المسار `/projects/[id]/<segment>`. */
export function sectionRouteSegment(section: ProjectSection): string {
  return section.fullPageHref ?? section.id;
}

/**
 * رابط صفحة القسم الكاملة: نقطة الدخول من بطاقات وضع الموقع.
 * نفس المسار لكل الأقسام ⇒ تنقّل مفضّل (prefetch) أسرع.
 */
export function sectionPageHref(projectId: string, section: ProjectSection): string {
  return `/projects/${projectId}/${sectionRouteSegment(section)}`;
}

/**
 * معامل الـURL الذي يحمل المشروع المختار في وضع الموقع.
 * هذا المعامل هو **مصدر الحقيقة الوحيد** لاختيار المشروع: يُقرأ من
 * `?project=` ويُقابَل بمشروع حُمِّل فعلاً، فيتبع زرَّي الرجوع/التالي
 * تلقائياً، ولا يُقبل منهج اكتفاء أي قيمة مكتوبة يدوياً.
 */
export const PROJECT_QUERY_PARAM = "project";

/** رابط وضع الموقع لمشروع بعينه. */
export function projectSiteHref(projectId: string): string {
  return `/projects?${PROJECT_QUERY_PARAM}=${encodeURIComponent(projectId)}`;
}

/** أقسام المشروع الظاهرة لمستخدم بعينه (بعد فحص الصلاحيات). */
export function visibleProjectSections(
  can: (permission: Permission) => boolean
): ProjectSection[] {
  return PROJECT_SECTIONS.filter(
    (section) => !section.requiresPermission || can(section.requiresPermission)
  );
}

/**
 * يحلّ مقطع المسار `/projects/[id]/<segment>` إلى قسم.
 * مدخل المستخدم (غير موثوق) ⇒ يُطابَق حرفياً مع مقاطع السجل فقط،
 * وأي قيمة أخرى تُرجع null ليُرجع المسار 404.
 */
export function resolveProjectSectionBySegment(
  segment: string | null | undefined,
  can: (permission: Permission) => boolean
): ProjectSection | null {
  if (!segment) return null;
  const section = PROJECT_SECTIONS.find(
    (candidate) => sectionRouteSegment(candidate) === segment
  );
  if (!section) return null;
  if (section.requiresPermission && !can(section.requiresPermission)) return null;
  return section;
}
