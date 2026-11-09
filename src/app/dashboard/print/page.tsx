"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IdCardRenderer } from "@/components/id-card/id-card-renderer";
import { IdCardPreviewStage } from "@/components/id-card/id-card-preview-stage";
import {
  parseTemplateDesign,
  type StudentPrintData,
  type TemplateDesign,
} from "@/types/template";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Printer,
  Search,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";

type PrintRecordType = "STUDENT" | "TEACHER";
type StaffKindFilter = "all" | "teaching" | "admin";

interface Person {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  grade: string | null;
  section: string | null;
  department: string | null;
  position: string | null;
  designation: string | null;
  isTeaching: boolean | null;
  recordType: PrintRecordType;
  printCount?: number;
}

interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  frontDesign: string;
  backDesign: string | null;
}

function personSubtitle(person: Person) {
  if (person.recordType === "TEACHER") {
    const role =
      person.designation ||
      person.position ||
      (person.isTeaching === false ? "Admin staff" : "Teacher");
    const parts = [person.studentId, role, person.department].filter(Boolean);
    return parts.join(" · ");
  }
  return [person.studentId, person.grade, person.section]
    .filter(Boolean)
    .join(" · ");
}

export default function PrintPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState("");
  const [recordType, setRecordType] = useState<PrintRecordType>("STUDENT");
  const [staffKind, setStaffKind] = useState<StaffKindFilter>("all");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [listTotal, setListTotal] = useState(0);
  const [listLimit, setListLimit] = useState(500);
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [printing, setPrinting] = useState(false);
  const [loggingPrint, setLoggingPrint] = useState(false);
  const pendingPrintLogRef = useRef<{
    templateId: string;
    studentIds: string[];
  } | null>(null);
  const [printData, setPrintData] = useState<{
    template: Template;
    students: StudentPrintData[];
    frontDesign: TemplateDesign;
    backDesign: TemplateDesign | null;
  } | null>(null);

  const isEmployee = recordType === "TEACHER";
  const personLabel = isEmployee ? "employee" : "student";
  const personLabelPlural = isEmployee ? "employees" : "students";

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((templateData) => {
        const tpls = templateData.templates || [];
        setTemplates(tpls);
        const defaultTpl = tpls.find(
          (t: Template & { isDefault?: boolean }) => t.isDefault
        );
        if (defaultTpl) setTemplateId(defaultTpl.id);
        else if (tpls.length > 0) setTemplateId(tpls[0].id);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      recordType,
      limit: "500",
      page: "1",
    });
    if (search.trim()) params.set("search", search.trim());
    if (isEmployee) {
      if (departmentFilter) params.set("department", departmentFilter);
      if (staffKind === "teaching") params.set("isTeaching", "true");
      if (staffKind === "admin") params.set("isTeaching", "false");
    } else {
      if (gradeFilter) params.set("grade", gradeFilter);
      if (sectionFilter) params.set("section", sectionFilter);
    }

    const delay = search.trim() ? 300 : 0;
    const t = setTimeout(() => {
      fetch(`/api/students?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setPeople(data.students || []);
          setListTotal(data.pagination?.total ?? 0);
          setListLimit(data.pagination?.limit ?? 500);
          if (data.filters?.grades) {
            setGradeOptions(
              (data.filters.grades as string[]).filter(Boolean).sort()
            );
          }
          if (data.filters?.sections) {
            setSectionOptions(
              (data.filters.sections as string[]).filter(Boolean).sort()
            );
          }
          if (data.filters?.departments) {
            setDepartmentOptions(
              (data.filters.departments as string[]).filter(Boolean).sort()
            );
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, delay);

    return () => clearTimeout(t);
  }, [
    search,
    gradeFilter,
    sectionFilter,
    departmentFilter,
    recordType,
    staffKind,
    isEmployee,
  ]);

  const recordPrintLog = useCallback(
    async (payload: { templateId: string; studentIds: string[] }) => {
      setLoggingPrint(true);
      const res = await fetch("/api/print/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setLoggingPrint(false);

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast({
          title: "Could not save print log",
          description:
            err?.error ||
            "The print completed but history was not recorded.",
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();
      const counts = (data.printCounts || {}) as Record<string, number>;
      setPeople((prev) =>
        prev.map((s) =>
          counts[s.id] != null ? { ...s, printCount: counts[s.id] } : s
        )
      );
      toast({
        title: "Print logged",
        description: `${payload.studentIds.length} ID(s) added to print history.`,
      });
    },
    []
  );

  useEffect(() => {
    function onAfterPrint() {
      const pending = pendingPrintLogRef.current;
      pendingPrintLogRef.current = null;
      if (!pending) return;
      void recordPrintLog(pending);
    }
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [recordPrintLog]);

  const filtered = people;
  const filteredIds = filtered.map((s) => s.id);
  const listTruncated = listTotal > filtered.length;
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const switchRecordType = (next: PrintRecordType) => {
    if (next === recordType) return;
    setRecordType(next);
    setSelectedIds(new Set());
    setPrintData(null);
    setSearch("");
    setGradeFilter("");
    setSectionFilter("");
    setDepartmentFilter("");
    setStaffKind("all");
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      filteredIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set([...selectedIds, ...filteredIds]));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleGenerate = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast({
        title: `Select at least one ${personLabel}`,
        variant: "destructive",
      });
      return;
    }
    if (!templateId) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }

    setPrinting(true);
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds: Array.from(selectedIds),
        templateId,
      }),
    });

    setPrinting(false);

    if (!res.ok) {
      const err = await res.json();
      toast({
        title: err.error || "Failed to generate",
        variant: "destructive",
      });
      return;
    }

    const data = await res.json();
    setPrintData({
      template: data.template,
      students: data.students,
      frontDesign: parseTemplateDesign(data.template.frontDesign),
      backDesign: data.template.backDesign
        ? parseTemplateDesign(data.template.backDesign)
        : null,
    });
  }, [selectedIds, templateId, personLabel]);

  function handlePrint() {
    if (!printData) return;

    pendingPrintLogRef.current = {
      templateId: printData.template.id,
      studentIds: printData.students.map((s) => s.id),
    };
    window.print();
  }

  const scale = 0.55;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight">Print IDs</h1>
        <p className="text-muted-foreground">
          Select students or employees (teachers, staff, admin) and a template,
          then generate a preview. <strong>Generate Preview</strong> does not
          create a log. A log is saved only after you finish the system print
          dialog (see{" "}
          <Link href="/dashboard/print-logs" className="text-primary underline">
            Print Logs
          </Link>
          ).
        </p>
        <p className="mt-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Campus hardware:</span>{" "}
          CR-80 templates (1011×638 px @ 300 dpi) print through your{" "}
          <span className="font-medium">system print dialog</span> (Entrust Sigma,
          Magicard, Evolis, Fargo, etc.). Scan printers in{" "}
          <Link href="/dashboard/settings" className="text-primary underline">
            Settings → Campus hardware
          </Link>
          . Card encoding is in the Access card tab on each record.
        </p>
      </div>

      <div className="no-print grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="inline-flex w-fit rounded-lg border bg-muted/40 p-1">
            <Button
              size="sm"
              variant={!isEmployee ? "default" : "ghost"}
              className="rounded-md"
              onClick={() => switchRecordType("STUDENT")}
            >
              Students
            </Button>
            <Button
              size="sm"
              variant={isEmployee ? "default" : "ghost"}
              className="rounded-md"
              onClick={() => switchRecordType("TEACHER")}
            >
              Teachers & Staff
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  isEmployee
                    ? "Search teachers, staff, admin..."
                    : "Search students..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allFilteredSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isEmployee ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={staffKind}
                onValueChange={(v) => setStaffKind(v as StaffKindFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Employee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  <SelectItem value="teaching">Teachers</SelectItem>
                  <SelectItem value="admin">Admin / non-teaching staff</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={departmentFilter || "all"}
                onValueChange={(v) =>
                  setDepartmentFilter(v === "all" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bulk by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={gradeFilter || "all"}
                onValueChange={(v) => {
                  setGradeFilter(v === "all" ? "" : v);
                  setSectionFilter("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bulk by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sectionFilter || "all"}
                onValueChange={(v) => setSectionFilter(v === "all" ? "" : v)}
                disabled={sectionOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bulk by section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  {sectionOptions.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>
                Showing {filtered.length} of {listTotal}{" "}
                {listTotal === 1 ? personLabel : personLabelPlural}
                {!isEmployee && gradeFilter ? ` in ${gradeFilter}` : ""}
                {!isEmployee && sectionFilter
                  ? ` · Section ${sectionFilter}`
                  : ""}
                {isEmployee && staffKind === "teaching" ? " · Teachers" : ""}
                {isEmployee && staffKind === "admin"
                  ? " · Admin / staff"
                  : ""}
                {isEmployee && departmentFilter
                  ? ` · ${departmentFilter}`
                  : ""}
              </span>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {allFilteredSelected ? "Unselect shown" : "Select shown"}
              </Button>
            </div>
            {listTruncated && (
              <p>
                List capped at {listLimit}. Filter
                {isEmployee ? " by department or type" : " by grade or section"}{" "}
                (or search) to load a smaller set.
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
              No {personLabelPlural} found. Add them under Students → Teachers,
              then return here to print IDs.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-lg border">
              {filtered.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/30"
                >
                  <Checkbox
                    checked={selectedIds.has(s.id)}
                    onCheckedChange={() => toggleOne(s.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {s.lastName}, {s.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {personSubtitle(s)}
                    </p>
                  </div>
                  {isEmployee && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {s.isTeaching === false ? "Staff" : "Teacher"}
                    </Badge>
                  )}
                  {(s.printCount ?? 0) > 0 && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Printed {s.printCount}×
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {selectedIds.size} of {filtered.length} selected
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Template</label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEmployee && (
              <p className="mt-2 text-xs text-muted-foreground">
                Use a staff template with fields like department, designation,
                and employee number — or reuse your student template if those
                fields are mapped.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={printing || selectedIds.size === 0}
              className="flex-1"
            >
              {printing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Generate Preview
            </Button>
            {printData && (
              <Button
                onClick={handlePrint}
                variant="secondary"
                disabled={loggingPrint}
              >
                {loggingPrint ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="mr-2 h-4 w-4" />
                )}
                Print
              </Button>
            )}
          </div>
        </div>
      </div>

      {printData && (
        <div className="print-area space-y-8">
          {printData.students.map((student) => (
            <div
              key={student.id}
              className="break-inside-avoid space-y-4 pb-8"
            >
              <div className="no-print text-sm font-medium text-muted-foreground">
                {student.fullName} ({student.studentId})
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="no-print mb-1 text-xs text-muted-foreground">
                    Front
                  </p>
                  <IdCardPreviewStage>
                    <IdCardRenderer
                      design={printData.frontDesign}
                      data={student}
                      width={printData.template.width}
                      height={printData.template.height}
                      scale={scale}
                    />
                  </IdCardPreviewStage>
                </div>
                {printData.backDesign && (
                  <div>
                    <p className="no-print mb-1 text-xs text-muted-foreground">
                      Back
                    </p>
                    <IdCardPreviewStage>
                      <IdCardRenderer
                        design={printData.backDesign}
                        data={student}
                        width={printData.template.width}
                        height={printData.template.height}
                        scale={scale}
                      />
                    </IdCardPreviewStage>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
