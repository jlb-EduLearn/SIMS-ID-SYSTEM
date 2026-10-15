"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IdCardRenderer } from "@/components/id-card/id-card-renderer";
import { CreateTemplateDialog } from "@/components/template/create-template-dialog";
import { useSchoolSampleData } from "@/components/template/use-school-sample-data";
import { parseTemplateDesign } from "@/types/template";
import { toast } from "@/hooks/use-toast";
import {
  Copy,
  Loader2,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  orientation: "PORTRAIT" | "LANDSCAPE";
  width: number;
  height: number;
  frontDesign: string;
  backDesign: string | null;
  isDefault: boolean;
  createdAt: string;
}

const THUMBNAIL_HEIGHT = 170;
const THUMBNAIL_WIDTH = 270;

function TemplateThumbnail({
  template,
  sampleData,
}: {
  template: Template;
  sampleData: ReturnType<typeof useSchoolSampleData>;
}) {
  const scale = Math.min(THUMBNAIL_WIDTH / template.width, THUMBNAIL_HEIGHT / template.height);
  return (
    <div className="pointer-events-none overflow-hidden rounded-md border shadow-sm">
      <IdCardRenderer
        design={parseTemplateDesign(template.frontDesign)}
        data={sampleData}
        width={template.width}
        height={template.height}
        scale={scale}
      />
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const sampleData = useSchoolSampleData();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      setCreateOpen(true);
      window.history.replaceState(null, "", "/dashboard/templates");
    }

    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpenId]);

  async function handleDuplicate(template: Template) {
    const res = await fetch(`/api/templates/${template.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    if (!res.ok) {
      toast({ title: "Failed to duplicate", variant: "destructive" });
      return;
    }
    const data = await res.json();
    setTemplates((t) => [...t, data]);
    toast({ title: `Copied "${template.name}"` });
  }

  async function handleSetDefault(template: Template) {
    const res = await fetch(`/api/templates/${template.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: template.name,
        description: template.description,
        orientation: template.orientation,
        width: template.width,
        height: template.height,
        frontDesign: template.frontDesign,
        backDesign: template.backDesign,
        isDefault: true,
      }),
    });
    if (!res.ok) {
      toast({ title: "Failed to set default", variant: "destructive" });
      return;
    }
    setTemplates((list) =>
      list
        .map((t) => ({ ...t, isDefault: t.id === template.id }))
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    );
    toast({ title: `"${template.name}" is now the default` });
  }

  async function handleDelete(template: Template) {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Failed to delete", variant: "destructive" });
      return;
    }
    setTemplates((t) => t.filter((x) => x.id !== template.id));
    toast({ title: "Template deleted" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ID Templates</h1>
          <p className="text-muted-foreground">
            Design the ID cards for this school. Templates are not shared with other schools.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Palette className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold">No templates yet</h2>
            <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
              Start from a ready-made layout, add your school logo and colors, then print IDs
              for every student.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group overflow-hidden">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/templates/${template.id}`)}
                className="flex w-full items-center justify-center bg-muted/50 p-4 transition-colors group-hover:bg-muted"
                style={{ height: THUMBNAIL_HEIGHT + 32 }}
                title="Open in editor"
              >
                <TemplateThumbnail template={template} sampleData={sampleData} />
              </button>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold">
                      {template.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {template.orientation === "PORTRAIT" ? "Portrait" : "Landscape"} ·{" "}
                      {template.width}×{template.height}px
                    </p>
                  </div>
                  {template.isDefault && (
                    <Badge className="shrink-0 text-xs">
                      <Star className="mr-1 h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/templates/${template.id}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit design
                    </Button>
                  </Link>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      title="More actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === template.id ? null : template.id);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {menuOpenId === template.id && (
                      <div className="absolute bottom-full right-0 z-20 mb-1 w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
                        {!template.isDefault && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                            onClick={() => handleSetDefault(template)}
                          >
                            <Star className="h-4 w-4" />
                            Make default
                          </button>
                        )}
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4" />
                          Make a copy
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        sampleData={sampleData}
        isFirstTemplate={!loading && templates.length === 0}
      />
    </div>
  );
}
