import { AlertTriangle, CircleCheck, Clock } from "lucide-react";
import { MaintenanceStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: MaintenanceStatus;
  isAr: boolean;
}

export function MaintenanceStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<MaintenanceStatus, { variant: "success" | "warning" | "destructive" | "secondary"; label: string; icon: React.ReactNode }> = {
    up_to_date: { variant: "success", label: isAr ? 'محدث' : 'À jour', icon: <CircleCheck className="h-3 w-3" /> },
    due_soon: { variant: "warning", label: isAr ? 'قريباً' : 'Prochainement', icon: <Clock className="h-3 w-3" /> },
    overdue: { variant: "destructive", label: isAr ? 'متأخر' : 'En retard', icon: <AlertTriangle className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || { variant: "secondary" as const, label: status, icon: null };

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}