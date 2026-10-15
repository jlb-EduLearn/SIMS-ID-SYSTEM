"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { StylesGuard } from "@/components/layout/styles-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <StylesGuard />
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}
