import { MaintenanceStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: MaintenanceStatus;
  isAr: boolean;
}

export function MaintenanceStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<MaintenanceStatus, { variant: "success" | "warning" | "destructive" | "secondary"; label: string }> = {
    up_to_date: { variant: "success", label: isAr ? 'محدث' : 'À jour' },
    due_soon: { variant: "warning", label: isAr ? 'قريباً' : 'Prochainement' },
    overdue: { variant: "destructive", label: isAr ? 'متأخر' : 'En retard' },
  };

  const config = statusConfig[status] || { variant: "secondary", label: status };

  return (
    <Badge variant={config.variant as any}>
      {config.label}
    </Badge>
  );
}
