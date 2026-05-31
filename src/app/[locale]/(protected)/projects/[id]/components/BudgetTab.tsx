"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Plus, 
  Printer, 
  Loader2, 
  Wallet, 
  AlertTriangle, 
  ArrowUpRight, 
  Edit3, 
  Check, 
  X,
  CheckCircle2,
  Calendar,
  Building
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  LineChart, 
  Line 
} from "recharts";
import { toast } from "sonner";
import { Project } from "@/lib/types/projects";
import { BudgetOverview, Invoice, FinancialCategory, InvoiceStatus, InvoiceType } from "@/lib/types/financials";

interface Props {
  project: Project;
  isAr: boolean;
}

export function BudgetTab({ project, isAr }: Props) {
  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Invoice state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [percentage, setPercentage] = useState(10);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("interim");
  
  // Active invoice for printing
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Budget planned adjustments
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isSavingBudgets, setIsSavingBudgets] = useState(false);
  const [budgetEdits, setBudgetEdits] = useState({
    labor: 0,
    equipment: 0,
    materials: 0,
    other: 0
  });

  const fetchFinancialData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // 1. Fetch budget overview
      const budgetRes = await fetch(`/api/projects/${project.id}/budget`);
      const budgetData = await budgetRes.json();
      if (budgetData.success) {
        setOverview(budgetData.overview);
        // Initialize budget edits values
        const laborItem = budgetData.overview.categories.find((c: any) => c.category === 'labor');
        const equipItem = budgetData.overview.categories.find((c: any) => c.category === 'equipment');
        const matItem = budgetData.overview.categories.find((c: any) => c.category === 'materials');
        const otherItem = budgetData.overview.categories.find((c: any) => c.category === 'other');
        
        setBudgetEdits({
          labor: laborItem ? laborItem.planned : 0,
          equipment: equipItem ? equipItem.planned : 0,
          materials: matItem ? matItem.planned : 0,
          other: otherItem ? otherItem.planned : 0
        });
      }

      // 2. Fetch invoices
      const invoicesRes = await fetch(`/api/projects/${project.id}/invoices`);
      const invoicesData = await invoicesRes.json();
      if (invoicesData.success) {
        setInvoices(invoicesData.invoices);
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error(isAr ? "تعذر تحميل البيانات المالية" : "Erreur de chargement des données financières");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [project.id]);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInvoice(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentageComplete: percentage,
          type: invoiceType
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isAr ? "تم إصدار الفاتورة بنجاح كمسودة" : "Facture créée avec succès en brouillon");
        setIsInvoiceModalOpen(false);
        fetchFinancialData(true);
      } else {
        toast.error(data.error || (isAr ? "حدث خطأ أثناء إصدار الفاتورة" : "Erreur lors de la création de la facture"));
      }
    } catch (e) {
      console.error(e);
      toast.error(isAr ? "حدث خطأ غير متوقع" : "Erreur inattendue");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/invoices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isAr ? "تم تحديث حالة الفاتورة" : "Statut de la facture mis à jour");
        fetchFinancialData(true);
      } else {
        toast.error(isAr ? "تعذر تحديث الفاتورة" : "Impossible de mettre à jour");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBudgetPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBudgets(true);
    
    // Check if sum equals total budget
    const sum = budgetEdits.labor + budgetEdits.equipment + budgetEdits.materials + budgetEdits.other;
    const total = overview?.totalBudget || project.budget;
    if (sum !== total) {
      toast.warning(
        isAr 
          ? `مجموع البنود (${sum.toLocaleString()} دج) لا يساوي الميزانية الكلية للمشروع (${total.toLocaleString()} دج). سيتم حفظ التقسيم الجديد على أي حال.` 
          : `La somme (${sum.toLocaleString()} DZD) diffère du budget global (${total.toLocaleString()} DZD).`
      );
    }

    try {
      const res = await fetch(`/api/projects/${project.id}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: [
            { category: "labor", planned: budgetEdits.labor },
            { category: "equipment", planned: budgetEdits.equipment },
            { category: "materials", planned: budgetEdits.materials },
            { category: "other", planned: budgetEdits.other }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isAr ? "تم حفظ تخطيط الميزانية بنجاح" : "Planification budgétaire enregistrée");
        setOverview(data.overview);
        setIsEditBudgetOpen(false);
      } else {
        toast.error(isAr ? "تعذر حفظ التخطيط المالي" : "Erreur de sauvegarde");
      }
    } catch (e) {
      console.error(e);
      toast.error(isAr ? "خطأ غير متوقع" : "Erreur");
    } finally {
      setIsSavingBudgets(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">
          {isAr ? "جاري تحميل البيانات المالية والميزانيات..." : "Chargement des données financières..."}
        </p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString(isAr ? "ar-DZ" : "fr-FR") + " " + (isAr ? "دج" : "DZD");
  };

  const totalInvoiced = invoices.reduce((acc, curr) => acc + (curr.status === "paid" || curr.status === "sent" ? Number(curr.total_amount) : 0), 0);
  const totalPaid = invoices.reduce((acc, curr) => acc + (curr.status === "paid" ? Number(curr.total_amount) : 0), 0);
  const totalPlanned = overview?.totalBudget || project.budget;
  const totalActual = overview?.totalActualCost || project.actual_cost;
  const remainingBudget = totalPlanned - totalActual;
  const consumptionRate = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  // Custom tooltips for Recharts
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg border border-slate-700 shadow-xl backdrop-blur-sm text-sm space-y-1 text-right" dir="rtl">
          <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="font-bold text-slate-300 pt-1 border-t border-slate-700 mt-1">
            {isAr ? "الإجمالي" : "Total"}: {formatCurrency(payload.reduce((acc: number, curr: any) => acc + curr.value, 0))}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg border border-slate-700 shadow-xl backdrop-blur-sm text-sm space-y-1 text-right" dir="rtl">
          <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Translations
  const trans = {
    labor: isAr ? "العمالة" : "Main d'œuvre",
    equipment: isAr ? "العتاد" : "Équipement",
    materials: isAr ? "المواد" : "Matériaux",
    other: isAr ? "أخرى" : "Autres",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir={isAr ? "rtl" : "ltr"}>
      {/* 1. Dashboard Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget Card */}
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">
              {isAr ? "الميزانية الكلية للمشروع" : "Budget Global du Projet"}
            </CardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatCurrency(totalPlanned)}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400 font-bold">{isAr ? "مخطط وموثق" : "Budget Planifié"}</span>
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        </Card>

        {/* Actual Expenses Card */}
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">
              {isAr ? "التكلفة الفعلية (المستهلك)" : "Coûts Réels Consommés"}
            </CardTitle>
            <div className={`p-2 rounded-lg ${consumptionRate > 90 ? "bg-rose-50 dark:bg-rose-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}>
              <TrendingUp className={`w-5 h-5 ${consumptionRate > 90 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={`text-2xl font-bold tracking-tight ${consumptionRate > 100 ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>
              {formatCurrency(totalActual)}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">{isAr ? "نسبة الاستهلاك:" : "Taux de cons.:"}</span>
              <span className={`font-bold ${consumptionRate > 100 ? "text-rose-600" : consumptionRate > 80 ? "text-amber-600" : "text-emerald-600"}`}>
                {consumptionRate}%
              </span>
            </div>
          </CardContent>
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${consumptionRate > 90 ? "from-rose-500 to-red-500" : "from-emerald-500 to-teal-500"}`}></div>
        </Card>

        {/* Total Invoiced Card */}
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">
              {isAr ? "الفواتير المصدرة (المفوترة)" : "Facturation Émise"}
            </CardTitle>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatCurrency(totalInvoiced)}
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>{isAr ? "المحصل منها فعلياً:" : "Montant Encaissé:"}</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(totalPaid)}</span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        </Card>

        {/* Balance Card */}
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">
              {isAr ? "السيولة المتبقية (الفارق)" : "Solde Restant du Budget"}
            </CardTitle>
            <div className={`p-2 rounded-lg ${remainingBudget < 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-cyan-50 dark:bg-cyan-900/20"}`}>
              <DollarSign className={`w-5 h-5 ${remainingBudget < 0 ? "text-red-600 dark:text-red-400" : "text-cyan-600 dark:text-cyan-400"}`} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={`text-2xl font-bold tracking-tight ${remainingBudget < 0 ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
              {formatCurrency(remainingBudget)}
            </div>
            <p className="text-xs text-slate-500">
              {remainingBudget < 0 
                ? (isAr ? "تجاوز في الميزانية المحددة!" : "Dépassement de budget !") 
                : (isAr ? "سيولة متاحة ومستقرة" : "Budget disponible")
              }
            </p>
          </CardContent>
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${remainingBudget < 0 ? "from-red-500 to-rose-600" : "from-cyan-500 to-blue-500"}`}></div>
        </Card>
      </div>

      {/* 2. Planned vs Actual Progress Bars per Category */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">{isAr ? "تحليل وتوزيع الميزانية حسب الفئات" : "Ventilation Budgétaire par Catégorie"}</CardTitle>
            <CardDescription>{isAr ? "مقارنة المبالغ المخططة مقابل التكاليف الفعلية المستهلكة" : "Comparaison du budget planifié par rapport aux dépenses réelles"}</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-blue-600 hover:text-blue-700" onClick={() => setIsEditBudgetOpen(true)}>
            <Edit3 className="w-4 h-4" />
            {isAr ? "تعديل التخطيط" : "Ajuster la répartition"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {overview?.categories.map((cat, idx) => {
            const pct = cat.planned > 0 ? Math.round((cat.actual / cat.planned) * 100) : 0;
            const isOverBudget = cat.actual > cat.planned;
            
            return (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full 
                      ${cat.category === "labor" ? "bg-amber-500" : 
                        cat.category === "equipment" ? "bg-blue-500" : 
                        cat.category === "materials" ? "bg-emerald-500" : "bg-purple-500"}`} 
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{trans[cat.category] || cat.category}</span>
                  </div>
                  
                  <div className="text-xs text-slate-500 space-x-2 space-x-reverse">
                    <span>
                      {isAr ? "الفعلي:" : "Réel:"} <strong className={isOverBudget ? "text-rose-600" : "text-slate-800 dark:text-slate-200"}>{formatCurrency(cat.actual)}</strong>
                    </span>
                    <span className="text-slate-300">/</span>
                    <span>
                      {isAr ? "المخطط:" : "Prévu:"} <strong>{formatCurrency(cat.planned)}</strong>
                    </span>
                    {isOverBudget && (
                      <span className="inline-flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        {isAr ? "تجاوز المخطط" : "Dépassement"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  {/* Progress Bar Container */}
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full
                        ${isOverBudget ? "bg-rose-500" : 
                          cat.category === "labor" ? "bg-amber-500" : 
                          cat.category === "equipment" ? "bg-blue-500" : 
                          cat.category === "materials" ? "bg-emerald-500" : "bg-purple-500"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  
                  {/* Percentage label */}
                  <span className={`absolute top-4 ${isAr ? "left-0" : "right-0"} text-xs font-bold ${isOverBudget ? "text-rose-600" : "text-slate-500"}`}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Recharts Graphics Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Costs Plot */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">{isAr ? "السيولة التراكمية والتكاليف بمرور الوقت" : "Courbe Cumulative des Dépenses"}</CardTitle>
            <CardDescription>{isAr ? "تطور التكاليف الفعلية مقارنة بمتوسط خط الميزانية المخطط له" : "Évolution des dépenses cumulées par rapport au budget global linéaire"}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={overview?.dailyCostHistory ? overview.dailyCostHistory.map((item, idx) => {
                  const cumActual = overview.cumulativeActual[idx]?.amount || 0;
                  const cumPlanned = overview.cumulativePlanned[idx]?.amount || 0;
                  return {
                    date: item.date,
                    [isAr ? "التكلفة التراكمية الفعلية" : "Cumulé Réel"]: cumActual,
                    [isAr ? "المخطط التراكمي المقدر" : "Cumulé Planifié"]: cumPlanned
                  };
                }) : []}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} width={80} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line 
                  type="monotone" 
                  dataKey={isAr ? "التكلفة التراكمية الفعلية" : "Cumulé Réel"} 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey={isAr ? "المخطط التراكمي المقدر" : "Cumulé Planifié"} 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stacked Daily Resources Cost */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">{isAr ? "تفصيل التكاليف اليومية (آخر 30 يوم)" : "Détails des Coûts Quotidiens (30 jours)"}</CardTitle>
            <CardDescription>{isAr ? "تحليل النفقات اليومية الموزعة حسب العمالة والعتاد والمواد" : "Niveau quotidien de dépenses réparties par catégorie de ressources"}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview?.dailyCostHistory || []}
                margin={{ top: 10, right: 5, left: 5, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 9 }} />
                <YAxis tickLine={false} width={80} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="labor" name={trans.labor} stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="equipment" name={trans.equipment} stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="materials" name={trans.materials} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="other" name={trans.other} stackId="a" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 4. Invoices Management section */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg font-bold">{isAr ? "الفواتير والمطالبات المالية للعملاء" : "Facturation & Appels de Fonds"}</CardTitle>
            <CardDescription>{isAr ? "إدارة الفواتير المصدرة بناءً على نسب إنجاز الأشغال ومتابعة تسديدها" : "Suivi des paiements client et génération des situations d'avancement"}</CardDescription>
          </div>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsInvoiceModalOpen(true)}>
            <Plus className="w-4 h-4" />
            {isAr ? "إصدار فاتورة جديدة" : "Créer situation"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="font-bold text-center w-32">{isAr ? "رقم الفاتورة" : "N° Facture"}</TableHead>
                  <TableHead className="font-bold text-center">{isAr ? "النوع" : "Type"}</TableHead>
                  <TableHead className="font-bold text-center">{isAr ? "نسبة الإنجاز" : "Avancement"}</TableHead>
                  <TableHead className="font-bold text-center">{isAr ? "المبلغ الإجمالي" : "Montant TTC"}</TableHead>
                  <TableHead className="font-bold text-center">{isAr ? "تاريخ الإصدار" : "Date émission"}</TableHead>
                  <TableHead className="font-bold text-center">{isAr ? "حالة الدفع" : "Statut"}</TableHead>
                  <TableHead className="font-bold text-center w-28">{isAr ? "خيارات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      {isAr ? "لا توجد فواتير مصدرة حالياً لهذا المشروع." : "Aucune facture émise pour ce projet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-center">
                      <TableCell className="font-bold font-mono text-slate-900 dark:text-white">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs">
                        {inv.type === "advance" ? (
                          <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-200">
                            {isAr ? "دفعة مقدمة" : "Avance"}
                          </span>
                        ) : inv.type === "interim" ? (
                          <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-200">
                            {isAr ? "مرحلية" : "Intermédiaire"}
                          </span>
                        ) : (
                          <span className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 px-2.5 py-1 rounded-full border border-purple-200">
                            {isAr ? "نهائية" : "Finale"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-slate-700 dark:text-slate-300">{inv.percentage_complete}%</TableCell>
                      <TableCell className="font-bold text-slate-950 dark:text-white font-mono">{formatCurrency(Number(inv.total_amount))}</TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {new Date(inv.issue_date).toLocaleDateString(isAr ? "ar-DZ" : "fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={inv.status} 
                          onValueChange={(val: InvoiceStatus) => handleUpdateInvoiceStatus(inv.id, val)}
                        >
                          <SelectTrigger className={`h-8 w-28 text-center text-xs justify-center mx-auto rounded-full font-bold
                            ${inv.status === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200" : 
                              inv.status === "sent" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200" : 
                              inv.status === "overdue" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200" : 
                              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300"}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-center font-semibold text-xs">
                            <SelectItem value="draft">{isAr ? "مسودة" : "Brouillon"}</SelectItem>
                            <SelectItem value="sent">{isAr ? "تم إرسالها" : "Envoyée"}</SelectItem>
                            <SelectItem value="paid">{isAr ? "مدفوعة" : "Payée"}</SelectItem>
                            <SelectItem value="overdue">{isAr ? "متأخرة" : "En retard"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setActiveInvoice(inv);
                            setIsPrintModalOpen(true);
                          }}
                          title={isAr ? "معاينة وطباعة الفاتورة" : "Imprimer la facture"}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Dialog: Generate Invoice Modal */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className={`sm:max-w-[500px] ${isAr ? "rtl" : "ltr"}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{isAr ? "إصدار فاتورة جديدة للعميل" : "Émettre une nouvelle facture client"}</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              {isAr ? "احسب مبالغ الفاتورة تلقائياً بناءً على نسبة إنجاز الأشغال المعتمدة للمشروع." : "Calculez le montant automatiquement selon le pourcentage d'avancement approuvé."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerateInvoice} className="space-y-6 py-4">
            <div className="space-y-4">
              {/* Invoice type */}
              <div className="space-y-2">
                <Label htmlFor="invoice_type">{isAr ? "نوع الفاتورة" : "Type de facture"}</Label>
                <Select value={invoiceType} onValueChange={(v: InvoiceType) => setInvoiceType(v)}>
                  <SelectTrigger id="invoice_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">{isAr ? "دفعة مقدمة (تسبيق)" : "Avance sur démarrage"}</SelectItem>
                    <SelectItem value="interim">{isAr ? "فاتورة مرحلية (حسب تقدم الأشغال)" : "Situation de travaux interim"}</SelectItem>
                    <SelectItem value="final">{isAr ? "فاتورة ختامية (تسوية نهائية)" : "Décompte général définitif"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Progress Percentage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="percentage">{isAr ? "نسبة إنجاز الأشغال للفوترة (%)" : "Avancement pour facturation (%)"}</Label>
                  <span className="text-xs text-slate-500">
                    {isAr ? `الحالي للمشروع: ${project.progress}%` : `Actuel projet: ${project.progress}%`}
                  </span>
                </div>
                <div className="flex gap-4 items-center">
                  <Input 
                    type="number" 
                    id="percentage" 
                    min="1" 
                    max="100" 
                    required
                    value={percentage}
                    onChange={(e) => setPercentage(Math.min(100, Math.max(1, Number(e.target.value))))}
                    className="w-24 text-center font-bold"
                  />
                  <div className="flex-1 text-sm text-slate-600 dark:text-slate-400">
                    {isAr ? "سيتم ضرب الميزانية الإجمالية بهذه النسبة." : "Le budget sera multiplié par cette valeur."}
                  </div>
                </div>
              </div>

              {/* Estimations display */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>{isAr ? "المبلغ الأساسي (الخام):" : "Montant Hors Taxe (HT):"}</span>
                  <span className="font-bold">{formatCurrency(Math.round(totalPlanned * (percentage / 100)))}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{isAr ? "ضريبة القيمة المضافة (19% VAT):" : "TVA algérienne (19%):"}</span>
                  <span>{formatCurrency(Math.round(totalPlanned * (percentage / 100) * 0.19))}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-slate-900 dark:text-white">
                  <span>{isAr ? "المجموع الكلي للفاتورة:" : "Total Facture TTC:"}</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(Math.round(totalPlanned * (percentage / 100) * 1.19))}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
                {isAr ? "إلغاء" : "Annuler"}
              </Button>
              <Button type="submit" disabled={isSubmittingInvoice} className="bg-blue-600 hover:bg-blue-700">
                {isSubmittingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAr ? "إصدار مسودة الفاتورة" : "Générer la facture"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog: Edit Planned Budget Allocations */}
      <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
        <DialogContent className={`sm:max-w-[500px] ${isAr ? "rtl" : "ltr"}`}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{isAr ? "توزيع ميزانية البنود" : "Répartir le Budget Planifié"}</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              {isAr ? `الميزانية الكلية للمشروع هي ${totalPlanned.toLocaleString()} دج. قم بتوزيعها على الفئات.` : `Budget global: ${totalPlanned.toLocaleString()} DZD.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBudgetPlan} className="space-y-6 py-4">
            <div className="space-y-4">
              {/* Labor budget */}
              <div className="space-y-1">
                <Label htmlFor="edit_labor">{isAr ? "ميزانية العمالة واليد العاملة (دج)" : "Budget Main d'œuvre (DZD)"}</Label>
                <Input 
                  type="number" 
                  id="edit_labor" 
                  value={budgetEdits.labor}
                  onChange={(e) => setBudgetEdits({ ...budgetEdits, labor: Number(e.target.value) })}
                  className="font-mono"
                />
              </div>

              {/* Equipment budget */}
              <div className="space-y-1">
                <Label htmlFor="edit_equipment">{isAr ? "ميزانية العتاد والآليات (دج)" : "Budget Équipement & Engins (DZD)"}</Label>
                <Input 
                  type="number" 
                  id="edit_equipment" 
                  value={budgetEdits.equipment}
                  onChange={(e) => setBudgetEdits({ ...budgetEdits, equipment: Number(e.target.value) })}
                  className="font-mono"
                />
              </div>

              {/* Materials budget */}
              <div className="space-y-1">
                <Label htmlFor="edit_materials">{isAr ? "ميزانية المواد والأشغال الكبرى (دج)" : "Budget Matériaux de Chantier (DZD)"}</Label>
                <Input 
                  type="number" 
                  id="edit_materials" 
                  value={budgetEdits.materials}
                  onChange={(e) => setBudgetEdits({ ...budgetEdits, materials: Number(e.target.value) })}
                  className="font-mono"
                />
              </div>

              {/* Other budget */}
              <div className="space-y-1">
                <Label htmlFor="edit_other">{isAr ? "نفقات ومصاريف أخرى (دج)" : "Autres Dépenses (DZD)"}</Label>
                <Input 
                  type="number" 
                  id="edit_other" 
                  value={budgetEdits.other}
                  onChange={(e) => setBudgetEdits({ ...budgetEdits, other: Number(e.target.value) })}
                  className="font-mono"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border text-xs flex justify-between font-bold">
                <span>{isAr ? "المجموع الكلي للبنود:" : "Somme totale répartie:"}</span>
                <span className={budgetEdits.labor + budgetEdits.equipment + budgetEdits.materials + budgetEdits.other === totalPlanned ? "text-emerald-600" : "text-amber-600"}>
                  {formatCurrency(budgetEdits.labor + budgetEdits.equipment + budgetEdits.materials + budgetEdits.other)}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditBudgetOpen(false)}>
                {isAr ? "إلغاء" : "Annuler"}
              </Button>
              <Button type="submit" disabled={isSavingBudgets} className="bg-blue-600 hover:bg-blue-700">
                {isSavingBudgets && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAr ? "حفظ التوزيع المالي" : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Beautiful RTL Print Invoice Dialog */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-[850px] p-0 overflow-hidden bg-slate-100 dark:bg-slate-900 border-slate-300">
          <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg leading-normal tracking-normal">
              <FileText className="w-5 h-5 text-blue-600" />
              {isAr ? "معاينة الفاتورة الرسمية" : "Aperçu officiel de la facture"}
            </DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Printer className="w-4 h-4" />
                {isAr ? "طباعة / حفظ كـ PDF" : "Imprimer / PDF"}
              </Button>
              <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
                {isAr ? "إغلاق" : "Fermer"}
              </Button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-6 flex justify-center">
            {activeInvoice && (
              <div 
                id="printable-invoice" 
                className="w-full bg-white text-black p-8 rounded-lg shadow-sm border border-slate-200"
                dir="rtl"
                style={{ fontFamily: "'Cairo', 'Inter', sans-serif" }}
              >
                {/* Embedded Print CSS block */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #printable-invoice, #printable-invoice * {
                      visibility: visible !important;
                    }
                    #printable-invoice {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      margin: 0 !important;
                      padding: 2cm !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: white !important;
                      color: black !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}} />

                {/* Header */}
                <div className="grid grid-cols-2 gap-4 border-b pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">ب</div>
                      <span className="font-extrabold text-2xl tracking-tight text-blue-900">Binaa Construction</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      الشركة الوطنية لأشغال البناء والتهيئة العمرانية EURL<br />
                      العنوان: 123 شارع الإخوة بوعدو، بئر مراد رايس، الجزائر العاصمة<br />
                      الهاتف: 021 12 34 56 | الإيميل: contacts@binaa-construction.dz
                    </p>
                  </div>

                  <div className="text-left font-medium">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">فاتورة رسمية</h2>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>رقم الفاتورة: <strong className="font-mono text-black">{activeInvoice.invoice_number}</strong></p>
                      <p>تاريخ الإصدار: <span className="font-mono">{new Date(activeInvoice.issue_date).toLocaleDateString("ar-DZ")}</span></p>
                      <p>تاريخ الاستحقاق: <span className="font-mono">{new Date(activeInvoice.due_date).toLocaleDateString("ar-DZ")}</span></p>
                      <p>حالة الفاتورة: <strong className="text-blue-900">{activeInvoice.status === "paid" ? "مدفوعة" : "قيد التسديد"}</strong></p>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg mb-6 border text-sm text-slate-700 leading-relaxed">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1"><Building className="w-4 h-4 text-blue-600" /> معلومات المالك (العميل):</h4>
                    <p className="font-semibold text-black">{project.client_name || "Direction de l'Équipement"}</p>
                    <p>رقم العقد: <span className="font-mono">{project.contract_number || "CTR-2024-001"}</span></p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1"><Calendar className="w-4 h-4 text-blue-600" /> معلومات المشروع والأشغال:</h4>
                    <p className="font-semibold text-black">{project.name}</p>
                    <p>الموقع (الولاية): {project.wilaya}</p>
                    <p>النسبة المعتمدة للمطالبة: <strong className="text-blue-800">{activeInvoice.percentage_complete}%</strong></p>
                  </div>
                </div>

                {/* Invoice Items table */}
                <table className="w-full text-sm text-right border-collapse mb-8">
                  <thead>
                    <tr className="bg-blue-900 text-white font-bold border-b border-blue-950">
                      <th className="py-2.5 px-3 rounded-r">{isAr ? "الوصف التفصيلي للأشغال" : "Désignation des Travaux"}</th>
                      <th className="py-2.5 px-3 text-center w-20">{isAr ? "الكمية" : "Qté"}</th>
                      <th className="py-2.5 px-3 text-center w-36">{isAr ? "سعر الوحدة (HT)" : "P.U. HT"}</th>
                      <th className="py-2.5 px-3 text-left w-40 rounded-l">{isAr ? "المبلغ الكلي (HT)" : "Montant HT"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.invoice_items && activeInvoice.invoice_items.length > 0 ? (
                      activeInvoice.invoice_items.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-semibold text-slate-800">{item.description}</td>
                          <td className="py-3 px-3 text-center font-mono">{Number(item.quantity)}</td>
                          <td className="py-3 px-3 text-center font-mono">{(Number(item.unit_price)).toLocaleString()} دج</td>
                          <td className="py-3 px-3 text-left font-bold font-mono">{(Number(item.amount)).toLocaleString()} دج</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          أشغال بناء وتشييد مشروع "{project.name}" - دفعات أشغال بنسبة إنجاز {activeInvoice.percentage_complete}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono">1</td>
                        <td className="py-3 px-3 text-center font-mono">{(Number(activeInvoice.amount)).toLocaleString()} دج</td>
                        <td className="py-3 px-3 text-left font-bold font-mono">{(Number(activeInvoice.amount)).toLocaleString()} دج</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Subtotals block */}
                <div className="flex justify-between items-start gap-4 mb-8">
                  {/* General notes / seal box */}
                  <div className="w-1/2 bg-slate-50 p-4 rounded-lg border text-xs text-slate-500 leading-relaxed font-medium">
                    <h5 className="font-bold text-slate-800 mb-1">ملاحظة هامة:</h5>
                    <p>يرجى سداد هذه الفاتورة خلال فترة لا تتجاوز 30 يوماً من تاريخ الإصدار.</p>
                    <p className="mt-2">يتم تحويل المبالغ مباشرة إلى الحساب البنكي EURL Binaa Construction:<br /><strong>IBAN: DZ41 0030 0001 0234 5678 9012</strong></p>
                  </div>

                  {/* Calculations */}
                  <div className="w-1/2 space-y-2.5 text-sm">
                    <div className="flex justify-between px-2 text-slate-600 font-semibold">
                      <span>المجموع الكلي خارج الرسوم (Total HT):</span>
                      <span className="font-mono">{(Number(activeInvoice.amount)).toLocaleString()} دج</span>
                    </div>
                    <div className="flex justify-between px-2 text-slate-500">
                      <span>ضريبة القيمة المضافة (TVA 19%):</span>
                      <span className="font-mono">{(Number(activeInvoice.vat_amount)).toLocaleString()} دج</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 bg-blue-50 text-blue-900 rounded-lg font-bold border border-blue-200">
                      <span>المجموع الكلي باحتساب كل الرسوم (TTC):</span>
                      <span className="font-mono text-lg">{(Number(activeInvoice.total_amount)).toLocaleString()} دج</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 text-center pt-8 border-t text-sm font-semibold">
                  <div>
                    <h5 className="text-slate-500 mb-12">قسم المراقبة المالية والحسابات</h5>
                    <p className="text-slate-900 border-b w-40 mx-auto pb-1"></p>
                    <span className="text-xs text-slate-400 font-medium">الختم والتوقيع</span>
                  </div>
                  <div>
                    <h5 className="text-slate-500 mb-12">المدير العام EURL Binaa</h5>
                    <p className="text-slate-900 border-b w-40 mx-auto pb-1"></p>
                    <span className="text-xs text-slate-400 font-medium">الختم والتوقيع</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
