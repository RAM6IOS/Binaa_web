import { WorkerStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: WorkerStatus;
  isAr: boolean;
}

export function WorkerStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<WorkerStatus, { variant: "success" | "info" | "destructive" | "secondary" | "warning"; label: string }> = {
    available: { variant: "success", label: isAr ? 'متاح' : 'Disponible' },
    on_project: { variant: "info", label: isAr ? 'في مشروع' : 'Sur projet' },
    unavailable: { variant: "destructive", label: isAr ? 'غير متاح' : 'Indisponible' },
    vacation: { variant: "warning", label: isAr ? 'في إجازة' : 'En congé' },
  };

  const config = statusConfig[status] || { variant: "secondary", label: status };

  return (
    <Badge variant={config.variant as any}>
      {config.label}
    </Badge>
  );
}
