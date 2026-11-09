"use client";

import { useSession, signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScannerLogin } from "@/components/scanner/scanner-login";
import { ScannerStation } from "@/components/scanner/scanner-station";

export default function ScannerPage() {
  const { data: session, status, update } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-sky-300" />
      </div>
    );
  }

  if (status !== "authenticated" || !session?.user) {
    return (
      <ScannerLogin
        onSuccess={async () => {
          await update();
        }}
      />
    );
  }

  if (session.user.role !== "SCANNER") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-md text-slate-200">
          This station is only for scanner accounts. Sign out and use a
          scanner username created under School Users → Scanner.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <a href="/dashboard">Go to dashboard</a>
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white"
            onClick={() => signOut({ callbackUrl: "/scanner" })}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (!session.user.currentSchoolId) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-md text-amber-100">
          This scanner account is not assigned to a school. Ask a school
          admin to recreate it under School Users for the correct campus.
        </p>
        <Button
          variant="outline"
          className="border-white/20 bg-transparent text-white"
          onClick={() => signOut({ callbackUrl: "/scanner" })}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return <ScannerStation />;
}
