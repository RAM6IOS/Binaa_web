import { AlertTriangle, CheckCircle2, Circle, Play } from "lucide-react";
import { TaskStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: TaskStatus;
  isAr: boolean;
}

export function TaskStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<
    TaskStatus,
    { variant: "secondary" | "info" | "success" | "destructive"; label: string; icon: React.ReactNode }
  > = {
    todo: { variant: "secondary", label: isAr ? 'للقيام بها' : 'À faire', icon: <Circle className="h-3 w-3" /> },
    in_progress: { variant: "info", label: isAr ? 'قيد الإنجاز' : 'En cours', icon: <Play className="h-3 w-3" /> },
    done: { variant: "success", label: isAr ? 'مكتملة' : 'Terminée', icon: <CheckCircle2 className="h-3 w-3" /> },
    delayed: { variant: "destructive", label: isAr ? 'متأخرة' : 'En retard', icon: <AlertTriangle className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || { variant: "secondary" as const, label: status, icon: null };

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}