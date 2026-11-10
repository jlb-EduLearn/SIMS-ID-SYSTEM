"use client";

import { useState } from "react";
import Link from "next/link";
import { getSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ScanLine } from "lucide-react";
import { APP_NAME } from "@/lib/app-brand";

export function ScannerLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: username.trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Invalid scanner username or password.");
      return;
    }

    const session = await getSession();
    if (session?.user?.role !== "SCANNER") {
      await signOut({ redirect: false });
      setLoading(false);
      setError("Dashboard accounts use /login. This page is for scanner stations only.");
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#1e3a5f_0%,#0b1220_55%)] p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur"
      >
        <div className="mb-8 space-y-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/SIMS-white-colored-blue.png"
            alt={`${APP_NAME} logo`}
            className="mx-auto w-[180px] object-contain"
          />
          <div>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
              <ScanLine className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Scanner Station
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Sign in with your school scanner credentials. On a tablet, use
              landscape mode and Add to Home Screen for an offline-capable app.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scanner-username" className="text-slate-200">
              Username
            </Label>
            <Input
              id="scanner-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="age-scanner1"
              autoComplete="username"
              required
              className="border-white/15 bg-black/30 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scanner-password" className="text-slate-200">
              Password
            </Label>
            <Input
              id="scanner-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="border-white/15 bg-black/30 text-white placeholder:text-slate-500"
            />
          </div>

          {error && (
            <p className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 text-white hover:bg-sky-400"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Open Scanner
          </Button>

          <p className="text-center text-xs text-slate-400">
            Dashboard login is at{" "}
            <Link href="/login" className="text-sky-300 underline underline-offset-2">
              /login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
