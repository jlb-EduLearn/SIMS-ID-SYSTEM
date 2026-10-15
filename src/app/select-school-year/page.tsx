"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Calendar, Loader2, Plus, Search, Users } from "lucide-react";
import { AuthHeader } from "@/components/layout/auth-header";

interface SchoolYear {
  id: string;
  name: string;
  isCurrent: boolean;
  _count: { students: number };
}

export default function SelectSchoolYearPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState("2025-2026");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/school-years")
      .then(async (r) => {
        if (r.status === 401) {
          toast({
            title: "Session expired",
            description: "Please sign in again.",
            variant: "destructive",
          });
          await signOut({ callbackUrl: "/login" });
          return null;
        }
        if (r.status === 403) {
          toast({
            title: "Select a school again",
            description: "Your saved school was no longer valid.",
            variant: "destructive",
          });
          await update({
            currentSchoolId: null,
            currentSchoolName: null,
            currentSchoolYearId: null,
            currentSchoolYearName: null,
          });
          router.replace("/select-school");
          return null;
        }
        if (!r.ok) {
          throw new Error("Failed to load school years");
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setYears(data.schoolYears || []);
        setLoading(false);
      })
      .catch(() => {
        toast({ title: "Failed to load school years", variant: "destructive" });
        setLoading(false);
      });
  }, [router, update]);

  const filtered = years.filter((y) =>
    y.name.includes(search)
  );

  async function selectYear(year: SchoolYear) {
    setSelecting(year.id);

    const res = await fetch("/api/school-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolYearId: year.id }),
    });

    if (!res.ok) {
      toast({ title: "Failed to select school year", variant: "destructive" });
      setSelecting(null);
      return;
    }

    await update({
      currentSchoolYearId: year.id,
      currentSchoolYearName: year.name,
    });

    router.push("/dashboard");
    router.refresh();
  }

  async function createYear() {
    setCreating(true);
    const res = await fetch("/api/school-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newYear, isCurrent: true }),
    });

    setCreating(false);

    if (!res.ok) {
      const err = await res.json();
      toast({ title: err.error || "Failed to create", variant: "destructive" });
      return;
    }

    const year = await res.json();
    setYears((y) => [year, ...y]);
    setShowCreate(false);
    const staffCopy = year.staffCopy as
      | { created?: number; updated?: number; total?: number }
      | undefined;
    if (staffCopy?.total) {
      toast({
        title: `School year ${newYear} created`,
        description: `${staffCopy.created ?? 0} employees added, ${staffCopy.updated ?? 0} updated from the prior year.`,
      });
    } else {
      toast({ title: `School year ${newYear} created` });
    }
    selectYear(year);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <AuthHeader
        title="Manage school years"
        subtitle={session?.user?.currentSchoolName || undefined}
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3">
            {session?.user?.currentSchoolName}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Manage school years
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choose the active year or add a new one. Records are separate per
            year (e.g. 2025–2026).
          </p>
        </div>

        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search school year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Year
          </Button>
        </div>

        {showCreate && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>New School Year</Label>
                <Input
                  placeholder="2025-2026"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Employees (teachers and admin staff) are copied automatically
                  from the latest prior year — same ID, photo, and access card
                  fields.
                </p>
              </div>
              <Button onClick={createYear} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Select
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                No school years yet. Create one to get started.
              </p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add School Year
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((year) => (
              <Card
                key={year.id}
                className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
                onClick={() => !selecting && selectYear(year)}
              >
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {year.name}
                        {year.isCurrent && (
                          <Badge className="text-xs">Current</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {year._count.students} students
                      </CardDescription>
                    </div>
                  </div>
                  {selecting === year.id && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
