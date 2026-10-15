import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_DESCRIPTION, APP_LOGO_PATH, APP_NAME } from "@/lib/app-brand";
import { themeInitScript } from "@/lib/theme-script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000"
  ),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_NAME,
    siteName: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    images: [{ url: APP_LOGO_PATH, alt: `${APP_NAME} logo` }],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [APP_LOGO_PATH],
  },
  icons: {
    icon: APP_LOGO_PATH,
    apple: APP_LOGO_PATH,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
