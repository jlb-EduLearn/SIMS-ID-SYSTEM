"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CATEGORY_LABELS, type StudentCategory } from "@/lib/categories";
import {
  PROMOTION_LADDER,
  sourceGradeForTargetEnrollment,
} from "@/lib/enrollment-promote";
import {
  Loader2,
  UserPlus,
  Search,
  Users,
  Filter,
  ChevronDown,
} from "lucide-react";
import { WorkflowTip } from "@/components/layout/workflow-tip";
import { SectionBuilder } from "@/components/students/section-builder";

type SectionRow = {
  id: string;
  category: StudentCategory;
  grade: string;
  name: string;
  enrolledCount: number;
};

type PickerStudent = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  section: string | null;
};

type SchoolYearOption = { id: string; name: string; isCurrent: boolean };

export function SectionEnrollmentPanel({
  currentYearId,
  onEnrolled,
}: {
  currentYearId: string;
  onEnrolled?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [unassignedByGrade, setUnassignedByGrade] = useState<
    Array<{ grade: string; count: number }>
  >([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionRow | null>(null);
  const [sourceYearId, setSourceYearId] = useState("current");
  const [search, setSearch] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerStudents, setPickerStudents] = useState<PickerStudent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [pickerGrade, setPickerGrade] = useState("auto");
  const [showPastYearSource, setShowPastYearSource] = useState(false);

  const fromPastYear =
    sourceYearId !== "current" && sourceYearId !== currentYearId;

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const [summaryRes, yearsRes] = await Promise.all([
      fetch("/api/enrollment/sections-summary"),
      fetch("/api/school-years"),
    ]);
    setLoading(false);
    if (!summaryRes.ok) {
      toast({ title: "Could not load sections", variant: "destructive" });
      return;
    }
    const summary = await summaryRes.json();
    setSections(summary.sections || []);
    setUnassignedByGrade(summary.unassignedByGrade || []);
    if (yearsRes.ok) {
      const y = await yearsRes.json();
      setSchoolYears(y.schoolYears || []);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const gradeLevelOptions = useMemo(() => {
    const present = new Set(sections.map((s) => s.grade));
    const ordered = PROMOTION_LADDER.map((s) => s.grade).filter((g) =>
      present.has(g)
    );
    const extras = [...present].filter((g) => !ordered.includes(g)).sort();
    return [...ordered, ...extras];
  }, [sections]);

  const sectionsByGrade = useMemo(() => {
    const map = new Map<string, SectionRow[]>();
    for (const s of sections) {
      if (gradeFilter !== "all" && s.grade !== gradeFilter) continue;
      const list = map.get(s.grade) || [];
      list.push(s);
      map.set(s.grade, list);
    }
    const order = PROMOTION_LADDER.map((s) => s.grade);
    return [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [sections, gradeFilter]);

  const unassignedMap = useMemo(
    () => new Map(unassignedByGrade.map((u) => [u.grade, u.count])),
    [unassignedByGrade]
  );

  const pastYearOptions = useMemo(
    () => schoolYears.filter((y) => y.id !== currentYearId),
    [schoolYears, currentYearId]
  );

  function recommendedPickerGrade(section: SectionRow, isPast: boolean) {
    if (isPast) {
      return (
        sourceGradeForTargetEnrollment(section.grade)?.grade ?? section.grade
      );
    }
    return section.grade;
  }

  async function loadPickerStudents(section: SectionRow) {
    setPickerLoading(true);
    const isPast = sourceYearId !== "current";
    const queryYearId = isPast ? sourceYearId : undefined;
    const recommended = recommendedPickerGrade(section, isPast);
    const queryGrade =
      pickerGrade === "auto"
        ? recommended
        : pickerGrade === "all"
          ? null
          : pickerGrade;

    if (
      isPast &&
      pickerGrade === "auto" &&
      !sourceGradeForTargetEnrollment(section.grade)
    ) {
      setPickerStudents([]);
      setPickerLoading(false);
      return;
    }

    const params = new URLSearchParams({
      recordType: "STUDENT",
      limit: "200",
      ...(queryGrade ? { grade: queryGrade } : {}),
      ...(queryYearId ? { schoolYearId: queryYearId } : {}),
      ...(isPast ? { excludeEnrolledInCurrent: "1" } : {}),
      ...(search ? { search } : {}),
      ...(!isPast && unassignedOnly ? { unassigned: "1" } : {}),
    });
    const res = await fetch(`/api/students?${params}`);
    setPickerLoading(false);
    if (!res.ok) {
      setPickerStudents([]);
      return;
    }
    const data = await res.json();
    setPickerStudents(data.students || []);
  }

  function openPicker(section: SectionRow) {
    setActiveSection(section);
    setSourceYearId("current");
    setShowPastYearSource(false);
    setSearch("");
    setSelectedIds(new Set());
    setUnassignedOnly(true);
    setPickerGrade("auto");
    setPickerOpen(true);
  }

  useEffect(() => {
    if (!pickerOpen || !activeSection) return;
    const t = setTimeout(() => {
      loadPickerStudents(activeSection);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when source/search toggles
  }, [search, unassignedOnly, pickerOpen, activeSection, sourceYearId, pickerGrade]);

  const pickerGradeOptions = useMemo(
    () => [...new Set(PROMOTION_LADDER.map((s) => s.grade))],
    []
  );

  const pickerAutoGradeLabel =
    activeSection &&
    (fromPastYear
      ? `Recommended · ${recommendedPickerGrade(activeSection, true)} (prior year for ${activeSection.grade})`
      : `Same as section · ${activeSection.grade}`);

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(pickerStudents.map((s) => s.id)));
  }

  async function assignSelected() {
    if (!activeSection || selectedIds.size === 0) return;
    setAssigning(true);
    const res = await fetch("/api/enrollment/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade: activeSection.grade,
        section: activeSection.name,
        studentIds: [...selectedIds],
        ...(fromPastYear ? { sourceSchoolYearId: sourceYearId } : {}),
      }),
    });
    setAssigning(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "Enrollment failed",
        description: data.error || "Request failed",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Students enrolled",
      description: fromPastYear
        ? `${data.created ?? 0} added to this year, ${data.updated ?? 0} updated · ${activeSection.name}`
        : `${data.assigned} assigned to ${activeSection.name}.`,
    });
    setPickerOpen(false);
    loadSummary();
    onEnrolled?.();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <SectionBuilder onChanged={loadSummary} />
      </div>

      <WorkflowTip title="Enroll by section">
        <p>
          Use <strong>Add students</strong> on each section to assign learners
          from this year (unassigned, same grade). To promote from a previous
          year, open <strong>Advanced: past school year</strong> in that dialog.
        </p>
      </WorkflowTip>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sections…
        </div>
      ) : sections.length === 0 ? (
        <p className="rounded-xl border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Add at least one section above, then assign students below.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 shadow-sm">
            <div className="min-w-[200px] flex-1 space-y-2 sm:max-w-xs">
              <Label htmlFor="enrollment-grade-filter">Grade level</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger id="enrollment-grade-filter">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grade levels</SelectItem>
                  {gradeLevelOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                      {(unassignedMap.get(g) ?? 0) > 0
                        ? ` · ${unassignedMap.get(g)} unassigned`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {gradeFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5"
                onClick={() => setGradeFilter("all")}
              >
                Clear filter
              </Button>
            )}
          </div>

          {sectionsByGrade.length === 0 ? (
            <p className="rounded-xl border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              No sections for this grade. Change the filter or add sections.
            </p>
          ) : (
            <div className="space-y-6">
              {sectionsByGrade.map(([grade, gradeSections]) => (
                <div
                  key={grade}
                  className="overflow-hidden rounded-xl border bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
                    <div>
                      <h2 className="font-semibold">{grade}</h2>
                      <p className="text-xs text-muted-foreground">
                        {
                          CATEGORY_LABELS[gradeSections[0]?.category]?.split(
                            " ("
                          )[0]
                        }
                      </p>
                    </div>
                    {(unassignedMap.get(grade) ?? 0) > 0 && (
                      <Badge variant="secondary">
                        {unassignedMap.get(grade)} in this year without section
                      </Badge>
                    )}
                  </div>
                  <ul className="divide-y">
                    {gradeSections.map((section) => (
                      <li
                        key={section.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">Section {section.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {section.enrolledCount} enrolled this year
                            </p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => openPicker(section)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add students
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeSection
                ? `Enroll in ${activeSection.name} · ${activeSection.grade}`
                : "Add students"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              {!showPastYearSource ? (
                <>
                  <p className="text-sm font-medium">This school year</p>
                  <p className="text-xs text-muted-foreground">
                    Unassigned students in the matching grade appear below.
                  </p>
                  {pastYearOptions.length > 0 && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => {
                        setShowPastYearSource(true);
                        setSourceYearId(pastYearOptions[0].id);
                        setSelectedIds(new Set());
                      }}
                    >
                      Advanced: promote from past school year
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <Label>Student list from</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-0 text-xs"
                      onClick={() => {
                        setShowPastYearSource(false);
                        setSourceYearId("current");
                        setSelectedIds(new Set());
                      }}
                    >
                      Use this year instead
                    </Button>
                  </div>
                  <Select
                    value={sourceYearId}
                    onValueChange={(v) => {
                      setSourceYearId(v);
                      setSelectedIds(new Set());
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">This school year</SelectItem>
                      {pastYearOptions.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          Past year · {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="picker-grade-filter">Grade level</Label>
              <Select
                value={pickerGrade}
                onValueChange={(v) => {
                  setPickerGrade(v);
                  setSelectedIds(new Set());
                }}
              >
                <SelectTrigger id="picker-grade-filter">
                  <SelectValue placeholder="Grade level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    {pickerAutoGradeLabel || "Recommended for this section"}
                  </SelectItem>
                  <SelectItem value="all">All grade levels</SelectItem>
                  {pickerGradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromPastYear && activeSection && (
                <p className="text-xs text-muted-foreground">
                  Past-year students must match the grade shown in the list to
                  enroll into {activeSection.grade}. Profile copies into this
                  school year when you save.
                </p>
              )}
              {!fromPastYear && pickerGrade === "all" && (
                <p className="text-xs text-muted-foreground">
                  Showing all grades from this year. Only students in{" "}
                  {activeSection?.grade} can be assigned to this section.
                </p>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name or student ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!fromPastYear && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={unassignedOnly}
                  onCheckedChange={(c) => setUnassignedOnly(c === true)}
                />
                Only students without a section (same grade)
              </label>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{selectedIds.size} selected</span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={selectAllVisible}
                disabled={pickerStudents.length === 0}
              >
                Select all shown
              </Button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
              {pickerLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pickerStudents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No students match. Try another school year or search term.
                </p>
              ) : (
                pickerStudents.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedIds.has(s.id)}
                      onCheckedChange={() => toggleId(s.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {s.lastName}, {s.firstName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {s.studentId}
                      </span>
                    </span>
                    {s.section && !fromPastYear ? (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        was {s.section}
                      </Badge>
                    ) : null}
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPickerOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={assignSelected}
                disabled={assigning || selectedIds.size === 0}
              >
                {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enroll {selectedIds.size || ""} student
                {selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
