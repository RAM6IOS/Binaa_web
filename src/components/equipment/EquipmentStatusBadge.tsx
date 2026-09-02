import { CircleCheck, CircleX, Cog, Wrench } from "lucide-react";
import { EquipmentStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: EquipmentStatus;
  isAr: boolean;
}

export function EquipmentStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<EquipmentStatus, { variant: "success" | "warning" | "destructive" | "secondary" | "info"; label: string; icon: React.ReactNode }> = {
    available: { variant: "success", label: isAr ? 'متاح' : 'Disponible', icon: <CircleCheck className="h-3 w-3" /> },
    in_use: { variant: "info", label: isAr ? 'قيد الاستخدام' : 'En service', icon: <Cog className="h-3 w-3" /> },
    maintenance: { variant: "warning", label: isAr ? 'صيانة' : 'Maintenance', icon: <Wrench className="h-3 w-3" /> },
    out_of_service: { variant: "destructive", label: isAr ? 'خارج الخدمة' : 'Hors service', icon: <CircleX className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || { variant: "secondary" as const, label: status, icon: null };

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}