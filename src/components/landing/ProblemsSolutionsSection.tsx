"use client";

import React from "react";
import LinkNext from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DashboardWorkspaceVisual,
  DailyLogsPreview,
  WorkforcePreview,
  MetresPreview,
} from "./ProblemsSolutionsPreviews";

interface PointData {
  icon: LucideIcon;
  text: string;
}

interface CardData {
  problemLabel: string;
  problemHeadline: string;
  problemDesc: string;
  problemPoints?: PointData[];
  solutionLabel: string;
  solutionTitle: string;
  solutionDesc: string;
  solutionPoints?: PointData[];
  visual: React.ReactNode;
}

function ProblemSolutionCard({ card, delay, isAr }: { card: CardData; delay: string; isAr: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className="grid lg:grid-cols-2">
        <div className="bg-muted/40 p-6 md:p-8 flex flex-col min-w-0">
          <Badge variant="warning" className="self-start gap-1.5 px-3 py-1 mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            {card.problemLabel}
          </Badge>
          <h3 className="text-xl font-bold text-foreground mb-2">{card.problemHeadline}</h3>
          <p className="text-muted-foreground leading-relaxed">{card.problemDesc}</p>

          <div className="lg:hidden flex justify-center pt-6">
            <div className="w-10 h-10 rounded-full border border-border bg-background shadow-sm flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-background p-6 md:p-8 flex flex-col min-w-0">
          <Badge variant="success" className="self-start gap-1.5 px-3 py-1 mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {card.solutionLabel}
          </Badge>
          <h3 className="text-xl font-bold text-foreground mb-2">{card.solutionTitle}</h3>
          <p className="text-muted-foreground leading-relaxed mb-6">{card.solutionDesc}</p>
          <div className="flex-1 flex items-end min-w-0">{card.visual}</div>
        </div>
      </div>

      <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border border-border bg-background shadow-sm items-center justify-center z-10">
        {isAr ? <ArrowLeft className="w-5 h-5 text-primary" /> : <ArrowRight className="w-5 h-5 text-primary" />}
      </div>
    </div>
  );
}

interface ProblemsSolutionsSectionProps {
  locale: string;
}

export function ProblemsSolutionsSection({ locale }: ProblemsSolutionsSectionProps) {
  const t = useTranslations("Landing.ProblemsSolutions");
  const isAr = useLocale() === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const arrowHover = isAr ? "group-hover:-translate-x-1" : "group-hover:translate-x-1";

  const visuals = [
    <DashboardWorkspaceVisual key="dw" />,
    <DailyLogsPreview key="dl" />,
    <WorkforcePreview key="wp" />,
    <MetresPreview key="mp" />,
  ];

  const cards: CardData[] = visuals.map((visual, idx) => ({
    problemLabel: t("problemLabel"),
    solutionLabel: t("solutionLabel"),
    problemHeadline: t(`cards.${idx}.problemHeadline`),
    problemDesc: t(`cards.${idx}.problemDesc`),
    solutionTitle: t(`cards.${idx}.solutionTitle`),
    solutionDesc: t(`cards.${idx}.solutionDesc`),
    visual,
  }));

  return (
    <section id="problems-solutions" className="py-24 bg-muted/40 border-y border-border">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 animate-fade-in-up">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t("heading")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("intro")}
          </p>
        </div>

        <div className="space-y-8 md:space-y-12">
          {cards.map((card, idx) => (
            <ProblemSolutionCard key={idx} card={card} delay={`${idx * 0.1}s`} isAr={isAr} />
          ))}
        </div>

        <div className="mt-16 md:mt-24 text-center animate-fade-in-up">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-10">
              {t("ctaHeading")}
            </h2>
            <div className="flex justify-center">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-lg shadow-sm group" asChild>
                <LinkNext href={`/${locale}/auth/register`}>
                  {t("ctaButton")}
                  <Arrow className={`me-2 w-5 h-5 ${arrowHover} transition-transform`} />
                </LinkNext>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProblemsSolutionsSection;