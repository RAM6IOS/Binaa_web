import { Route, Link2, Home, School, Hospital, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectType } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  type: ProjectType;
  isAr: boolean;
}

export function ProjectTypeBadge({ type, isAr }: Props) {
  const typeConfig: Record<
    ProjectType,
    { colorClass: string; icon: React.ReactNode; label: string }
  > = {
    road: { colorClass: "bg-type-road/15 text-type-road", icon: <Route className="h-3 w-3" />, label: isAr ? 'طرق' : 'Route' },
    bridge: { colorClass: "bg-type-bridge/15 text-type-bridge", icon: <Link2 className="h-3 w-3" />, label: isAr ? 'جسور' : 'Pont' },
    housing: { colorClass: "bg-type-housing/15 text-type-housing", icon: <Home className="h-3 w-3" />, label: isAr ? 'سكن' : 'Logement' },
    school: { colorClass: "bg-type-school/15 text-type-school", icon: <School className="h-3 w-3" />, label: isAr ? 'مدرسة' : 'École' },
    hospital: { colorClass: "bg-type-hospital/15 text-type-hospital", icon: <Hospital className="h-3 w-3" />, label: isAr ? 'مستشفى' : 'Hôpital' },
    infrastructure: { colorClass: "bg-type-infrastructure/15 text-type-infrastructure", icon: <Building2 className="h-3 w-3" />, label: isAr ? 'بنية تحتية' : 'Infrastructure' },
  };

  const config = typeConfig[type] || {
    colorClass: "bg-muted text-muted-foreground",
    icon: null,
    label: type,
  };

  return (
    <Badge className={cn("gap-1 border-transparent", config.colorClass)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}