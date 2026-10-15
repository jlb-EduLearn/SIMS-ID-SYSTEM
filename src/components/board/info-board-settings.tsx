"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_BOARD_APPEARANCE,
  normalizeAccentColor,
  type BoardAppearance,
} from "@/lib/board-settings";
import {
  Copy,
  ExternalLink,
  Loader2,
  Megaphone,
  RefreshCw,
} from "lucide-react";

export function InfoBoardSettings() {
  const { data: session } = useSession();
  const schoolId = session?.user?.currentSchoolId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [boardUrl, setBoardUrl] = useState("");
  const [boardDemoUrl, setBoardDemoUrl] = useState("");
  const [form, setForm] = useState<BoardAppearance>(DEFAULT_BOARD_APPEARANCE);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    fetch("/api/hardware/board-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setCanEdit(Boolean(data.canEdit));
        setBoardUrl(data.boardUrl || "");
        setBoardDemoUrl(data.boardDemoUrl || "");
        if (data.appearance) setForm(data.appearance);
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        accentColor: normalizeAccentColor(form.accentColor),
        flashSeconds: Number(form.flashSeconds) || 7,
      };
      const res = await fetch("/api/hardware/board-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.appearance) setForm(data.appearance);
      toast({ title: "Info board settings saved" });
    } catch (e) {
      toast({
        title: "Could not save info board",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(url: string) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }

  async function regenerate() {
    if (
      !confirm(
        "Create a new info board link? The old URL will stop working on TVs that still use it."
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/hardware/board-link", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const origin = window.location.origin;
      const next = `${origin}/board/${data.boardToken}`;
      setBoardUrl(next);
      setBoardDemoUrl(`${next}?demo=1`);
      toast({ title: "New info board link ready" });
    } catch (e) {
      toast({
        title: "Could not regenerate link",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading info board…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5" />
            Board content
          </CardTitle>
          <CardDescription>
            Customize the lobby screen for this school. Changes appear the next
            time the board refreshes (reload the TV page after saving).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-headline">Idle headline</Label>
            <Input
              id="board-headline"
              value={form.headline}
              disabled={!canEdit}
              onChange={(e) =>
                setForm((f) => ({ ...f, headline: e.target.value }))
              }
              placeholder={DEFAULT_BOARD_APPEARANCE.headline}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-subtitle">Idle subtitle</Label>
            <Input
              id="board-subtitle"
              value={form.subtitle}
              disabled={!canEdit}
              onChange={(e) =>
                setForm((f) => ({ ...f, subtitle: e.target.value }))
              }
              placeholder={DEFAULT_BOARD_APPEARANCE.subtitle}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="board-announcement">Announcement</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={form.announcementOn}
                  disabled={!canEdit}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, announcementOn: c === true }))
                  }
                />
                Show on board
              </label>
            </div>
            <Textarea
              id="board-announcement"
              value={form.announcement}
              disabled={!canEdit}
              rows={3}
              placeholder="e.g. Parent-teacher conference Friday 1–4 PM · Gym closed today"
              onChange={(e) =>
                setForm((f) => ({ ...f, announcement: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-welcome">Welcome label (on successful scan)</Label>
            <Input
              id="board-welcome"
              value={form.welcomeText}
              disabled={!canEdit}
              onChange={(e) =>
                setForm((f) => ({ ...f, welcomeText: e.target.value }))
              }
              placeholder="Welcome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-footer">Footer text</Label>
            <Input
              id="board-footer"
              value={form.footerText}
              disabled={!canEdit}
              onChange={(e) =>
                setForm((f) => ({ ...f, footerText: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="board-accent">Accent color</Label>
              <div className="flex gap-2">
                <Input
                  id="board-accent"
                  type="color"
                  className="h-10 w-14 cursor-pointer p-1"
                  value={form.accentColor}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accentColor: e.target.value }))
                  }
                />
                <Input
                  value={form.accentColor}
                  disabled={!canEdit}
                  className="font-mono text-xs"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accentColor: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-flash">Flash duration (seconds)</Label>
              <Input
                id="board-flash"
                type="number"
                min={3}
                max={30}
                value={form.flashSeconds}
                disabled={!canEdit}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    flashSeconds: Number(e.target.value) || 7,
                  }))
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.showClock}
              disabled={!canEdit}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, showClock: c === true }))
              }
            />
            Show clock on board
          </label>
          {canEdit && (
            <Button type="button" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save info board
            </Button>
          )}
          {!canEdit && (
            <p className="text-xs text-muted-foreground">
              Only School Admin, Registrar, or Org Admin can edit the board.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Board link & preview</CardTitle>
          <CardDescription>
            Open this URL on the lobby TV. Use the demo link to test without a
            scanner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Public board URL</Label>
            <Input readOnly value={boardUrl || "Not available"} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!boardUrl}
                onClick={() => copyLink(boardUrl)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button asChild size="sm" variant="outline" disabled={!boardUrl}>
                <a href={boardUrl || "#"} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open board
                </a>
              </Button>
              {canEdit && (
                <Button type="button" size="sm" variant="ghost" onClick={regenerate}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  New link
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Demo URL (test buttons)</Label>
            <Input
              readOnly
              value={boardDemoUrl || "Not available"}
              className="font-mono text-xs"
            />
            <Button asChild size="sm" variant="secondary" disabled={!boardDemoUrl}>
              <a href={boardDemoUrl || "#"} target="_blank" rel="noreferrer">
                Open with demo controls
              </a>
            </Button>
          </div>
          <div className="rounded-lg border bg-slate-950 p-4 text-white">
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              Idle preview
            </p>
            {form.announcementOn && form.announcement.trim() && (
              <div
                className="mt-2 rounded-md px-3 py-2 text-xs font-medium"
                style={{ backgroundColor: `${form.accentColor}33`, color: form.accentColor }}
              >
                {form.announcement}
              </div>
            )}
            <p className="mt-4 text-lg font-bold" style={{ color: form.accentColor }}>
              {form.headline || DEFAULT_BOARD_APPEARANCE.headline}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {form.subtitle || DEFAULT_BOARD_APPEARANCE.subtitle}
            </p>
            <p className="mt-4 text-[10px] text-white/35">
              Scan flash label: {form.welcomeText || "Welcome"} · {form.flashSeconds}s
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
