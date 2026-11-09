import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Entry info board",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080a0f",
};

/** Full-screen landscape signage — no app chrome. */
export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="info-board-shell min-h-[100dvh] overflow-hidden">{children}</div>
  );
}
