interface Props {
  progress: number;
  status: 'planned' | 'in_progress' | 'delayed' | 'completed' | string;
  className?: string;
  showText?: boolean;
}

export function ProgressBar({ progress, status, className = "", showText = true }: Props) {
  let fillClass = "bg-info";
  if (status === 'delayed') fillClass = "bg-destructive";
  else if (status === 'completed' || progress === 100) fillClass = "bg-success";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex-1 border border-border">
        <div
          className={`h-full ${fillClass} transition-all duration-500 ease-in-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showText && <span className="text-xs font-semibold w-8 text-right rtl:text-left text-foreground">{progress}%</span>}
    </div>
  );
}
