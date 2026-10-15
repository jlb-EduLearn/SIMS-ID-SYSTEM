import { APP_LOGO_PATH, APP_NAME } from "@/lib/app-brand";
import { cn } from "@/lib/utils";

export function AppLogo({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={APP_LOGO_PATH}
      alt={`${APP_NAME} logo`}
      className={cn("object-contain", imageClassName, className)}
    />
  );
}
