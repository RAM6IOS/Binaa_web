import { ProjectStatus } from "@/lib/types/projects";

interface Props {
  status: ProjectStatus;
  isAr: boolean;
}

export function ProjectStatusBadge({ status, isAr }: Props) {
  const statusConfig: Record<ProjectStatus, { color: string; label: string }> = {
    planning: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", label: isAr ? 'قيد التخطيط' : 'En planification' },
    in_progress: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: isAr ? 'قيد الإنجاز' : 'En cours' },
    delayed: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", label: isAr ? 'متأخر' : 'En retard' },
    completed: { color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", label: isAr ? 'مكتمل' : 'Terminé' },
    cancelled: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", label: isAr ? 'ملغى' : 'Annulé' },
  };

  const config = statusConfig[status] || { color: "bg-slate-100 text-slate-700", label: status };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
