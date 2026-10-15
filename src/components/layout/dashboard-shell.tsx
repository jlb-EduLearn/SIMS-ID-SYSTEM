"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  IdCard,
  LayoutDashboard,
  Users,
  Palette,
  Printer,
  ClipboardList,
  UserCog,
  Building2,
  Calendar,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/app-brand";
import { AppLogo } from "@/components/layout/app-logo";
import { SCHOOL_LOGO_UPDATED_EVENT } from "@/lib/school-events";

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: Users },
  { href: "/dashboard/templates", label: "Templates", icon: Palette },
  { href: "/dashboard/print", label: "Print IDs", icon: Printer },
  { href: "/dashboard/print-logs", label: "Print Logs", icon: ClipboardList },
  {
    href: "/dashboard/users",
    label: "School Users",
    icon: UserCog,
    roles: ["ADMIN", "SCHOOL_ADMIN"] as const,
  },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function SchoolLogo({
  logoUrl,
  schoolName,
  className,
  iconClassName,
}: {
  logoUrl: string | null;
  schoolName?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={schoolName ? `${schoolName} logo` : "School logo"}
        className={cn("shrink-0 rounded-md object-contain", className)}
      />
    );
  }
  return <IdCard className={cn("shrink-0", iconClassName)} />;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasMultipleSchools, setHasMultipleSchools] = useState(false);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const role = session?.user?.role ?? "";
  const isMasterAdmin = role === "ADMIN";
  const canSwitchSchool = isMasterAdmin || hasMultipleSchools;
  const navItems = baseNavItems.filter(
    (item) =>
      !("roles" in item) ||
      (item.roles as readonly string[]).includes(role)
  );

  useEffect(() => {
    if (!session?.user?.currentSchoolId) {
      setSchoolLogoUrl(null);
      return;
    }

    let cancelled = false;
    fetch("/api/school-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setSchoolLogoUrl(data?.school?.logoUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setSchoolLogoUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.currentSchoolId]);

  useEffect(() => {
    function onLogoUpdated(event: Event) {
      setSchoolLogoUrl((event as CustomEvent<string | null>).detail ?? null);
    }
    window.addEventListener(SCHOOL_LOGO_UPDATED_EVENT, onLogoUpdated);
    return () =>
      window.removeEventListener(SCHOOL_LOGO_UPDATED_EVENT, onLogoUpdated);
  }, []);

  useEffect(() => {
    if (!session?.user?.id || isMasterAdmin) return;

    let cancelled = false;
    fetch("/api/schools")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setHasMultipleSchools((data.schools?.length ?? 0) > 1);
        }
      })
      .catch(() => {
        if (!cancelled) setHasMultipleSchools(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isMasterAdmin]);

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="min-h-screen bg-slate-50/80">
      {/* Always-visible top bar */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <SchoolLogo
            logoUrl={schoolLogoUrl}
            schoolName={session?.user?.currentSchoolName}
            className="h-8 w-8"
            iconClassName="h-5 w-5 text-primary"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {session?.user?.currentSchoolName || "No school selected"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {session?.user?.currentSchoolYearName || "No year selected"}
            </p>
          </div>

          {canSwitchSchool && (
            <Link href="/select-school">
              <Button variant="outline" size="sm" className="shrink-0">
                <RefreshCw className="h-3.5 w-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Switch School</span>
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r bg-white pt-14 transition-transform lg:static lg:translate-x-0 lg:pt-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="hidden h-16 items-center border-b px-4 lg:flex">
            <AppLogo className="h-10 w-[140px]" imageClassName="object-left" />
            <span className="sr-only">{APP_NAME}</span>
          </div>

          <div className="space-y-3 border-b p-4">
            <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                School
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                {schoolLogoUrl && (
                  <SchoolLogo
                    logoUrl={schoolLogoUrl}
                    schoolName={session?.user?.currentSchoolName}
                    className="h-7 w-7"
                  />
                )}
                <p className="truncate text-sm font-semibold">
                  {session?.user?.currentSchoolName}
                </p>
              </div>
              {canSwitchSchool && (
                <Link href="/select-school" onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs font-medium"
                  >
                    Switch school
                  </Button>
                </Link>
              )}
            </div>

            <div className="rounded-xl border bg-gradient-to-br from-indigo-50/50 to-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                School Year
              </div>
              <p className="mt-1 truncate text-sm font-semibold">
                {session?.user?.currentSchoolYearName || "No year selected"}
              </p>
              <Link
                href="/select-school-year"
                onClick={() => setMobileOpen(false)}
              >
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs font-medium"
                >
                  Manage years
                </Button>
              </Link>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-4 lg:hidden">
            <p className="truncate text-sm font-medium">{session?.user?.name}</p>
            <p className="mb-3 truncate text-xs text-muted-foreground">
              {session?.user?.email}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <main className="flex-1 overflow-auto">
          {session?.user?.currentSchoolYearId ? (
            <div className="border-b bg-indigo-50/90 px-4 py-2 text-center text-sm text-muted-foreground">
              Working in{" "}
              <span className="font-semibold text-foreground">
                {session.user.currentSchoolYearName}
              </span>
              {" · "}
              <Link
                href="/select-school-year"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Manage years
              </Link>
            </div>
          ) : session?.user?.currentSchoolId ? (
            <div className="border-b bg-amber-50/90 px-4 py-2 text-center text-sm text-muted-foreground">
              No school year selected.{" "}
              <Link
                href="/select-school-year"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Choose or create a year
              </Link>
            </div>
          ) : null}
          <div className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
