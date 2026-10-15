"use client";

import { useEffect, useState } from "react";

/**
 * Dev-only hint when Tailwind/CSS failed to load (broken .next cache).
 */
export function StylesGuard() {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const link = document.querySelector<HTMLLinkElement>(
      'link[href*="/_next/static/css/"]'
    );
    if (!link?.href) return;

    fetch(link.href, { method: "HEAD" })
      .then((res) => {
        if (!res.ok) setBroken(true);
      })
      .catch(() => setBroken(true));
  }, []);

  if (!broken) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[200] border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 shadow-md"
    >
      Styles failed to load. Stop the server, run{" "}
      <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
        npm run dev:clean
      </code>
      , then hard-refresh (Cmd+Shift+R) at{" "}
      <strong>http://localhost:3000</strong>
    </div>
  );
}
