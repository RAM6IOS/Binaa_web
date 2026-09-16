"use client";

import React from "react";
import LinkNext from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Clock,
  Files,
  Layers,
  MessageSquare,
  RefreshCw,
  Users,
  type LucideIcon,
} from "lucide-react";
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
  problemHeadline: string;
  problemDesc: string;
  problemPoints?: PointData[];
  solutionTitle: string;
  solutionDesc: string;
  solutionPoints?: PointData[];
  visual: React.ReactNode;
}

function ProblemSolutionCard({ card, delay }: { card: CardData; delay: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className="grid lg:grid-cols-2">
        {/* ── المشكلة ── */}
        <div className="bg-muted/40 p-6 md:p-8 flex flex-col min-w-0">
          <Badge variant="warning" className="self-start gap-1.5 px-3 py-1 mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            المشكلة
          </Badge>
          <h3 className="text-xl font-bold text-foreground mb-2">{card.problemHeadline}</h3>
          <p className="text-muted-foreground leading-relaxed">{card.problemDesc}</p>

          {/* انتقال رأسي على الموبايل: المشكلة → الحل */}
          <div className="lg:hidden flex justify-center pt-6">
            <div className="w-10 h-10 rounded-full border border-border bg-background shadow-sm flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* ── الحل في Binaa ── */}
        <div className="bg-background p-6 md:p-8 flex flex-col min-w-0">
          <Badge variant="success" className="self-start gap-1.5 px-3 py-1 mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            الحل في Binaa
          </Badge>
          <h3 className="text-xl font-bold text-foreground mb-2">{card.solutionTitle}</h3>
          <p className="text-muted-foreground leading-relaxed mb-6">{card.solutionDesc}</p>
          <div className="flex-1 flex items-end min-w-0">{card.visual}</div>
        </div>
      </div>

      {/* انتقال أفقي على الديسكتوب: المشكلة → الحل */}
      <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border border-border bg-background shadow-sm items-center justify-center z-10">
        <ArrowLeft className="w-5 h-5 text-primary" />
      </div>
    </div>
  );
}

interface ProblemsSolutionsSectionProps {
  locale: string;
}

export function ProblemsSolutionsSection({ locale }: ProblemsSolutionsSectionProps) {
  const cards: CardData[] = [
    {
      problemHeadline: "المعلومات موزعة بين Excel وWhatsApp والورق",
      problemDesc:
        "تضيع المعلومات بين الملفات والرسائل، ويصعب الوصول إلى آخر نسخة من بيانات المشروع.",
      solutionTitle: "مساحة عمل موحدة للمشروع",
      solutionDesc:
        "يجمع Binaa المشاريع والمهام والتقارير والوثائق والفرق في مكان واحد.",
      visual: <DashboardWorkspaceVisual />,
    },
    {
      problemHeadline: "صعوبة معرفة ما تم إنجازه فعليًا في الموقع",
      problemDesc:
        "لا توجد رؤية يومية واضحة للأعمال المنجزة والتقدم الحقيقي داخل chantier.",
      solutionTitle: "Rapports Journaliers + Planning + Métrés",
      solutionDesc:
        "سجّل الأعمال اليومية واربطها بالمهام والكميات والتقدم الفعلي للمشروع.",
      visual: <DailyLogsPreview />,
    },
    {
      problemHeadline: "متابعة العمال والمعدات والمواد تتم يدويًا",
      problemDesc:
        "يصعب معرفة الحضور، الموارد المستعملة، واستهلاك المواد داخل كل مشروع.",
      solutionTitle: "Main-d'œuvre + Équipements + Matériaux",
      solutionDesc:
        "تابع فرق العمل والمعدات والمواد داخل سياق المشروع، مع رؤية أوضح للموارد والتكاليف.",
      visual: <WorkforcePreview />,
    },
    {
      problemHeadline: "أخطاء في حساب المترّات والـAttachements والـSituations",
      problemDesc:
        "تتطلب الحسابات الدورية وقتًا كبيرًا، وقد تحدث أخطاء عند تجميع الكميات والمبالغ.",
      solutionTitle: "Métrés + Attachements + Situations des Travaux",
      solutionDesc:
        "حدد فترة العمل، استخرج الكميات، واحسب السابق والحالي والتراكمي والباقي والمبالغ بطريقة منظمة.",
      visual: <MetresPreview />,
    },
  ];

  return (
    <section id="problems-solutions" className="py-24 bg-muted/40 border-y border-border">
      <div className="container mx-auto px-4 md:px-8">
        {/* مقدمة القسم */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 animate-fade-in-up">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium">
            تحديات chantier اليومية
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            من مشاكل chantier اليومية إلى متابعة منظمة
          </h2>
          <p className="text-lg text-muted-foreground">
            يجمع Binaa عمليات المشروع في مكان واحد، من التخطيط والتقارير اليومية إلى
            المترّات والـAttachements والـSituations des Travaux.
          </p>
        </div>

        {/* البطاقات */}
        <div className="space-y-8 md:space-y-12">
          {cards.map((card, idx) => (
            <ProblemSolutionCard key={idx} card={card} delay={`${idx * 0.1}s`} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 md:mt-24 text-center animate-fade-in-up">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-10">
              شاهد كيف يمكن لـBinaa تنظيم مشروعك
            </h2>
            <div className="flex flex-col sm:flex-row-reverse gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-lg shadow-sm group" asChild>
                <LinkNext href={`/${locale}/auth/register`}>
                  ابدأ تجربة مجانية
                  <ArrowLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </LinkNext>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-lg border-border hover:bg-muted" asChild>
                <LinkNext href="/#features">
                  شاهد المنصة في العمل
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