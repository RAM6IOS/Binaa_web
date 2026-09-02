import { CalendarRange, HardHat, Clock4, CheckCircle2, Ban } from "lucide-react";
import { ProjectStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: ProjectStatus;
  isAr: boolean;
}

export function ProjectStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<
    ProjectStatus,
    { variant: "info" | "secondary" | "warning" | "success" | "destructive"; label: string; icon: React.ReactNode }
  > = {
    planning: { variant: "secondary", label: isAr ? 'قيد التخطيط' : 'En planification', icon: <CalendarRange className="h-3 w-3" /> },
    in_progress: { variant: "info", label: isAr ? 'قيد الإنجاز' : 'En cours', icon: <HardHat className="h-3 w-3" /> },
    delayed: { variant: "warning", label: isAr ? 'متأخر' : 'En retard', icon: <Clock4 className="h-3 w-3" /> },
    completed: { variant: "success", label: isAr ? 'مكتمل' : 'Terminé', icon: <CheckCircle2 className="h-3 w-3" /> },
    cancelled: { variant: "destructive", label: isAr ? 'ملغى' : 'Annulé', icon: <Ban className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || { variant: "secondary", label: status, icon: null };

  return (
    <Badge variant={config.variant as any} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
