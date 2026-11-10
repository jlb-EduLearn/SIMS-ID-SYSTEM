"use client";

import { useEffect } from "react";

/** Registers the scanner service worker for offline shell caching. */
export function RegisterScannerSw() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw-scanner.js").catch(() => {
      /* ignore SW registration failures */
    });
  }, []);

  return null;
}
