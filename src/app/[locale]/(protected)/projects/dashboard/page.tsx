"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart } from "@/components/ui/area-chart";
import { CopySlash, AlertTriangle, CheckCircle2, Factory, Loader2, AlertCircle, Users, HardHat, Construction } from "lucide-react";
import { projectsService } from "@/lib/services/projects-service";
import { workersService } from "@/lib/services/workers-service";
import { equipmentService } from "@/lib/services/equipment-service";
import { Project } from "@/lib/types/projects";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [projects, setProjects] = useState<Project[]>([]);
  const [workerCount, setWorkerCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [projectsData, workersData, equipmentData] = await Promise.all([
          projectsService.getAll(),
          workersService.getAll(),
          equipmentService.getAll()
        ]);
        setProjects(projectsData);
        setWorkerCount(workersData.length);
        setEquipmentCount(equipmentData.length);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(isAr ? "فشل في تحميل بيانات لوحة القيادة" : "Échec du chargement des données du tableau de bord");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAr]);

  const totalProjects = projects.length;
  const delayedProjects = projects.filter(p => p.status === 'delayed').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0) / 1000000;
  const totalSpent = projects.reduce((acc, p) => acc + (p.actual_cost || 0), 0) / 1000000;

  // Process chart data from real projects
  const chartData = projects.reduce((acc: any[], project) => {
    const date = new Date(project.start_date);
    const month = date.toLocaleString(locale === 'ar' ? 'ar-EG' : 'fr-FR', { month: 'short' });
    const existing = acc.find(d => d.month === month);
    if (existing) {
      existing.budget += project.budget / 1000000;
      existing.spent += (project.actual_cost || 0) / 1000000;
    } else {
      acc.push({ month, budget: project.budget / 1000000, spent: (project.actual_cost || 0) / 1000000 });
    }
    return acc;
  }, []).sort((a, b) => {
    const months = locale === 'ar' 
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(a.month) - months.indexOf(b.month);
  });

  const stats = [
    {
      title: isAr ? 'إجمالي المشاريع' : 'Total des projets',
      value: isLoading ? "-" : totalProjects.toString(),
      icon: Construction,
      color: "text-blue-500"
    },
    {
      title: isAr ? 'مشاريع متأخرة' : 'Projets en retard',
      value: isLoading ? "-" : delayedProjects.toString(),
      icon: AlertTriangle,
      color: "text-red-500"
    },
    {
      title: isAr ? 'مشاريع مكتملة' : 'Projets terminés',
      value: isLoading ? "-" : completedProjects.toString(),
      icon: CheckCircle2,
      color: "text-green-500"
    },
    {
      title: isAr ? 'إجمالي الميزانية (مليون دج)' : 'Budget total (M DZD)',
      value: isLoading ? "-" : totalBudget.toFixed(2),
      icon: CopySlash,
      color: "text-slate-500"
    }
  ];

  const quickStats = [
    { label: isAr ? 'العمال' : 'Ouvriers', value: workerCount, icon: Users },
    { label: isAr ? 'المعدات' : 'Équipement', value: equipmentCount, icon: HardHat },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{isAr ? "خطأ" : "Erreur"}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isAr ? 'لوحة القيادة' : 'Tableau de bord'}
        </h2>
        <p className="text-slate-500 mt-2">
          {isAr ? 'مرحبا بك في نظام إدارة المشاريع الخاصة بك، إليك ملخص اليوم.' : 'Bienvenue sur votre système de gestion de projets, voici le résumé du jour.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="hover:shadow-md transition-shadow border-none bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-4 flex-wrap">
        {quickStats.map((stat, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
            <stat.icon className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{stat.label}:</span>
            <span className="text-sm font-bold text-blue-600">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-1 md:col-span-4 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>{isAr ? 'تتبع الميزانية' : 'Suivi du budget'}</CardTitle>
            <CardDescription>
              {isAr ? 'الميزانية المخطط لها مقابل المصاريف الفعلية هذا العام' : 'Budget prévu contre dépenses réelles cette année'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <AreaChart
              data={chartData.length > 0 ? chartData : [{month: 'Jan', budget: 0, spent: 0}]}
              series={[
                { key: "budget", color: "#3b82f6", name: isAr ? 'الميزانية' : 'Budget' },
                { key: "spent", color: "#ef4444", name: isAr ? 'الإنفاق' : 'Dépenses' },
              ]}
              xKey="month"
              height={350}
            />
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>{isAr ? 'أحدث المشاريع' : 'Projets récents'}</CardTitle>
            <CardDescription>{isAr ? 'حالة المشاريع النشطة' : 'Statut des projets actifs'}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {projects.slice(0, 5).map(project => (
                  <div key={project.id} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 -mx-2 px-2 py-1 rounded transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-slate-500">{project.wilaya} • {project.expected_end_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <ProgressBar progress={project.progress} status={project.status} className="w-24" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
