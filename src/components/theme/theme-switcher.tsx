"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { THEME_OPTIONS, getThemeOption } from "@/lib/theme-options";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeSwitcherProps = {
  /** Compact icon + menu for headers */
  variant?: "menu" | "segmented";
  className?: string;
};

export function ThemeSwitcher({
  variant = "menu",
  className,
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = getThemeOption(theme);
  const ActiveIcon = active.icon;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function select(next: Theme) {
    setTheme(next);
    setOpen(false);
  }

  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "inline-flex rounded-lg border bg-muted/40 p-1",
          className
        )}
        role="group"
        aria-label="Theme"
      >
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.label}
              aria-pressed={selected}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground"
        aria-label={`Theme: ${active.label}. Change theme`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <ActiveIcon className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="listbox"
          aria-label="Choose theme"
          className="absolute right-0 top-full z-[60] mt-1 w-52 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => select(option.value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  selected && "bg-accent/60"
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {option.label}
                    {selected && (
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
