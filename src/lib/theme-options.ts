import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "@/components/theme-provider";

export const THEME_OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "dark",
    label: "Semi-dark",
    description: "Modern slate — default",
    icon: Moon,
  },
  {
    value: "light",
    label: "Light",
    description: "Bright workspace",
    icon: Sun,
  },
  {
    value: "system",
    label: "System",
    description: "Match device setting",
    icon: Monitor,
  },
];

export function getThemeOption(theme: Theme) {
  return THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[0];
}
