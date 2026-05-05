interface Props {
  progress: number;
  status: 'planned' | 'in_progress' | 'delayed' | 'completed' | string;
  className?: string;
  showText?: boolean;
}

export function ProgressBar({ progress, status, className = "", showText = true }: Props) {
  let color = "bg-blue-500";
  if (status === 'delayed') color = "bg-red-500";
  else if (status === 'completed' || progress === 100) color = "bg-green-500";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex-1 drop-shadow-sm border border-slate-200 dark:border-slate-700">
        <div 
          className={`h-full ${color} transition-all duration-500 ease-in-out`} 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
        />
      </div>
      {showText && <span className="text-xs font-semibold w-8 text-right rtl:text-left">{progress}%</span>}
    </div>
  );
}
