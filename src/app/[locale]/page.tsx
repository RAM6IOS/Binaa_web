"use client";

import React from "react";
import LinkNext from "next/link";
import Image from "next/image";
import { 
  Building2, 
  Calendar, 
  Users, 
  Wrench, 
  FileText, 
  BarChart3, 
  Bell, 
  CheckCircle2, 
  ArrowLeft,
  Menu,
  X,
  Smartphone,
  ShieldCheck,
  Zap,
  Phone
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";

import { useParams } from "next/navigation";

export default function LandingPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isAr = locale === 'ar';

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* 1. Navbar */}
      <Navbar locale={locale} />

      {/* 2. Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -z-10 w-full h-full">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-green-50 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={fadeIn}
              className="text-right"
            >
              <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-100 px-4 py-1.5 text-sm font-medium hover:bg-blue-100 transition-colors">
                مستقبل إدارة الإنشاءات في الجزائر 🇩🇿
              </Badge>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] text-slate-900 mb-6">
                إدارة مشاريع <span className="text-blue-600">الأشغال العمومية</span> والإنشاءات بذكاء
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-xl ml-auto">
                منصة جزائرية متكاملة تساعد المقاولين على متابعة المشاريع، العمال، والمعدات في الوقت الفعلي ومن أي مكان.
              </p>
              <div className="flex flex-col sm:flex-row-reverse gap-4 justify-start">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg rounded-xl shadow-xl shadow-blue-200 group" asChild>
                  <LinkNext href={`/${locale}/auth/register`}>
                    ابدأ تجربة مجانية
                    <ArrowLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </LinkNext>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-xl border-slate-200 hover:bg-slate-50">
                  شاهد الفيديو
                </Button>
              </div>
              
              <div className="mt-12 flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 justify-end text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>لا يلزم بطاقة ائتمان</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>دعم فني 24/7</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                <Image 
                  src="/images/hero_dashboard.png" 
                  alt="Binaa Dashboard" 
                  width={1200} 
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Trust Bar */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-700">مستخدم من قبل +150 مقاول جزائري</span>
            </div>
            <div className="h-6 w-px bg-slate-300 hidden md:block" />
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-slate-700">متوافق مع قانون المشتريات العمومية</span>
            </div>
            <div className="h-6 w-px bg-slate-300 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="bg-blue-900 text-white px-2 py-0.5 rounded text-xs font-black">ANPT</div>
              <span className="text-lg font-bold text-slate-700">مدعوم من طرف ANPT</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
              كل ما تحتاجه لإدارة مشاريعك في مكان واحد
            </h2>
            <p className="text-lg text-slate-600">
              صممنا Binaa لتغطي كافة جوانب إدارة المشاريع الإنشائية، من الموقع الميداني إلى التقارير الإدارية النهائية.
            </p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                title: "إدارة المشاريع والجدول الزمني",
                desc: "تابع تقدم المشروع لحظة بلحظة مع أدوات تخطيط متقدمة ورسوم بيانية تفاعلية.",
                icon: Calendar,
                color: "bg-blue-50 text-blue-600"
              },
              {
                title: "إدارة العمال والقوى العاملة",
                desc: "سجل حضور وانصراف العمال، وزع المهام، وتابع الإنتاجية في مختلف المواقع.",
                icon: Users,
                color: "bg-green-50 text-green-600"
              },
              {
                title: "إدارة العتاد والمعدات + الصيانة",
                desc: "تتبع مواقع المعدات، استهلاك الوقود، وجدول الصيانة الدورية لتجنب التوقف المفاجئ.",
                icon: Wrench,
                color: "bg-orange-50 text-orange-600"
              },
              {
                title: "رفع التقارير الميدانية والصور",
                desc: "ارسل التقارير اليومية والصور من الموقع مباشرة عبر الهاتف لتصل للإدارة فوراً.",
                icon: Smartphone,
                color: "bg-purple-50 text-purple-600"
              },
              {
                title: "متابعة التكاليف والميزانية",
                desc: "راقب المصاريف، الفواتير، والمدفوعات لضمان عدم تجاوز الميزانية المحددة للمشروع.",
                icon: BarChart3,
                color: "bg-red-50 text-red-600"
              },
              {
                title: "تنبيهات وإشعارات في الوقت الفعلي",
                desc: "احصل على تنبيهات فورية عند حدوث تأخير، نقص في المواد، أو اقتراب موعد تسليم.",
                icon: Bell,
                color: "bg-amber-50 text-amber-600"
              }
            ].map((feature, idx) => (
              <motion.div key={idx} variants={fadeIn}>
                <Card className="h-full border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-slate-900">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 5. Benefits / Why Binaa */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-500 rounded-full blur-[120px]" />
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
                    <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative lg:block hidden">
              <div className="bg-gradient-to-tr from-blue-600 to-green-500 p-1 rounded-3xl">
                <div className="bg-slate-900 rounded-3xl p-8 border border-white/10">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full" />
                        <div>
                          <p className="text-sm font-bold">مشروع سكنات عدل - الجزائر</p>
                          <p className="text-xs text-slate-500">منذ 5 دقائق</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-none">قيد الإنجاز</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">نسبة الإنجاز</p>
                        <p className="text-xl font-bold">75%</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">الميزانية المستهلكة</p>
                        <p className="text-xl font-bold text-red-400">420.5M DA</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>الجدول الزمني</span>
                        <span>متأخر بـ 3 أيام</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-[70%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white text-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">تم توفير 15%</p>
                  <p className="text-xs text-slate-500">من تكاليف المعدات هذا الشهر</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">آراء شركائنا في النجاح</h2>
            <p className="text-lg text-slate-600">نفتخر بدعم كبرى شركات المقاولات في الجزائر لتحقيق أهدافها.</p>
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
              <Card key={idx} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="text-amber-400 text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-slate-700 italic mb-8 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-4 flex-row-reverse">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                      <AvatarImage src={t.image} alt={t.name} className="object-cover" />
                      <AvatarFallback>{t.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
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
          <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400/20 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative z-10 max-w-3xl mx-auto"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                جاهز لتبدأ إدارة مشاريعك بطريقة احترافية؟
              </h2>
              <p className="text-xl text-blue-100 mb-10">
                انضم إلى أكثر من 150 شركة جزائرية تعتمد على Binaa لزيادة كفاءتها وتوفير تكاليفها.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10 bg-white text-blue-600 hover:bg-blue-50 text-xl font-bold rounded-2xl shadow-xl transition-all hover:scale-105" asChild>
                  <LinkNext href={`/${locale}/auth/register`}>
                    ابدأ الآن مجاناً
                  </LinkNext>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 bg-transparent border-white/20 text-white hover:bg-white/10 text-xl font-bold rounded-2xl" asChild>
                  <LinkNext href="#contact">
                    تواصل مع المبيعات
                  </LinkNext>
                </Button>
              </div>
              <p className="mt-8 text-sm text-blue-200">
                لا يلزم بطاقة ائتمان – إعداد سريع في أقل من دقيقتين
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-20 pb-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16 text-right">
            <div className="col-span-1 md:col-span-1">
              <LinkNext href={`/${locale}`} className="flex items-center gap-2 justify-end mb-6">
                <span className="text-2xl font-bold tracking-tight text-blue-900">Binaa</span>
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              </LinkNext>
              <p className="text-slate-500 text-sm leading-relaxed">
                المنصة الأولى في الجزائر المتخصصة في إدارة مشاريع الأشغال العمومية والإنشاءات الكبرى.
              </p>
              <div className="mt-8 flex gap-4 justify-end">
                {/* Social links placeholders */}
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6">المنصة</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li><LinkNext href="#features" className="hover:text-blue-600">المميزات</LinkNext></li>
                <li><LinkNext href="#pricing" className="hover:text-blue-600">الأسعار</LinkNext></li>
                <li><LinkNext href="#" className="hover:text-blue-600">تحديثات النظام</LinkNext></li>
                <li><LinkNext href="#" className="hover:text-blue-600">دليل الاستخدام</LinkNext></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">الشركة</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li><LinkNext href="#" className="hover:text-blue-600">عن بيناء</LinkNext></li>
                <li><LinkNext href="#" className="hover:text-blue-600">الوظائف</LinkNext></li>
                <li><LinkNext href="#" className="hover:text-blue-600">المدونة</LinkNext></li>
                <li><LinkNext href="#" className="hover:text-blue-600">شركاء النجاح</LinkNext></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">اتصل بنا</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li className="flex items-center gap-3 justify-end">
                  <span>contact@binaa.dz</span>
                  <FileText className="w-4 h-4 text-blue-600" />
                </li>
                <li className="flex items-center gap-3 justify-end">
                  <span>+213 (0) 23 45 67 89</span>
                  <Phone className="w-4 h-4 text-blue-600" />
                </li>
                <li className="flex items-center gap-3 justify-end text-left">
                  <span>سيدي عبد الله، الجزائر العاصمة</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <div className="flex gap-6">
              <LinkNext href="#" className="hover:text-blue-600">سياسة الخصوصية</LinkNext>
              <LinkNext href="#" className="hover:text-blue-600">شروط الخدمة</LinkNext>
              <LinkNext href="#" className="hover:text-blue-600">ملفات تعريف الارتباط</LinkNext>
            </div>
            <p>© 2026 Binaa - جميع الحقوق محفوظة لشركة بيناء تكنولوجي.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
