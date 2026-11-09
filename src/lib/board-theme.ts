export type BoardTheme = "light" | "dark";

export function normalizeBoardTheme(
  value: string | null | undefined
): BoardTheme {
  return value?.trim().toLowerCase() === "light" ? "light" : "dark";
}

/** Tailwind class sets for info board UI (dark = default lobby look). */
export function boardTone(theme: BoardTheme) {
  if (theme === "light") {
    return {
      root: "text-slate-900",
      heading: "text-slate-900",
      label: "text-slate-600",
      body: "text-slate-800",
      bodySoft: "text-slate-700",
      faint: "text-slate-500",
      ghost: "text-slate-500",
      marquee: "text-slate-800/90",
      headerSub: "text-slate-400",
      announcementBar:
        "border-slate-200/90 bg-white/75 backdrop-blur-sm",
      logoBox: "bg-white ring-slate-200/90",
      entryRow: "border-slate-200/70 bg-white/50",
      entryRowTop: "border-slate-300/90 bg-white/80",
      entryRowLive: "border-slate-400/50 bg-white",
      footerBorder: "border-slate-200/80",
      divider: "bg-slate-200/90",
      progressTrack: "bg-slate-200/90",
      scanPhotoBg: "bg-slate-100/80",
      canvasBg: `
            radial-gradient(ellipse 80% 50% at 10% -10%, var(--board-accent-soft), transparent 50%),
            radial-gradient(ellipse 60% 40% at 90% 100%, var(--board-accent-soft), transparent 45%),
            linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)
          `,
      previewShell: "border-slate-200 bg-[#f1f5f9] text-slate-900",
    };
  }

  return {
    root: "text-white",
    heading: "text-white",
    label: "text-white/45",
    body: "text-white/85",
    bodySoft: "text-white/75",
    faint: "text-white/35",
    ghost: "text-white/30",
    marquee: "text-white/85",
    headerSub: "text-white/35",
    announcementBar:
      "border-white/[0.06] bg-black/25 backdrop-blur-sm",
    logoBox: "bg-white/5 ring-white/10",
    entryRow: "border-white/[0.06] bg-white/[0.02]",
    entryRowTop: "border-white/12 bg-white/[0.05]",
    entryRowLive: "border-white/20 bg-white/[0.08]",
    footerBorder: "border-white/[0.06]",
    divider: "bg-white/[0.08]",
    progressTrack: "bg-white/10",
    scanPhotoBg: "bg-black/20",
    canvasBg: `
            radial-gradient(ellipse 80% 50% at 10% -10%, var(--board-accent-soft), transparent 50%),
            radial-gradient(ellipse 60% 40% at 90% 100%, var(--board-accent-soft), transparent 45%),
            linear-gradient(180deg, #0a0d14 0%, #06080c 100%)
          `,
    previewShell: "border-white/10 bg-[#080a0f] text-white",
  };
}
