import { ProjectType } from "@/lib/types/projects";

interface Props {
  type: ProjectType;
  isAr: boolean;
}

export function ProjectTypeBadge({ type, isAr }: Props) {
  const typeConfig: Record<ProjectType, { color: string; label: string }> = {
    road: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", label: isAr ? 'طرق' : 'Route' },
    bridge: { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300", label: isAr ? 'جسور' : 'Pont' },
    housing: { color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300", label: isAr ? 'سكن' : 'Logement' },
    school: { color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300", label: isAr ? 'مدرسة' : 'École' },
    hospital: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300", label: isAr ? 'مستشفى' : 'Hôpital' },
    infrastructure: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: isAr ? 'بنية تحتية' : 'Infrastructure' },
  };

  const config = typeConfig[type] || { color: "bg-slate-100 text-slate-700", label: type };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
