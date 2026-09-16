"use client";

import React from "react";
import LinkNext from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface HeroSectionProps {
  locale: string;
}

export function HeroSection({ locale }: HeroSectionProps) {
  return (
    <section className="relative pt-24 pb-16 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 -z-10 w-full h-full">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-success/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up text-right">
            <BrandLogo size={64} className="mb-6" />
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium hover:bg-primary/20 transition-colors">
              مستقبل إدارة الإنشاءات في الجزائر 🇩🇿
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.2] text-foreground mb-6">
              <span className="block mb-2">سيّر مشروعك بذكاء</span>
              <span className="block text-3xl md:text-4xl lg:text-5xl font-bold text-muted-foreground">
                من البناء الخاص إلى <span className="text-primary font-bold">الأشغال العمومية</span>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl ml-auto">
              منصة جزائرية متكاملة تساعد المقاولين على متابعة المشاريع، العمال، والمعدات في الوقت الفعلي ومن أي مكان.
            </p>
            <div className="flex flex-col sm:flex-row-reverse gap-4 justify-start">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-lg rounded-lg shadow-sm group" asChild>
                <LinkNext href={`/${locale}/auth/register`}>
                  ابدأ تجربة مجانية
                  <ArrowLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </LinkNext>
              </Button>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 justify-end text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>لا يلزم بطاقة ائتمان</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>دعم فني 24/7</span>
              </div>
            </div>
          </div>

          <div className="animate-fade-in-right relative max-w-md mx-auto md:max-w-none">
            <div className="relative z-10 rounded-lg overflow-hidden shadow-sm border-8 border-background">
              <Image
                src="/images/hero_dashboard.jpg"
                alt="لوحة قيادة Binaa — إدارة مشاريع الإنشاءات"
                width={1360}
                height={768}
                className="w-full h-auto"
                priority
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-success/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;