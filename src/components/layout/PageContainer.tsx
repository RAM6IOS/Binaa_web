import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

type PageHeaderConfig = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

type PageContainerProps = {
  children: React.ReactNode;
  header?: PageHeaderConfig;
  dir?: "rtl" | "ltr";
  className?: string;
  bodyClassName?: string;
};

export function PageContainer({
  children,
  header,
  dir = "ltr",
  className,
  bodyClassName,
}: PageContainerProps) {
  return (
    <div dir={dir} className={cn("space-y-6 pb-12", className)}>
      {header ? (
        <PageHeader
          title={header.title}
          description={header.description}
          actions={header.actions}
          dir={dir}
        />
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}