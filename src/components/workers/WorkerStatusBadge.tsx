import { CircleCheck, CircleX, HardHat, CalendarOff } from "lucide-react";
import { WorkerStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: WorkerStatus;
  isAr: boolean;
}

export function WorkerStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<
    WorkerStatus,
    { variant: "success" | "info" | "destructive" | "secondary" | "warning"; label: string; icon: React.ReactNode }
  > = {
    available: { variant: "success", label: isAr ? 'متاح' : 'Disponible', icon: <CircleCheck className="h-3 w-3" /> },
    on_project: { variant: "info", label: isAr ? 'في مشروع' : 'Sur projet', icon: <HardHat className="h-3 w-3" /> },
    unavailable: { variant: "destructive", label: isAr ? 'غير متاح' : 'Indisponible', icon: <CircleX className="h-3 w-3" /> },
    vacation: { variant: "warning", label: isAr ? 'في إجازة' : 'En congé', icon: <CalendarOff className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || { variant: "secondary", label: status, icon: null };

  return (
    <Badge variant={config.variant as any} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}