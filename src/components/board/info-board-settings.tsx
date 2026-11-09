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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_BOARD_APPEARANCE,
  MAX_BOARD_UPCOMING_EVENTS,
  boardSettingsToPayload,
  formatBoardEventDate,
  normalizeAccentColor,
  type BoardAppearance,
  type BoardUpcomingEvent,
} from "@/lib/board-settings";

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Save failed (${res.status})`);
    }
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      !res.ok
        ? `Save failed (${res.status}). The server returned an unexpected response — try signing in again or refresh the page.`
        : "The server returned an invalid response."
    );
  }
}
import { Copy, ExternalLink, Loader2, CalendarDays, Plus, Trash2, RefreshCw } from "lucide-react";
import { AnnouncementTicker } from "@/components/board/info-board-landscape";
import { boardTone } from "@/lib/board-theme";

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
      .then(async (r) => {
        const data = await readJsonResponse(r);
        if (!r.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Could not load info board (${r.status})`
          );
        }
        return data;
      })
      .then((data) => {
        setCanEdit(Boolean(data.canEdit));
        setBoardUrl(String(data.boardUrl || ""));
        setBoardDemoUrl(String(data.boardDemoUrl || ""));
        if (data.appearance && typeof data.appearance === "object") {
          setForm({ ...DEFAULT_BOARD_APPEARANCE, ...(data.appearance as BoardAppearance) });
        }
      })
      .catch((e) => {
        toast({
          title: "Could not load info board",
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  async function save() {
    setSaving(true);
    try {
      const payload = boardSettingsToPayload(form);
      const res = await fetch("/api/hardware/board-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Save failed"
        );
      }
      if (data.appearance && typeof data.appearance === "object") {
        setForm({ ...DEFAULT_BOARD_APPEARANCE, ...(data.appearance as BoardAppearance) });
      }
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

  const colorPickerValue = normalizeAccentColor(form.accentColor);
  const previewTone = boardTone(form.theme);

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
            <CalendarDays className="h-5 w-5" />
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
              rows={2}
              placeholder="e.g. Early dismissal Friday · PTA meeting in the gym at 3 PM"
              onChange={(e) =>
                setForm((f) => ({ ...f, announcement: e.target.value }))
              }
            />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Coming up events</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={form.showEvents}
                  disabled={!canEdit}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, showEvents: c === true }))
                  }
                />
                Show on board
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Add school events (date, optional time and place). The lobby board
              rotates through them every few seconds.
            </p>
            <div className="space-y-3">
              {form.upcomingEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="space-y-2 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Event {idx + 1}
                    </span>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            upcomingEvents: f.upcomingEvents.filter(
                              (_, i) => i !== idx
                            ),
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={event.title}
                    disabled={!canEdit}
                    placeholder="Event title"
                    onChange={(e) =>
                      setForm((f) => {
                        const upcomingEvents = [...f.upcomingEvents];
                        upcomingEvents[idx] = {
                          ...upcomingEvents[idx],
                          title: e.target.value,
                        };
                        return { ...f, upcomingEvents };
                      })
                    }
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={
                        /^\d{4}-\d{2}-\d{2}$/.test(event.eventDate)
                          ? event.eventDate
                          : ""
                      }
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => {
                          const upcomingEvents = [...f.upcomingEvents];
                          upcomingEvents[idx] = {
                            ...upcomingEvents[idx],
                            eventDate: e.target.value,
                          };
                          return { ...f, upcomingEvents };
                        })
                      }
                    />
                    <Input
                      value={event.eventTime || ""}
                      disabled={!canEdit}
                      placeholder="Time (e.g. 1:00 PM)"
                      onChange={(e) =>
                        setForm((f) => {
                          const upcomingEvents = [...f.upcomingEvents];
                          upcomingEvents[idx] = {
                            ...upcomingEvents[idx],
                            eventTime: e.target.value,
                          };
                          return { ...f, upcomingEvents };
                        })
                      }
                    />
                  </div>
                  <Input
                    value={event.location || ""}
                    disabled={!canEdit}
                    placeholder="Location (optional)"
                    onChange={(e) =>
                      setForm((f) => {
                        const upcomingEvents = [...f.upcomingEvents];
                        upcomingEvents[idx] = {
                          ...upcomingEvents[idx],
                          location: e.target.value,
                        };
                        return { ...f, upcomingEvents };
                      })
                    }
                  />
                </div>
              ))}
            </div>
            {canEdit && form.upcomingEvents.length < MAX_BOARD_UPCOMING_EVENTS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    upcomingEvents: [
                      ...f.upcomingEvents,
                      {
                        title: "",
                        eventDate: "",
                        eventTime: "",
                        location: "",
                      } satisfies BoardUpcomingEvent,
                    ],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add event
              </Button>
            )}
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
          <div className="space-y-2">
            <Label htmlFor="board-weather-loc">Weather location</Label>
            <Input
              id="board-weather-loc"
              value={form.weatherLocation}
              disabled={!canEdit}
              placeholder="e.g. Cebu, Philippines"
              onChange={(e) =>
                setForm((f) => ({ ...f, weatherLocation: e.target.value }))
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.showWeather}
                disabled={!canEdit}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, showWeather: c === true }))
                }
              />
              Show live weather on board
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="board-timezone">Time zone (optional)</Label>
              <Input
                id="board-timezone"
                value={form.timezone}
                disabled={!canEdit}
                placeholder="Asia/Manila — leave blank for TV clock"
                onChange={(e) =>
                  setForm((f) => ({ ...f, timezone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-flash">Scan display (seconds)</Label>
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
                    flashSeconds: Number(e.target.value) || 5,
                  }))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                How long student/staff info stays after tap or scan (default 5).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.showDate}
                disabled={!canEdit}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, showDate: c === true }))
                }
              />
              Show date
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.showClock}
                disabled={!canEdit}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, showClock: c === true }))
                }
              />
              Show time
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Board theme</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["dark", "Dark"],
                    ["light", "Light"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={form.theme === value ? "default" : "outline"}
                    disabled={!canEdit}
                    onClick={() =>
                      setForm((f) => ({ ...f, theme: value }))
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Light or dark look for the lobby TV board.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-accent">Accent color</Label>
              <div className="flex gap-2">
                <Input
                  id="board-accent"
                  type="color"
                  className="h-10 w-14 cursor-pointer p-1"
                  value={colorPickerValue}
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
          </div>
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
          <div
            className={`aspect-video rounded-lg border p-3 ${previewTone.previewShell}`}
            data-board-theme={form.theme}
          >
            <p className={`text-[10px] uppercase tracking-wider ${previewTone.label}`}>
              Landscape TV preview (16:9) · {form.theme === "light" ? "Light" : "Dark"}
            </p>
            {form.announcementOn && form.announcement.trim() && (
              <div
                className={`mt-2 flex items-center gap-2 overflow-hidden rounded-lg border px-2 py-1.5 ${previewTone.announcementBar}`}
              >
                <AnnouncementTicker
                  text={form.announcement.trim()}
                  textClassName={`text-[10px] ${previewTone.marquee}`}
                />
              </div>
            )}
            {form.showEvents && form.upcomingEvents.some((e) => e.title.trim()) && (
              <div
                className="mt-2 rounded-md border border-white/10 px-3 py-2"
                style={{ backgroundColor: `${form.accentColor}22` }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: form.accentColor }}
                >
                  Coming up
                </p>
                {form.upcomingEvents
                  .filter((e) => e.title.trim())
                  .slice(0, 2)
                  .map((e, i) => (
                    <p key={i} className={`mt-1 text-xs ${previewTone.body}`}>
                      <span className="font-medium">{e.title}</span>
                      {e.eventDate ? (
                        <span className={previewTone.label}>
                          {" "}
                          · {formatBoardEventDate(e.eventDate, form.timezone)}
                        </span>
                      ) : null}
                    </p>
                  ))}
              </div>
            )}
            <p className="mt-4 text-lg font-bold" style={{ color: form.accentColor }}>
              {form.headline || DEFAULT_BOARD_APPEARANCE.headline}
            </p>
            <p className={`mt-1 text-xs ${previewTone.bodySoft}`}>
              {form.subtitle || DEFAULT_BOARD_APPEARANCE.subtitle}
            </p>
            <p className={`mt-3 text-[10px] ${previewTone.label}`}>
              {form.showDate && form.showClock
                ? "Date & time"
                : form.showDate
                  ? "Date"
                  : form.showClock
                    ? "Time"
                    : "No clock"}{" "}
              · {form.showWeather ? form.weatherLocation : "Weather off"} · Scan{" "}
              {form.flashSeconds}s
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
