import { TaskPriority } from "@/lib/types/projects";

interface Props {
  priority: TaskPriority;
  isAr: boolean;
}

export function TaskPriorityBadge({ priority, isAr }: Props) {
  const config: Record<TaskPriority, { color: string; label: string }> = {
    low: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", label: isAr ? 'منخفضة' : 'Basse' },
    medium: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: isAr ? 'متوسطة' : 'Moyenne' },
    high: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", label: isAr ? 'عالية' : 'Haute' },
    urgent: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", label: isAr ? 'عاجلة' : 'Urgente' },
  };

  const badgeConfig = config[priority] || { color: "bg-slate-100 text-slate-700", label: priority };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${badgeConfig.color}`}>
      {badgeConfig.label}
    </span>
  );
}
