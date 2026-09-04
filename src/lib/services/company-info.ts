import { Project } from "@/lib/types/projects";

// معلومات المقاولة المصدرة للوثيقة.
// المصدر الحقيقي الوحيد المتاح هو حقول company_* على المشروع (نفس النمط المعتمد في
// situations-service: البيانات تُحفظ عبر Snapshot في المشروع وتُستعمل في الوثائق الرسمية).
// إعدادات الشركة في التطبيق (mockSupabase.settings) ما زالت بيانات تجريبية ثابتة داخل الكود
// — تُستبعد عمداً من مستندات الإنتاج، فلها أولوية أقل ولا تُكتب في PDF.
// TODO(settings): عند إنشاء جدول company_settings حقيقي، اربطه هنا بعد بيانات المشروع.
export interface CompanyInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  rc?: string;
  nif?: string;
  nis?: string;
  ai?: string;
  logo_url?: string;
}

/** يعرض كل حقل موجود فقط، ويتجاوز الفارغ — لا يُكسَر الـ PDF بغياب أي حقل. */
export function resolveCompanyInfo(
  project?: Pick<
    Project,
    | "company_name"
    | "company_address"
    | "company_rc"
    | "company_nif"
    | "company_nis"
    | "company_article"
  >
): CompanyInfo {
  if (!project) return {};
  const clean = (v?: string) => (v && v.trim() !== "" ? v.trim() : undefined);
  return {
    name: clean(project.company_name),
    address: clean(project.company_address),
    rc: clean(project.company_rc),
    nif: clean(project.company_nif),
    nis: clean(project.company_nis),
    ai: clean(project.company_article),
  };
}