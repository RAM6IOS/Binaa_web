"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  sectionDescription,
  sectionLabel,
  type ProjectSection,
  type SectionTone,
} from "@/lib/projects/sections";

/**
 * ألوان نبرة القسم — من الـ design tokens فقط (ممنوع أي لون خام).
 * كل نبرة = لون + أيقونة + نص، فلا تعتمد الإشارة على اللون وحده.
 */
const TONE_STYLES: Record<
  SectionTone,
  { iconWrap: string; arrow: string; hoverBorder: string }
> = {
  primary: {
    iconWrap: "bg-primary/10 text-primary",
    arrow: "text-primary",
    hoverBorder: "hover:border-primary",
  },
  info: {
    iconWrap: "bg-info/10 text-info",
    arrow: "text-info",
    hoverBorder: "hover:border-info",
  },
  warning: {
    iconWrap: "bg-warning/10 text-warning",
    arrow: "text-warning",
    hoverBorder: "hover:border-warning",
  },
  success: {
    iconWrap: "bg-success/10 text-success",
    arrow: "text-success",
    hoverBorder: "hover:border-success",
  },
  destructive: {
    iconWrap: "bg-destructive/10 text-destructive",
    arrow: "text-destructive",
    hoverBorder: "hover:border-destructive",
  },
};

type Props = {
  sections: ProjectSection[];
  isAr: boolean;
  /** يبني رابط صفحة القسم. لا رابط أصلاً بينما `disabled` (لا مشروع محدّد). */
  getHref: (section: ProjectSection) => string;
  /** إظهار البطاقات كغير مفعّلة — تبقى قابلة للنقر لشرح السبب. */
  disabled?: boolean;
  /** نص يظهر مكان الوصف بينما البطاقة معطّلة، لشرح سبب التعطيل. */
  disabledHint?: string;
  /** يُستدعى عند نقر بطاقة معطّلة — يعرض toast ويفتح قائمة المشاريع. */
  onBlocked?: () => void;
  className?: string;
};

/**
 * شبكة بطاقات أقسام المشروع — نقطة الدخول الوحيدة لأقسام أي مشروع.
 * كل بطاقة رابط حقيقي لصفحة القسم (حتى تُفضَّل مسبقاً على شبكة ضعيفة)،
 * أو زر معطّل بصرياً قبل اختيار مشروع.
 */
export function ProjectSectionGrid({
  sections,
  isAr,
  getHref,
  disabled = false,
  disabledHint,
  onBlocked,
  className,
}: Props) {
  const BackArrow = isAr ? ArrowRight : ArrowLeft;
  // رابط صالح فقط حين لا يوجد معرّف مشروع والبطاقة غير معطّلة.
  const linkable = !disabled ? getHref : null;

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const tone = TONE_STYLES[section.tone];
        const label = sectionLabel(section, isAr);
        const description = sectionDescription(section, isAr);

        const cardClassName = cn(
          "group flex h-full min-h-28 w-full flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 text-start shadow-sm",
          "transition-colors duration-200",
          disabled
            ? "cursor-pointer opacity-50"
            : cn("hover:bg-muted active:bg-muted", tone.hoverBorder)
        );

        const content = (
          <>
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                tone.iconWrap
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>

            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">{label}</span>
                {disabled ? null : (
                  <BackArrow
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                      tone.arrow
                    )}
                  />
                )}
              </span>
              <span className="line-clamp-2 block text-xs text-muted-foreground">
                {disabled && disabledHint ? disabledHint : description}
              </span>
            </span>
          </>
        );

        return (
          <li key={section.id}>
            {/*
              بطاقة معطّلة = لا رابط إطلاقاً (لو تركنا <Link> بلا مشروع لظهر
              href=/projects//metres بمعرّف فارغ)، ويبقى زراً قابلاً للنقر
              ليشعر العامل بالسبب بدل أن تتجاهله الشاشة بصمت.
            */}
            {linkable ? (
              <Link
                href={linkable(section)}
                aria-label={`${label} — ${description}`}
                className={cardClassName}
              >
                {content}
              </Link>
            ) : (
              <button
                type="button"
                aria-disabled={disabled || undefined}
                aria-label={`${label} — ${disabledHint ?? description}`}
                onClick={onBlocked}
                className={cardClassName}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
