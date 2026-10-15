"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { IdCardRenderer } from "@/components/id-card/id-card-renderer";
import { getDimensionsForOrientation } from "@/lib/categories";
import { ACCENT_COLORS, TEMPLATE_PRESETS } from "@/lib/template-presets";
import type { StudentPrintData } from "@/types/template";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

const THUMBNAIL_BOX = 150;

export function CreateTemplateDialog({
  open,
  onOpenChange,
  sampleData,
  isFirstTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sampleData: StudentPrintData;
  isFirstTemplate: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("Student ID");
  const [presetId, setPresetId] = useState(TEMPLATE_PRESETS[0].id);
  const [accent, setAccent] = useState(ACCENT_COLORS[0]);
  const [isDefault, setIsDefault] = useState(isFirstTemplate);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) setIsDefault(isFirstTemplate);
  }, [open, isFirstTemplate]);

  const previews = useMemo(
    () =>
      TEMPLATE_PRESETS.map((preset) => {
        const dims = getDimensionsForOrientation(preset.orientation);
        return {
          preset,
          dims,
          front: preset.front(accent),
          scale: THUMBNAIL_BOX / Math.max(dims.width, dims.height),
        };
      }),
    [accent]
  );

  const selectedPreset = TEMPLATE_PRESETS.find((p) => p.id === presetId)!;

  async function handleCreate() {
    if (!name.trim()) {
      toast({ title: "Give the template a name", variant: "destructive" });
      return;
    }

    setCreating(true);
    const dims = getDimensionsForOrientation(selectedPreset.orientation);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: null,
        orientation: selectedPreset.orientation,
        width: dims.width,
        height: dims.height,
        frontDesign: JSON.stringify(selectedPreset.front(accent)),
        backDesign: JSON.stringify(selectedPreset.back(accent)),
        isDefault,
      }),
    });

    if (!res.ok) {
      setCreating(false);
      const err = await res.json().catch(() => null);
      toast({ title: err?.error || "Failed to create template", variant: "destructive" });
      return;
    }

    const template = await res.json();
    toast({ title: "Template created — now customize it" });
    router.push(`/dashboard/templates/${template.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !creating && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create a new ID template</DialogTitle>
          <DialogDescription>
            Pick a starting layout. You can change everything afterwards in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">1. Template name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior High Student ID"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>2. Starting layout</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {previews.map(({ preset, dims, front, scale }) => {
                const active = preset.id === presetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPresetId(preset.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-xl border p-2 text-left transition-all hover:border-primary/50",
                      active && "border-primary ring-2 ring-primary"
                    )}
                  >
                    {active && (
                      <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div
                      className="flex items-center justify-center rounded-md bg-muted/60"
                      style={{ width: THUMBNAIL_BOX + 8, height: THUMBNAIL_BOX + 8 }}
                    >
                      <div className="pointer-events-none overflow-hidden rounded border shadow-sm">
                        <IdCardRenderer
                          design={front}
                          data={sampleData}
                          width={dims.width}
                          height={dims.height}
                          scale={scale}
                        />
                      </div>
                    </div>
                    <div className="w-full">
                      <p className="text-xs font-semibold">{preset.name}</p>
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPreset.usesAccent && (
            <div className="space-y-2">
              <Label>3. Main color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => setAccent(color)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                      accent === color ? "border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {accent === color && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
                <Input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-8 w-12 cursor-pointer p-1"
                  title="Custom color"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(!!checked)}
            />
            <Label htmlFor="create-default" className="font-normal">
              Use as the default template for this school
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create & open editor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
