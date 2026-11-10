import type { Metadata, Viewport } from "next";
import { RegisterScannerSw } from "@/components/scanner/register-scanner-sw";
import { APP_NAME } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: `${APP_NAME} Scanner`,
  applicationName: `${APP_NAME} Scanner`,
  appleWebApp: {
    capable: true,
    title: `${APP_NAME} Scanner`,
    statusBarStyle: "black-translucent",
  },
  manifest: "/scanner-manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b1220",
  viewportFit: "cover",
};

/** Full-screen landscape scanner station — no app chrome. */
export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#0b1220] text-white">
      <RegisterScannerSw />
      {children}
    </div>
  );
}
