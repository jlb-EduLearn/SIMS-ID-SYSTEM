import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "QR Scanner Station",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
};

/** Full-screen landscape scanner station — no app chrome. */
export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#0b1220] text-white">
      {children}
    </div>
  );
}
