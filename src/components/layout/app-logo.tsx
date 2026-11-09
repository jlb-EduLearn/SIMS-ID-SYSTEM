"use client";

import { APP_LOGO_PATH, APP_LOGO_PATH_DARK, APP_NAME } from "@/lib/app-brand";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function AppLogo({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  const { resolvedTheme } = useTheme();
  const src =
    resolvedTheme === "dark" ? APP_LOGO_PATH_DARK : APP_LOGO_PATH;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${APP_NAME} logo`}
      className={cn("object-contain", imageClassName, className)}
    />
  );
}
