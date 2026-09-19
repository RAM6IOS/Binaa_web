"use client";

import React from "react";
import LinkNext from "next/link";
import { useParams } from "next/navigation";
import {
  Calendar,
  Users,
  Wrench,
  BarChart3,
  Bell,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Zap
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemsSolutionsSection } from "@/components/landing/ProblemsSolutionsSection";

export default function LandingPage() {
  const params = useParams();
  const locale = params.locale as string;
  const tFeatures = useTranslations("Landing.Features");
  const tWhy = useTranslations("Landing.WhyBinaa");
  const tTestimonials = useTranslations("Landing.Testimonials");
  const tCta = useTranslations("Landing.Cta");

  const features = [
    { icon: Calendar, color: "bg-primary/10 text-primary" },
    { icon: Users, color: "bg-success/10 text-success" },
    { icon: Wrench, color: "bg-warning/10 text-warning" },
    { icon: Smartphone, color: "bg-info/10 text-info" },
    { icon: BarChart3, color: "bg-destructive/10 text-destructive" },
    { icon: Bell, color: "bg-warning/10 text-warning" },
  ];

  const whyItems = [
    { icon: Zap },
    { icon: BarChart3 },
    { icon: Users },
    { icon: ShieldCheck },
  ];

  const testimonials = [
    { image: "/images/contractor_1.png" },
    { image: "/images/contractor_2.png" },
    { image: "/images/contractor_3.png" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* 1. Navbar */}
      <Navbar locale={locale} />

      {/* 2. Hero Section */}
      <HeroSection locale={locale} />

      {/* 3. Problems → Solutions */}
      <ProblemsSolutionsSection locale={locale} />

      {/* 4. Features Section */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              {tFeatures("heading")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {tFeatures("description")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <Card className="h-full border-border hover:border-primary/20 hover:shadow-sm transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 ${feature.color} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-foreground">{tFeatures(`items.${idx}.title`)}</h3>
                    <p className="text-muted-foreground leading-relaxed">{tFeatures(`items.${idx}.description`)}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Benefits / Why Binaa */}
      <section className="py-24 bg-inverse text-inverse-foreground overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-success rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-start">
              <h2 className="text-3xl md:text-5xl font-bold mb-8">{tWhy("heading")}</h2>
              <div className="space-y-8">
                {whyItems.map((item, idx) => (
                  <div key={idx} className="flex flex-row-reverse gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-inverse-foreground/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{tWhy(`items.${idx}.title`)}</h3>
                      <p className="text-inverse-foreground/60 leading-relaxed">{tWhy(`items.${idx}.description`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative lg:block hidden">
              <div className="border-2 border-primary p-1 rounded-lg">
                <div className="bg-inverse rounded-lg p-8 border border-inverse-foreground/10">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-inverse-foreground/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full" />
                        <div>
                          <p className="text-sm font-bold">{tWhy("demoCard.projectName")}</p>
                          <p className="text-xs text-inverse-foreground/60">{tWhy("demoCard.timeAgo")}</p>
                        </div>
                      </div>
                      <Badge className="bg-success/20 text-success border-none">{tWhy("demoCard.status")}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-inverse-foreground/5 p-4 rounded-lg">
                        <p className="text-xs text-inverse-foreground/60 mb-1">{tWhy("demoCard.progressLabel")}</p>
                        <p className="text-xl font-bold">75%</p>
                      </div>
                      <div className="bg-inverse-foreground/5 p-4 rounded-lg">
                        <p className="text-xs text-inverse-foreground/60 mb-1">{tWhy("demoCard.budgetLabel")}</p>
                        <p className="text-xl font-bold text-destructive">420.5M DA</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{tWhy("demoCard.planningLabel")}</span>
                        <span>{tWhy("demoCard.delayed")}</span>
                      </div>
                      <div className="w-full bg-inverse-foreground/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[70%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-background text-foreground p-6 rounded-lg shadow-sm border border-border flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-bold">{tWhy("demoCard.savedTitle")}</p>
                  <p className="text-xs text-muted-foreground">{tWhy("demoCard.savedDescription")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section id="testimonials" className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">{tTestimonials("heading")}</h2>
            <p className="text-lg text-muted-foreground">{tTestimonials("description")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <Card key={idx} className="border-border shadow-sm hover:shadow-sm transition-shadow">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="text-warning text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-foreground italic mb-8 leading-relaxed">"{tTestimonials(`items.${idx}.text`)}"</p>
                  <div className="flex items-center gap-4 flex-row-reverse">
                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                      <AvatarImage src={t.image} alt={tTestimonials(`items.${idx}.name`)} className="object-cover" />
                      <AvatarFallback>{tTestimonials(`items.${idx}.name`)[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-start">
                      <p className="font-bold text-foreground">{tTestimonials(`items.${idx}.name`)}</p>
                      <p className="text-xs text-muted-foreground">{tTestimonials(`items.${idx}.role`)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="bg-primary rounded-lg p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-success/20 rounded-full -ml-32 -mb-32 blur-3xl" />

            <div className="animate-scale-in relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                {tCta("heading")}
              </h2>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10 bg-background text-primary hover:bg-background/90 text-xl font-bold rounded-lg shadow-sm transition-all hover:scale-105" asChild>
                  <LinkNext href={`/${locale}/auth/register`}>
                    {tCta("register")}
                  </LinkNext>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 text-xl font-bold rounded-lg" asChild>
                  <LinkNext href={`/${locale}/contact`}>
                    {tCta("sales")}
                  </LinkNext>
                </Button>
              </div>
              <p className="mt-8 text-sm text-primary-foreground/70">
                {tCta("note")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <Footer locale={locale} />
    </div>
  );
}