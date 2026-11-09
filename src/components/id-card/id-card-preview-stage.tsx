"use client";

import { cn } from "@/lib/utils";

/** Surrounds an ID card so white/light designs stay visible against the UI. */
export function IdCardPreviewStage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "id-card-stage inline-block rounded-lg p-4 print:!bg-transparent print:!p-0",
        className
      )}
    >
      <div
        className={cn(
          "inline-block overflow-hidden rounded-[2px]",
          "ring-1 ring-foreground/25 shadow-lg",
          "print:ring-0 print:shadow-none"
        )}
      >
        {children}
      </div>
    </div>
  );
}
