import { EquipmentStatus } from "@/lib/types/projects";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: EquipmentStatus;
  isAr: boolean;
}

export function EquipmentStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<EquipmentStatus, { variant: "success" | "warning" | "destructive" | "secondary" | "info"; label: string }> = {
    available: { variant: "success", label: isAr ? 'متاح' : 'Disponible' },
    in_use: { variant: "info", label: isAr ? 'قيد الاستخدام' : 'En service' },
    maintenance: { variant: "warning", label: isAr ? 'صيانة' : 'Maintenance' },
    out_of_service: { variant: "destructive", label: isAr ? 'خارج الخدمة' : 'Hors service' },
  };

  const config = statusConfig[status] || { variant: "secondary", label: status };

  return (
    <Badge variant={config.variant as any}>
      {config.label}
    </Badge>
  );
}
