"use client";

import React from "react";
import LinkNext from "next/link";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemsSolutionsSection } from "@/components/landing/ProblemsSolutionsSection";

import { useParams } from "next/navigation";

export default function LandingPage() {
  const params = useParams();
  const locale = params.locale as string;

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
              كل ما تحتاجه لإدارة مشاريعك في مكان واحد
            </h2>
            <p className="text-lg text-muted-foreground">
              صممنا Binaa لتغطي كافة جوانب إدارة المشاريع الإنشائية، من الموقع الميداني إلى التقارير الإدارية النهائية.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "إدارة المشاريع والجدول الزمني",
                desc: "تابع تقدم المشروع لحظة بلحظة مع أدوات تخطيط متقدمة ورسوم بيانية تفاعلية.",
                icon: Calendar,
                color: "bg-primary/10 text-primary"
              },
              {
                title: "إدارة العمال والقوى العاملة",
                desc: "سجل حضور وانصراف العمال، وزع المهام، وتابع الإنتاجية في مختلف المواقع.",
                icon: Users,
                color: "bg-success/10 text-success"
              },
              {
                title: "إدارة العتاد والمعدات + الصيانة",
                desc: "تتبع مواقع المعدات، استهلاك الوقود، وجدول الصيانة الدورية لتجنب التوقف المفاجئ.",
                icon: Wrench,
                color: "bg-warning/10 text-warning"
              },
              {
                title: "رفع التقارير الميدانية والصور",
                desc: "ارسل التقارير اليومية والصور من الموقع مباشرة عبر الهاتف لتصل للإدارة فوراً.",
                icon: Smartphone,
                color: "bg-info/10 text-info"
              },
              {
                title: "متابعة التكاليف والميزانية",
                desc: "راقب المصاريف، الفواتير، والمدفوعات لضمان عدم تجاوز الميزانية المحددة للمشروع.",
                icon: BarChart3,
                color: "bg-destructive/10 text-destructive"
              },
              {
                title: "تنبيهات وإشعارات في الوقت الفعلي",
                desc: "احصل على تنبيهات فورية عند حدوث تأخير، نقص في المواد، أو اقتراب موعد تسليم.",
                icon: Bell,
                color: "bg-warning/10 text-warning"
              }
            ].map((feature, idx) => (
              <div key={idx} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <Card className="h-full border-border hover:border-primary/20 hover:shadow-sm transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 ${feature.color} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
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
            <div className="text-right">
              <h2 className="text-3xl md:text-5xl font-bold mb-8">لماذا Binaa؟</h2>
              <div className="space-y-8">
                {[
                  {
                    title: "تقليل تأخير المشاريع",
                    desc: "أدواتنا تساعدك على اكتشاف العقبات مبكراً واتخاذ قرارات تصحيحية سريعة.",
                    icon: Zap
                  },
                  {
                    title: "التحكم الفعال في التكاليف",
                    desc: "وداعاً للمصاريف غير المتوقعة. تتبع كل سنتيم ينفق على المشروع.",
                    icon: BarChart3
                  },
                  {
                    title: "تحسين تنسيق الفريق",
                    desc: "ربط كامل بين المهندسين في المكتب والعمال في الميدان عبر منصة واحدة.",
                    icon: Users
                  },
                  {
                    title: "مصمم خصيصاً للمقاول الجزائري",
                    desc: "فهمنا العميق للسوق الجزائري وقوانينه جعلنا نصمم الحل الأمثل لك.",
                    icon: ShieldCheck
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-row-reverse gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-inverse-foreground/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-inverse-foreground/60 leading-relaxed">{item.desc}</p>
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
                          <p className="text-sm font-bold">مشروع سكنات عدل - الجزائر</p>
                          <p className="text-xs text-inverse-foreground/60">منذ 5 دقائق</p>
                        </div>
                      </div>
                      <Badge className="bg-success/20 text-success border-none">قيد الإنجاز</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-inverse-foreground/5 p-4 rounded-lg">
                        <p className="text-xs text-inverse-foreground/60 mb-1">نسبة الإنجاز</p>
                        <p className="text-xl font-bold">75%</p>
                      </div>
                      <div className="bg-inverse-foreground/5 p-4 rounded-lg">
                        <p className="text-xs text-inverse-foreground/60 mb-1">الميزانية المستهلكة</p>
                        <p className="text-xl font-bold text-destructive">420.5M DA</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>الجدول الزمني</span>
                        <span>متأخر بـ 3 أيام</span>
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
                  <p className="text-sm font-bold">تم توفير 15%</p>
                  <p className="text-xs text-muted-foreground">من تكاليف المعدات هذا الشهر</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section id="pricing" className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">آراء شركائنا في النجاح</h2>
            <p className="text-lg text-muted-foreground">نفتخر بدعم كبرى شركات المقاولات في الجزائر لتحقيق أهدافها.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "أحمد بن عودة",
                role: "مدير شركة SARL Construction",
                text: "منذ بدأنا استخدام Binaa، لاحظنا تحسناً كبيراً في دقة التقارير الميدانية. المعلومات تصلني فوراً وأنا في مكتبي، مما سهل اتخاذ القرارات.",
                image: "/images/contractor_1.png"
              },
              {
                name: "سمير جبار",
                role: "مهندس مشاريع - ETPBH",
                text: "إدارة العمال والمعدات كانت كابوساً بالنسبة لنا. اليوم بفضل Binaa، نملك رؤية واضحة لكل ما يحدث في الموقع ونعرف بالضبط أين تذهب ميزانيتنا.",
                image: "/images/contractor_2.png"
              },
              {
                name: "ليلى قاسم",
                role: "مهندسة معمارية مستقلة",
                text: "أكثر ما أعجبني هو سهولة الواجهة وتوافقها مع طبيعة العمل في الجزائر. الدعم الفني رائع ودائماً في الخدمة.",
                image: "/images/contractor_3.png"
              }
            ].map((t, idx) => (
              <Card key={idx} className="border-border shadow-sm hover:shadow-sm transition-shadow">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="text-warning text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-foreground italic mb-8 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-4 flex-row-reverse">
                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                      <AvatarImage src={t.image} alt={t.name} className="object-cover" />
                      <AvatarFallback>{t.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
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
                جاهز لتبدأ إدارة مشاريعك بطريقة احترافية؟
              </h2>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10 bg-background text-primary hover:bg-background/90 text-xl font-bold rounded-lg shadow-sm transition-all hover:scale-105" asChild>
                  <LinkNext href={`/${locale}/auth/register`}>
                    ابدأ الآن مجاناً
                  </LinkNext>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 text-xl font-bold rounded-lg" asChild>
                  <LinkNext href={`/${locale}/contact`}>
                    تواصل مع المبيعات
                  </LinkNext>
                </Button>
              </div>
              <p className="mt-8 text-sm text-primary-foreground/70">
                لا يلزم بطاقة ائتمان – إعداد سريع في أقل من دقيقتين
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
