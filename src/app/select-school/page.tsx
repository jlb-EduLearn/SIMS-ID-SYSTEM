"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Building2, Loader2, Plus, Search, Trash2, Users } from "lucide-react";
import { AuthHeader } from "@/components/layout/auth-header";

interface School {
  id: string;
  name: string;
  code: string;
  address: string | null;
  _count: { students: number };
}

export default function SelectSchoolPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    code: "",
    address: "",
  });
  const isAdmin = session?.user?.role === "ADMIN";

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schools");
      if (res.status === 401) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        await signOut({ callbackUrl: "/login" });
        return;
      }
      if (!res.ok) throw new Error("Failed to load schools");

      const data = await res.json();
      setSchools(data.schools || []);
    } catch {
      toast({ title: "Failed to load schools", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  async function selectSchool(school: School) {
    setSelecting(school.id);

    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId: school.id }),
    });

    if (!res.ok) {
      toast({ title: "Failed to select school", variant: "destructive" });
      setSelecting(null);
      return;
    }

    await update({
      currentSchoolId: school.id,
      currentSchoolName: school.name,
      currentSchoolYearId: null,
      currentSchoolYearName: null,
      resetSchoolYear: true,
    });

    router.push("/select-school-year");
    router.refresh();
  }

  async function createSchool() {
    setSaving(true);
    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...schoolForm }),
    });
    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      toast({ title: err.error || "Failed to add school", variant: "destructive" });
      return;
    }

    toast({ title: "School added" });
    setAddOpen(false);
    setSchoolForm({ name: "", code: "", address: "" });
    loadSchools();
  }

  async function deleteSchool(school: School) {
    if (!confirm(`Delete ${school.name}? This will hide the school and its data.`)) {
      return;
    }

    const res = await fetch(`/api/schools?id=${school.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json();
      toast({
        title: err.error || "Failed to delete school",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "School deleted" });
    loadSchools();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AuthHeader title="Select a School" subtitle="Choose your school to continue" />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Select a School</h1>
          <p className="mt-2 text-muted-foreground">
            Choose which school you want to work with. All data is scoped to the
            selected school.
          </p>
          {session?.user?.organizationName && (
            <Badge variant="secondary" className="mt-3">
              {session.user.organizationName}
            </Badge>
          )}
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search schools by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add School
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No schools found matching your search.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((school) => (
              <Card
                key={school.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => !selecting && selectSchool(school)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{school.name}</CardTitle>
                        <CardDescription>{school.code}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {selecting === school.id && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSchool(school);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {school.address && (
                    <p className="mb-2 text-sm text-muted-foreground line-clamp-1">
                      {school.address}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {school._count.students} records
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add School</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">School Name</label>
                <Input
                  value={schoolForm.name}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, name: e.target.value })
                  }
                  placeholder="e.g. Aspen Grove Elementary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">School Code</label>
                <Input
                  value={schoolForm.code}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, code: e.target.value })
                  }
                  placeholder="e.g. AGE"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={schoolForm.address}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, address: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={createSchool}
                  disabled={saving || !schoolForm.name || !schoolForm.code}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add School
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
