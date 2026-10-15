import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export function WorkflowTip({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? (
          <p className="font-medium text-foreground">{title}</p>
        ) : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
