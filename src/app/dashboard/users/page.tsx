"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Plus, Shield, Trash2, UserCog } from "lucide-react";

type SchoolUserRole = "SCHOOL_ADMIN" | "REGISTRAR" | "OPERATOR";

interface SchoolUser {
  id: string;
  name: string;
  email: string;
  role: SchoolUserRole | "ADMIN";
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<SchoolUserRole | "ADMIN", string> = {
  ADMIN: "Organization Admin",
  SCHOOL_ADMIN: "School Admin",
  REGISTRAR: "Registrar",
  OPERATOR: "Operator",
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "REGISTRAR" as SchoolUserRole,
  isActive: true,
};

function canManageSchoolUsers(role: string | undefined) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN";
}

export default function SchoolUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolUser | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (status === "loading") return;
    if (!canManageSchoolUsers(session?.user?.role)) {
      router.replace("/dashboard");
    }
  }, [status, session?.user?.role, router]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/school-users");
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast({
        title: "Cannot load school users",
        description: data.error || "You may not have permission.",
        variant: "destructive",
      });
      return;
    }

    setUsers(data.users || []);
  }

  const allowed = canManageSchoolUsers(session?.user?.role);

  useEffect(() => {
    if (!allowed) return;
    fetchUsers();
  }, [allowed]);

  if (status === "loading" || !allowed) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(user: SchoolUser) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role === "ADMIN" ? "SCHOOL_ADMIN" : user.role,
      isActive: user.isActive,
    });
    setDialogOpen(true);
  }

  async function saveUser() {
    setSaving(true);
    const res = await fetch("/api/school-users", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editing ? { id: editing.id } : {}),
        ...form,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast({
        title: "Could not save user",
        description: data.error || "Please check the user details.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: editing ? "User updated" : "User created" });
    setDialogOpen(false);
    fetchUsers();
  }

  async function deactivateUser(user: SchoolUser) {
    if (!confirm(`Deactivate ${user.name}?`)) return;

    const res = await fetch(`/api/school-users?id=${user.id}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (!res.ok) {
      toast({
        title: "Could not deactivate user",
        description: data.error || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "User deactivated" });
    fetchUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <UserCog className="h-4 w-4" />
            Access Control
          </div>
          <h1 className="text-3xl font-bold tracking-tight">School Users</h1>
          <p className="text-muted-foreground">
            Add Registrar or School Admin users for the selected school only.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            No users assigned to this school yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {users.map((user) => (
            <Card key={user.id} className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={user.name} size="lg" />
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {user.name}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {user.email}
                    </CardDescription>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        <Shield className="mr-1 h-3 w-3" />
                        {ROLE_LABELS[user.role]}
                      </Badge>
                      <Badge variant={user.isActive ? "outline" : "destructive"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
                {user.role !== "ADMIN" && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deactivateUser(user)}
                      disabled={!user.isActive}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add School User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Registrar Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="registrar@school.edu"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Password {editing ? "(leave blank to keep current)" : ""}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) =>
                  setForm({ ...form, role: role as SchoolUserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTRAR">Registrar</SelectItem>
                  <SelectItem value="SCHOOL_ADMIN">School Admin</SelectItem>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveUser} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
