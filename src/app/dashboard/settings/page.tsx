"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  IdCard,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Sun,
  Trash2,
  Upload,
  UserCircle,
  Cpu,
  Download,
  Megaphone,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { HardwareDetectionPanel } from "@/components/hardware/hardware-detection-panel";
import { InfoBoardSettings } from "@/components/board/info-board-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SCHOOL_LOGO_UPDATED_EVENT } from "@/lib/school-events";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Organization Admin",
  SCHOOL_ADMIN: "School Admin",
  REGISTRAR: "Registrar",
  OPERATOR: "Operator",
};

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

interface SchoolSettings {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [hardwareLoading, setHardwareLoading] = useState(true);
  const [hardwareSaving, setHardwareSaving] = useState(false);
  const [hardwareCanEdit, setHardwareCanEdit] = useState(false);
  const [deviceList, setDeviceList] = useState<
    Array<{ sku: string; name: string; simsIntegration: string }>
  >([]);
  const [hardwareForm, setHardwareForm] = useState({
    wiegandFormat: "26" as "26" | "34",
    accessControlHost: "",
    accessControlPort: 4370,
    accessControlProtocol: "WG5000",
    printerProfile: "ENTRUST_SIGMA_PRS10" as
      | "ENTRUST_SIGMA_PRS10"
      | "GENERIC_CR80_300DPI",
    faceTerminalEnabled: true,
    metalDetectorEnabled: false,
    notes: "",
  });

  useEffect(() => {
    fetch("/api/school-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setSchool(data.school);
        setCanEdit(data.canEdit);
      });
  }, [session?.user?.currentSchoolId]);

  useEffect(() => {
    setHardwareLoading(true);
    fetch("/api/hardware/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.config) return;
        setHardwareCanEdit(Boolean(data.canEdit));
        setDeviceList(data.devices || []);
        const c = data.config;
        setHardwareForm({
          wiegandFormat: c.wiegandFormat === "34" ? "34" : "26",
          accessControlHost: c.accessControlHost || "",
          accessControlPort: c.accessControlPort ?? 4370,
          accessControlProtocol: c.accessControlProtocol || "WG5000",
          printerProfile:
            c.printerProfile === "GENERIC_CR80_300DPI"
              ? "GENERIC_CR80_300DPI"
              : "ENTRUST_SIGMA_PRS10",
          faceTerminalEnabled: c.faceTerminalEnabled !== false,
          metalDetectorEnabled: Boolean(c.metalDetectorEnabled),
          notes: c.notes || "",
        });
      })
      .finally(() => setHardwareLoading(false));
  }, [session?.user?.currentSchoolId]);

  async function saveHardware() {
    setHardwareSaving(true);
    try {
      const res = await fetch("/api/hardware/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...hardwareForm,
          accessControlHost: hardwareForm.accessControlHost || null,
          notes: hardwareForm.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast({ title: "Campus hardware settings saved" });
    } catch (e) {
      toast({
        title: "Could not save hardware settings",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setHardwareSaving(false);
    }
  }

  async function saveLogo(logoUrl: string | null) {
    const res = await fetch("/api/school-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save logo");
    }
    const data = await res.json();
    setSchool(data.school);
    window.dispatchEvent(
      new CustomEvent(SCHOOL_LOGO_UPDATED_EVENT, { detail: data.school.logoUrl })
    );
  }

  async function handleLogoFile(file: File) {
    setLogoSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }
      const { url } = await uploadRes.json();
      await saveLogo(url);
      toast({ title: "School logo updated" });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to update logo",
        variant: "destructive",
      });
    } finally {
      setLogoSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    setLogoSaving(true);
    try {
      await saveLogo(null);
      toast({ title: "School logo removed" });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to remove logo",
        variant: "destructive",
      });
    } finally {
      setLogoSaving(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }

    setPasswordSaving(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    });
    setPasswordSaving(false);

    if (!res.ok) {
      const err = await res.json();
      toast({
        title: err.error || "Failed to change password",
        variant: "destructive",
      });
      return;
    }

    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast({ title: "Password changed" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Personalize the app and manage your school and account.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="infoboard">Info board</TabsTrigger>
          <TabsTrigger value="hardware">Campus hardware</TabsTrigger>
          <TabsTrigger value="account">Account & security</TabsTrigger>
        </TabsList>

        <TabsContent value="infoboard" className="mt-0">
          <InfoBoardSettings />
        </TabsContent>

        <TabsContent value="general" className="mt-0 space-y-0">
          <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Choose how the app looks on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all hover:border-primary/50",
                    theme === option.value &&
                      "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  )}
                >
                  <option.icon className="h-5 w-5" />
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IdCard className="h-5 w-5" />
              School Logo
            </CardTitle>
            <CardDescription>
              Shown before the school name in the top-left corner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {school?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={school.logoUrl}
                    alt={`${school.name} logo`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <IdCard className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {school?.name || session?.user?.currentSchoolName}
                </p>
                <p className="text-sm text-muted-foreground">{school?.code}</p>
              </div>
            </div>

            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoFile(file);
                  }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoSaving}
                >
                  {logoSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {school?.logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
                {school?.logoUrl && (
                  <Button
                    variant="outline"
                    onClick={removeLogo}
                    disabled={logoSaving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              school && (
                <p className="text-sm text-muted-foreground">
                  Only a School Admin or Organization Admin can change the logo.
                </p>
              )
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="hardware" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5" />
              Campus hardware
            </CardTitle>
            <CardDescription>
              Printers, encoders, and access control for your campus stack.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hardwareLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading hardware profile…
              </div>
            ) : (
              <>
                <HardwareDetectionPanel
                  onMatchedPrinter={(profile) =>
                    setHardwareForm((f) => ({ ...f, printerProfile: profile }))
                  }
                />

                <details className="rounded-lg border bg-muted/20 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Supported devices ({deviceList.length})
                  </summary>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {deviceList.map((d) => (
                      <li
                        key={d.sku}
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <span className="font-medium">
                          {d.sku} · {d.name}
                        </span>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {d.simsIntegration}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>

                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Wiegand format (RDS-20 / ACS11-M2)</Label>
                    <Select
                      value={hardwareForm.wiegandFormat}
                      onValueChange={(v) =>
                        setHardwareForm((f) => ({
                          ...f,
                          wiegandFormat: v as "26" | "34",
                        }))
                      }
                      disabled={!hardwareCanEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="26">26-bit</SelectItem>
                        <SelectItem value="34">34-bit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Access board IP (ACS11-M2)</Label>
                    <Input
                      placeholder="192.168.1.100"
                      value={hardwareForm.accessControlHost}
                      onChange={(e) =>
                        setHardwareForm((f) => ({
                          ...f,
                          accessControlHost: e.target.value,
                        }))
                      }
                      disabled={!hardwareCanEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TCP port</Label>
                    <Input
                      type="number"
                      value={hardwareForm.accessControlPort}
                      onChange={(e) =>
                        setHardwareForm((f) => ({
                          ...f,
                          accessControlPort: Number(e.target.value) || 4370,
                        }))
                      }
                      disabled={!hardwareCanEdit}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>ID card printer</Label>
                    <Select
                      value={hardwareForm.printerProfile}
                      onValueChange={(v) =>
                        setHardwareForm((f) => ({
                          ...f,
                          printerProfile: v as typeof f.printerProfile,
                        }))
                      }
                      disabled={!hardwareCanEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENTRUST_SIGMA_PRS10">
                          Entrust Sigma PRS10-600
                        </SelectItem>
                        <SelectItem value="GENERIC_CR80_300DPI">
                          Generic CR-80 @ 300 dpi
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={hardwareForm.faceTerminalEnabled}
                      onCheckedChange={(c) =>
                        setHardwareForm((f) => ({
                          ...f,
                          faceTerminalEnabled: c === true,
                        }))
                      }
                      disabled={!hardwareCanEdit}
                    />
                    FRS10 face terminals in use
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={hardwareForm.metalDetectorEnabled}
                      onCheckedChange={(c) =>
                        setHardwareForm((f) => ({
                          ...f,
                          metalDetectorEnabled: c === true,
                        }))
                      }
                      disabled={!hardwareCanEdit}
                    />
                    MDS10 metal detector on site
                  </label>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  Customize announcements and the lobby URL under the{" "}
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Megaphone className="h-3.5 w-3.5" />
                    Info board
                  </span>{" "}
                  tab.
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href="/api/access/export" download>
                      <Download className="mr-2 h-4 w-4" />
                      Export for access control (CSV)
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a href="/HARDWARE.md" target="_blank" rel="noreferrer">
                      Setup guide
                    </a>
                  </Button>
                  {hardwareCanEdit && (
                    <Button
                      size="sm"
                      onClick={saveHardware}
                      disabled={hardwareSaving}
                    >
                      {hardwareSaving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save hardware settings
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Your sign-in details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span className="truncate font-medium">{session?.user?.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate font-medium">{session?.user?.email}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">
                {ROLE_LABELS[session?.user?.role ?? ""] ?? session?.user?.role}
              </Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Organization</span>
              <span className="truncate font-medium">
                {session?.user?.organizationName}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Use at least 6 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                changePassword();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                />
              </div>
              <Button
                type="submit"
                disabled={
                  passwordSaving ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmPassword
                }
              >
                {passwordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
