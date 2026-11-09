"use client";

import { useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { APP_NAME } from "@/lib/app-brand";
import { AppLogo } from "@/components/layout/app-logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      toast({
        title: "Login failed",
        description: "Invalid email or password.",
        variant: "destructive",
      });
      return;
    }

    if (result?.ok === false || result?.url?.includes("csrf")) {
      setLoading(false);
      toast({
        title: "Login blocked (wrong app URL)",
        description:
          "Use http://localhost:3000 (run npm run dev) or remove NEXTAUTH_URL from .env and restart the server.",
        variant: "destructive",
      });
      return;
    }

    const session = await getSession();
    if (session?.user?.role === "SCANNER") {
      await signOut({ redirect: false });
      setLoading(false);
      toast({
        title: "Use the scanner station",
        description: "Scanner accounts sign in at /scanner, not the dashboard.",
        variant: "destructive",
      });
      return;
    }

    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <AppLogo className="mx-auto w-[220px]" />
          <div>
            <CardTitle className="sr-only">{APP_NAME}</CardTitle>
            <CardDescription className="mt-1">
              Dashboard login — manage student IDs across your schools
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@demo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo: admin@demo.org / password123
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            QR scanner station?{" "}
            <Link href="/scanner" className="underline underline-offset-2">
              Open /scanner
            </Link>
          </p>
          <Button
            type="button"
            variant="link"
            className="mt-2 w-full text-xs"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Clear saved session and try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
