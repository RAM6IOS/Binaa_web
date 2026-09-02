import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { TaskPriority } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  priority: TaskPriority;
  isAr: boolean;
}

export function TaskPriorityBadge({ priority, isAr }: Props) {
  const config: Record<
    TaskPriority,
    { variant: "secondary" | "info" | "warning" | "destructive"; label: string; icon: React.ReactNode }
  > = {
    low: { variant: "secondary", label: isAr ? 'منخفضة' : 'Basse', icon: <ArrowDown className="h-3 w-3" /> },
    medium: { variant: "info", label: isAr ? 'متوسطة' : 'Moyenne', icon: <Minus className="h-3 w-3" /> },
    high: { variant: "warning", label: isAr ? 'عالية' : 'Haute', icon: <ArrowUp className="h-3 w-3" /> },
    urgent: { variant: "destructive", label: isAr ? 'عاجلة' : 'Urgente', icon: <AlertTriangle className="h-3 w-3" /> },
  };

  const badgeConfig = config[priority] || { variant: "secondary" as const, label: priority, icon: null };

  return (
    <Badge variant={badgeConfig.variant} className="gap-1">
      {badgeConfig.icon}
      {badgeConfig.label}
    </Badge>
  );
}