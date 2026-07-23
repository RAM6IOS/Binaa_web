import { fetchDashboardData } from "@/lib/services/dashboard-server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  let data;
  try {
    data = await fetchDashboardData();
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    const isAr = locale === 'ar';
    return (
      <div className="space-y-8 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{isAr ? "خطأ" : "Erreur"}</AlertTitle>
          <AlertDescription>
            {isAr ? "فشل في تحميل بيانات لوحة القيادة" : "Échec du chargement des données du tableau de bord"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <DashboardClient
      projects={data.projects}
      workerCount={data.workerCount}
      equipmentCount={data.equipmentCount}
      locale={locale}
    />
  );
}
