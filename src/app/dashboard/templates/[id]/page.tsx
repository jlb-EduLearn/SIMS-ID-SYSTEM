"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TemplateEditor } from "@/components/template/template-editor";
import { parseTemplateDesign, type TemplateDesign } from "@/types/template";
import {
  getDimensionsForOrientation,
  type TemplateOrientation,
} from "@/lib/categories";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [orientation, setOrientation] = useState<TemplateOrientation>("LANDSCAPE");
  const [width, setWidth] = useState(1011);
  const [height, setHeight] = useState(638);
  const [frontDesign, setFrontDesign] = useState<TemplateDesign>({ elements: [] });
  const [backDesign, setBackDesign] = useState<TemplateDesign>({ elements: [] });
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        name,
        description,
        isDefault,
        orientation,
        width,
        height,
        frontDesign,
        backDesign,
      }),
    [name, description, isDefault, orientation, width, height, frontDesign, backDesign]
  );
  const isDirty = !loading && snapshot !== savedSnapshot;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast({ title: data.error, variant: "destructive" });
          router.push("/dashboard/templates");
          return;
        }
        const front = parseTemplateDesign(data.frontDesign);
        const back = data.backDesign ? parseTemplateDesign(data.backDesign) : { elements: [] };
        setName(data.name);
        setDescription(data.description || "");
        setIsDefault(data.isDefault);
        setOrientation(data.orientation || "LANDSCAPE");
        setWidth(data.width);
        setHeight(data.height);
        setFrontDesign(front);
        setBackDesign(back);
        setSavedSnapshot(
          JSON.stringify({
            name: data.name,
            description: data.description || "",
            isDefault: data.isDefault,
            orientation: data.orientation || "LANDSCAPE",
            width: data.width,
            height: data.height,
            frontDesign: front,
            backDesign: back,
          })
        );
        setLoading(false);
      });
  }, [id, router]);

  useEffect(() => {
    if (!isDirty) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function handleOrientationChange(next: TemplateOrientation) {
    setOrientation(next);
    const dims = getDimensionsForOrientation(next);
    setWidth(dims.width);
    setHeight(dims.height);
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const savingSnapshot = snapshotRef.current;
    const res = await fetch(`/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        orientation,
        width,
        height,
        frontDesign: JSON.stringify(frontDesign),
        backDesign: JSON.stringify(backDesign),
        isDefault,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      toast({ title: err.error || "Failed to save", variant: "destructive" });
      return;
    }

    setSavedSnapshot(savingSnapshot);
    toast({ title: "Template saved" });
  }, [id, name, description, orientation, width, height, frontDesign, backDesign, isDefault]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, saving]);

  function goBack() {
    if (isDirty && !confirm("You have unsaved changes. Leave without saving?")) return;
    router.push("/dashboard/templates");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goBack} title="Back to templates">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="template-name" className="text-[11px] text-muted-foreground">
                Template name
              </Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 font-semibold"
              />
            </div>
            <div>
              <Label htmlFor="template-description" className="text-[11px] text-muted-foreground">
                Description (optional)
              </Label>
              <Input
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. For Grade 1–6"
                className="h-9"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="default"
              checked={isDefault}
              onCheckedChange={(c) => setIsDefault(!!c)}
            />
            <Label htmlFor="default" className="text-sm font-normal">
              Default for this school
            </Label>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {isDirty ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Unsaved changes
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                All changes saved
              </>
            )}
          </span>
          <Button onClick={handleSave} disabled={saving || !isDirty} title="Save (Ctrl+S)">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <TemplateEditor
        frontDesign={frontDesign}
        backDesign={backDesign}
        width={width}
        height={height}
        orientation={orientation}
        onOrientationChange={handleOrientationChange}
        onSizeChange={({ width, height }) => {
          setWidth(width);
          setHeight(height);
        }}
        onFrontChange={setFrontDesign}
        onBackChange={setBackDesign}
      />

      <div className="flex justify-between">
        <Link href="/dashboard/templates" onClick={(e) => {
          if (isDirty && !confirm("You have unsaved changes. Leave without saving?")) e.preventDefault();
        }}>
          <Button variant="outline">Back to templates</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving || !isDirty}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
