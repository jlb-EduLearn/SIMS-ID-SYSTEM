"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ALL_CATEGORIES,
  CATEGORY_GRADES,
  CATEGORY_LABELS,
  type StudentCategory,
} from "@/lib/categories";
import { Loader2, Trash2 } from "lucide-react";

type GradeSection = {
  id: string;
  category: StudentCategory;
  grade: string;
  name: string;
};

export function SectionBuilder({
  onChanged,
  className,
}: {
  onChanged?: () => void;
  className?: string;
}) {
  const [sections, setSections] = useState<GradeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "GRADE_SCHOOL" as StudentCategory,
    grade: "Grade 1",
    name: "",
  });

  const gradeOptions = CATEGORY_GRADES[form.category] || [];

  const loadSections = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sections");
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setSections(data.sections || []);
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  async function handleAdd() {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, name }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({
        title: err.error || "Failed to add section",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Section added" });
    setForm((f) => ({ ...f, name: "" }));
    await loadSections();
    onChanged?.();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this section?")) return;
    const res = await fetch(`/api/sections?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Failed to delete section", variant: "destructive" });
      return;
    }
    toast({ title: "Section deleted" });
    await loadSections();
    onChanged?.();
  }

  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Section builder</h3>
        <p className="text-xs text-muted-foreground">
          Create grade and section names for this school year (e.g. Grade 7 · St.
          James).
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => {
              const category = v as StudentCategory;
              setForm({
                category,
                grade: CATEGORY_GRADES[category]?.[0] || "",
                name: "",
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.filter(
                (cat) => CATEGORY_GRADES[cat].length > 0
              ).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat].split(" (")[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Grade</Label>
          <Select
            value={form.grade}
            onValueChange={(v) => setForm({ ...form, grade: v, name: "" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Section name</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. A, St. Mary"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={saving || !form.name.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sections.length === 0 ? (
          <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
            No sections yet. Add one using the form above.
          </p>
        ) : (
          sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {section.grade} · {section.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[section.category].split(" (")[0]}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(section.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
