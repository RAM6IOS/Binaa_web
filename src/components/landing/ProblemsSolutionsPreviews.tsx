"use client";

import React from "react";
import {
  BookOpen,
  Calendar,
  CloudSun,
  LayoutDashboard,
  Thermometer,
  CheckCircle2,
  Users,
  XCircle,
  Wrench,
  Package,
  Ruler,
  TrendingUp,
  BarChart3,
  FileText,
  Landmark,
  MapPin,
  PlayCircle,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BrandLogo } from "@/components/brand/BrandLogo";

const SECTIONS_TABS = [
  "نظرة عامة",
  "السجل اليومي",
  "الكميات",
  "محاضر القيس",
  "الوضعيات",
  "المواد",
  "اليد العاملة",
  "الوثائق",
  "التخطيط",
];

export function DashboardWorkspaceVisual() {
  return (
    <div className="w-full min-w-0 rounded-lg border border-border bg-background shadow-sm overflow-hidden">
      {/* faux app toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <BrandLogo size={22} rounded={false} />
          <span className="text-xs font-bold text-foreground">Binaa — مساحة عمل المشروع</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-3">
        {/* هيدر المشروع */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-foreground truncate min-w-0">برج سكني OPGI — 96 مسكن</h3>
          <Badge variant="success" className="gap-1.5 shrink-0">
            <PlayCircle className="w-3.5 h-3.5" />
            قيد الإنجاز
          </Badge>
        </div>

        {/* معلومات سريعة */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 bg-muted/60 rounded-md px-2 py-1 text-xs font-bold text-muted-foreground">
            <MapPin className="w-3 h-3 text-destructive" />
            بجاية
          </span>
          <span className="flex items-center gap-1 bg-muted/60 rounded-md px-2 py-1 text-xs font-bold text-muted-foreground">
            <Calendar className="w-3 h-3 text-primary" />
            19 أوت 2026
          </span>
          <span className="flex items-center gap-1 bg-muted/60 rounded-md px-2 py-1 text-xs font-bold text-muted-foreground">
            <Landmark className="w-3 h-3 text-warning" />
            120,000,000 DZD
          </span>
        </div>

        {/* التقدم الميداني */}
        <div className="flex items-end justify-between">
          <p className="text-xs font-bold text-muted-foreground">نسبة التقدم الميداني</p>
          <p className="text-sm font-bold text-primary">68%</p>
        </div>
        <Progress value={68} className="h-2" />

        {/* تبويبات المنصة: كل شيء في مكان واحد */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span className="w-6 h-6 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
          </span>
          {SECTIONS_TABS.map((tab) => (
            <span
              key={tab}
              className="shrink-0 rounded-md bg-muted/60 px-2 py-1 text-xs font-bold text-muted-foreground whitespace-nowrap"
            >
              {tab}
            </span>
          ))}
        </div>

        {/* ملخص مالي */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/60 rounded-md p-2.5 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <Landmark className="w-3 h-3 text-info" />
              <span className="text-xs font-bold text-muted-foreground">الميزانية</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">120,000,000 DZD</p>
          </div>
          <div className="bg-muted/60 rounded-md p-2.5 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <Wallet className="w-3 h-3 text-destructive" />
              <span className="text-xs font-bold text-muted-foreground">التكلفة الفعلية</span>
            </div>
            <p className="text-sm font-bold text-destructive truncate">78,000,000 DZD</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-bold">نسبة الاستهلاك</span>
            <span className="font-bold text-muted-foreground">65%</span>
          </div>
          <Progress value={65} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}

export function DailyLogsPreview() {
  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-warning/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">التقارير اليومية</p>
            <p className="text-xs text-muted-foreground">Rapports Journaliers</p>
          </div>
        </div>
        <Badge variant="info" className="gap-1.5 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" />
          قيد الإنجاز
        </Badge>
      </div>

      <div className="bg-muted/60 rounded-md p-3 mb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">الأربعاء 19 أوت 2026</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-full text-muted-foreground">
            <CloudSun className="w-3.5 h-3.5 text-warning" />
            <Thermometer className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-bold">مشمس 28°C</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          صب طبقة الأساس للطريق — تقدّم يومي <span className="font-bold text-success">+12 م²</span>
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">إنجاز الأسبوع (Planning)</span>
          <span className="font-bold text-primary">68%</span>
        </div>
        <Progress value={68} className="h-2" />
        <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 text-xs">
          <span className="text-muted-foreground">عمود الهيكل B3 — (Métrés)</span>
          <span className="font-bold font-mono text-foreground">320 / 500 م³</span>
        </div>
      </div>
    </div>
  );
}

export function WorkforcePreview() {
  const workers = [
    { name: "أحمد بوزيد", role: "قائد ورشة", present: true },
    { name: "ياسين مرابط", role: "عامل بناء", present: false },
    { name: "محمد رؤوف", role: "سائق", present: true },
  ];

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-success/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">اليد العاملة + المعدات + المواد</p>
            <p className="text-xs text-muted-foreground">Main-d&apos;œuvre · Équipements · Matériaux</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">اليوم: 14 عامل</span>
      </div>

      <div className="space-y-2 mb-3">
        {workers.map((w) => (
          <div key={w.name} className="flex items-center justify-between gap-3 bg-muted/60 rounded-md px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">{w.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{w.name}</p>
                <p className="text-xs text-muted-foreground truncate">{w.role}</p>
              </div>
            </div>
            <Badge variant={w.present ? "success" : "destructive"} className="gap-1 whitespace-nowrap">
              {w.present ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {w.present ? "حاضر" : "غائب"}
            </Badge>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-md px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-info/10 flex items-center justify-center shrink-0">
              <Wrench className="w-3.5 h-3.5 text-info" />
            </div>
            <p className="text-xs font-bold text-foreground truncate">Loader CAT 938</p>
          </div>
          <Badge variant="info" className="gap-1 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />
            شغال
          </Badge>
        </div>
        <div className="bg-muted/50 rounded-md px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground truncate">خرسانة C25 (م³)</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">المستهلك الأسبوعي</span>
            <span className="font-bold font-mono text-foreground">12 / 40</span>
          </div>
          <Progress value={30} className="h-1.5 mt-1.5" />
        </div>
      </div>
    </div>
  );
}

export function MetresPreview() {
  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Ruler className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">الكميات + محاضر القيس + الوضعيات</p>
          <p className="text-xs text-muted-foreground">Métrés · Attachements · Situations</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-muted/60 rounded-md px-3 py-2 mb-3 flex-wrap">
        <Calendar className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-muted-foreground">الفترة</span>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="bg-background border border-border rounded-md px-2 py-1">2026-08-01</span>
          <span className="text-muted-foreground">–</span>
          <span className="bg-background border border-border rounded-md px-2 py-1">2026-08-31</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-muted/60 rounded-md p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-bold">القيمة المنجزة</span>
          </div>
          <p className="text-base font-bold text-foreground">
            7,240,000 <span className="text-xs font-normal text-muted-foreground">DZD</span>
          </p>
        </div>
        <div className="bg-muted/60 rounded-md p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold">نسبة الإنجاز</span>
          </div>
          <p className="text-base font-bold text-primary">68%</p>
        </div>
      </div>

      <div className="rounded-md border border-border overflow-hidden mb-3">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="text-xs font-bold w-12">ن°</TableHead>
              <TableHead className="text-xs font-bold">الوصف</TableHead>
              <TableHead className="text-xs font-bold text-center w-20">المنجز</TableHead>
              <TableHead className="text-xs font-bold text-left font-mono">المبلغ DZD</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs text-muted-foreground font-mono">05.01</TableCell>
              <TableCell className="text-xs text-foreground">هيكل خرساني مسلّح</TableCell>
              <TableCell className="text-xs">
                <div className="flex justify-center">
                  <Progress value={85} className="h-2 w-16" />
                </div>
              </TableCell>
              <TableCell className="text-xs font-mono text-foreground">3,150,000</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs text-muted-foreground font-mono">07.03</TableCell>
              <TableCell className="text-xs text-foreground">تسليح — حديد HA</TableCell>
              <TableCell className="text-xs">
                <div className="flex justify-center">
                  <Progress value={60} className="h-2 w-16" />
                </div>
              </TableCell>
              <TableCell className="text-xs font-mono text-foreground">1,280,000</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="info" className="gap-1">
          <FileText className="w-3.5 h-3.5" />
          محضر قيس N°14
        </Badge>
        <Badge variant="success" className="gap-1">
          <Landmark className="w-3.5 h-3.5" />
          الوضعية N°3
        </Badge>
      </div>
    </div>
  );
}