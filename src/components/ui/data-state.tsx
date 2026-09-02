import { AlertTriangle, Inbox } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function DataStateLoading({
  className,
  rows = 3,
  rowClassName,
}: {
  className?: string;
  rows?: number;
  rowClassName?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-14 w-full", rowClassName)} />
      ))}
    </div>
  );
}

function DataStateError({
  title,
  message,
  retryLabel = "Retry",
  onRetry,
  className,
}: {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-base">{title}</AlertTitle>
      {message ? <AlertDescription>{message}</AlertDescription> : null}
      {onRetry ? (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}

function DataStateEmpty({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-center",
        className
      )}
      role="status"
    >
      {icon ?? <Inbox className="h-12 w-12 text-muted-foreground" />}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export const DataState = {
  Loading: DataStateLoading,
  Error: DataStateError,
  Empty: DataStateEmpty,
};