import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  dir?: "rtl" | "ltr";
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  dir = "ltr",
  className,
}: PageHeaderProps) {
  return (
    <div
      dir={dir}
      className={cn(
        "flex flex-col gap-4 border-b pb-6",
        actions
          ? "sm:flex-row sm:items-center sm:justify-between"
          : "sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}