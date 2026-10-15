"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ALL_CATEGORIES,
  CATEGORY_GRADES,
  CATEGORY_LABELS,
  getDisplayGrade,
  type StudentCategory,
} from "@/lib/categories";
import {
  buildStudentImportFullTemplateCsv,
  csvRowsToStudentRecords,
  downloadCsvFile,
} from "@/lib/student-csv";
import {
  STUDENT_IMPORT_OPTIONAL_FIELDS,
  buildStudentImportTemplateCsv,
  downloadBlobFile,
  spreadsheetFileToImportCsvText,
} from "@/lib/student-import-template";
import { buildStudentImportTemplateXlsx } from "@/lib/student-import-template-xlsx";
import {
  emptyRecordForm,
  recordToForm,
  type RecordFormState,
} from "@/lib/student-form";
import { RecordExtendedFields } from "@/components/students/record-extended-fields";
import { Checkbox } from "@/components/ui/checkbox";
import {
  drawPreparedStudentPhoto,
  loadImageElement,
  readAutoRemovePhotoBgPreference,
  removePhotoBackgroundWithAi,
  writeAutoRemovePhotoBgPreference,
  type PhotoBackgroundMode,
} from "@/lib/photo-background";
import {
  Plus,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  Layers,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowTip } from "@/components/layout/workflow-tip";
import { SectionEnrollmentPanel } from "@/components/students/section-enrollment-panel";
import { SectionBuilder } from "@/components/students/section-builder";

type Student = RecordFormState & { id: string; category: StudentCategory };

interface GradeSection {
  id: string;
  category: StudentCategory;
  grade: string;
  name: string;
}

interface SchoolYearOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface EnrollmentRecord extends Student {
  schoolYear: SchoolYearOption;
}

const PHOTO_OUTPUT = { width: 600, height: 750 };

function StudentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const studentView =
    searchParams.get("view") === "enroll" ? "enroll" : "records";

  function setStudentView(view: "records" | "enroll") {
    if (view === "enroll") {
      router.replace("/dashboard/students?view=enroll");
    } else {
      router.replace("/dashboard/students");
    }
  }

  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoImageRef = useRef<HTMLImageElement | null>(null);
  const photoCutoutImageRef = useRef<HTMLImageElement | null>(null);
  const photoCutoutForSourceRef = useRef("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<
    "STUDENT" | "TEACHER"
  >("STUDENT");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [grades, setGrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [gradeSections, setGradeSections] = useState<GradeSection[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<RecordFormState>(() => emptyRecordForm());
  const [saving, setSaving] = useState(false);
  const [importText, setImportText] = useState("");
  const [importTemplateExtras, setImportTemplateExtras] = useState<string[]>(
    []
  );
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"xlsx" | "pdf" | "csv">(
    "xlsx"
  );
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [staffSyncing, setStaffSyncing] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoSource, setPhotoSource] = useState("");
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [photoBackgroundMode, setPhotoBackgroundMode] =
    useState<PhotoBackgroundMode>("white");
  const [autoRemoveBgOnUpload, setAutoRemoveBgOnUpload] = useState(false);
  const [photoBgProcessing, setPhotoBgProcessing] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    setAutoRemoveBgOnUpload(readAutoRemovePhotoBgPreference());
  }, []);

  async function downloadEnrollmentHistoryCsv() {
    const res = await fetch(
      "/api/students/export-enrollments?recordType=STUDENT"
    );
    if (!res.ok) {
      toast({ title: "Export failed", variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "enrollment-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const renderPreparedPhoto = useCallback(() => {
    const canvas = photoCanvasRef.current;
    if (!canvas) return;

    const image =
      photoBackgroundMode === "auto-remove" && photoCutoutImageRef.current
        ? photoCutoutImageRef.current
        : photoImageRef.current;
    if (!image) return;

    canvas.width = PHOTO_OUTPUT.width;
    canvas.height = PHOTO_OUTPUT.height;
    drawPreparedStudentPhoto(canvas, image, {
      backgroundMode: photoBackgroundMode,
      zoom: photoZoom,
      offsetX: photoOffsetX,
      offsetY: photoOffsetY,
    });
  }, [photoBackgroundMode, photoOffsetX, photoOffsetY, photoZoom]);

  const runAutoBackgroundRemoval = useCallback(async () => {
    if (!photoSource) return;
    if (
      photoCutoutForSourceRef.current === photoSource &&
      photoCutoutImageRef.current
    ) {
      return;
    }

    setPhotoBgProcessing(true);
    try {
      const blob = await removePhotoBackgroundWithAi(photoSource);
      photoCutoutImageRef.current = await loadImageElement(blob);
      photoCutoutForSourceRef.current = photoSource;
    } catch {
      toast({
        title: "Automatic background removal failed",
        description:
          "Try “Remove light background” or upload a photo with a plain backdrop.",
        variant: "destructive",
      });
      setPhotoBackgroundMode("remove-light");
    } finally {
      setPhotoBgProcessing(false);
      requestAnimationFrame(renderPreparedPhoto);
    }
  }, [photoSource, renderPreparedPhoto]);

  useEffect(() => {
    if (
      !photoEditorOpen ||
      photoBackgroundMode !== "auto-remove" ||
      !photoSource
    ) {
      return;
    }
    void runAutoBackgroundRemoval();
  }, [
    photoEditorOpen,
    photoBackgroundMode,
    photoSource,
    runAutoBackgroundRemoval,
  ]);

  useEffect(() => {
    if (!photoEditorOpen) return;
    requestAnimationFrame(renderPreparedPhoto);
  }, [renderPreparedPhoto, photoEditorOpen, photoSource]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      recordType: recordTypeFilter,
      ...(search && { search }),
      ...(gradeFilter && { grade: gradeFilter }),
      ...(sectionFilter && { section: sectionFilter }),
      ...(categoryFilter && { category: categoryFilter }),
    });

    const res = await fetch(`/api/students?${params}`);
    const data = await res.json();
    setStudents(data.students || []);
    setTotalPages(data.pagination?.totalPages || 1);
    setTotal(data.pagination?.total || 0);
    setGrades(data.filters?.grades || []);
    setSections(data.filters?.sections || []);
    setLoading(false);
  }, [
    page,
    search,
    gradeFilter,
    sectionFilter,
    categoryFilter,
    recordTypeFilter,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const fetchGradeSections = useCallback(async () => {
    const res = await fetch("/api/sections");
    const data = await res.json();
    setGradeSections(data.sections || []);
  }, []);

  useEffect(() => {
    fetchGradeSections();
  }, [fetchGradeSections]);

  async function fetchEnrollments(studentId: string) {
    const res = await fetch(`/api/students/${studentId}/enrollments`);
    if (!res.ok) {
      setEnrollments([]);
      return;
    }
    const data = await res.json();
    setEnrollments(data.enrollments || []);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyRecordForm(), recordType: recordTypeFilter });
    setEnrollments([]);
    setDialogOpen(true);
  }

  function openEdit(student: Student) {
    setEditing(student);
    setForm(recordToForm(student));
    fetchEnrollments(student.id);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...form,
      designation: form.designation || form.position || "",
      employeeNumber: form.employeeNumber || form.studentId,
    };

    const url = editing ? `/api/students/${editing.id}` : "/api/students";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      toast({
        title: "Failed to save",
        description: err?.error || `Server error (${res.status})`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: editing
        ? `${form.recordType === "TEACHER" ? "Teacher" : "Student"} updated`
        : `${form.recordType === "TEACHER" ? "Teacher" : "Student"} created`,
    });
    setDialogOpen(false);
    fetchStudents();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Failed to delete", variant: "destructive" });
      return;
    }
    toast({ title: "Student deleted" });
    fetchStudents();
  }

  async function syncStaffFromPriorYear() {
    setStaffSyncing(true);
    const res = await fetch("/api/school-years/copy-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setStaffSyncing(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "Sync failed",
        description: data.error || "Could not copy employees",
        variant: "destructive",
      });
      return;
    }
    const sc = data.staffCopy;
    toast({
      title: "Employees synced",
      description: `${sc?.created ?? 0} added, ${sc?.updated ?? 0} updated from ${data.sourceSchoolYearName}.`,
    });
    fetchStudents();
  }

  async function uploadImageFile(
    file: File,
    type: "photo" | "signature"
  ): Promise<string | null> {
    const body = new FormData();
    body.append("file", file);
    body.append("type", type);
    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url as string;
  }

  async function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const url = await uploadImageFile(file, "signature");
    if (!url) {
      toast({ title: "Signature upload failed", variant: "destructive" });
      return;
    }
    setForm((f) => ({ ...f, signatureUrl: url }));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        photoImageRef.current = image;
        setPhotoSource(reader.result as string);
        setPhotoZoom(1);
        setPhotoOffsetX(0);
        setPhotoOffsetY(0);
        photoCutoutImageRef.current = null;
        photoCutoutForSourceRef.current = "";
        const preferAuto = readAutoRemovePhotoBgPreference();
        setPhotoBackgroundMode(preferAuto ? "auto-remove" : "white");
        setPhotoEditorOpen(true);
        requestAnimationFrame(renderPreparedPhoto);
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function uploadPreparedPhoto() {
    const canvas = photoCanvasRef.current;
    if (!canvas) return;

    renderPreparedPhoto();
    setPhotoUploading(true);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.95)
    );

    if (!blob) {
      setPhotoUploading(false);
      toast({ title: "Failed to prepare photo", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", blob, "prepared-photo.png");
    formData.append("type", "photo");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setPhotoUploading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      toast({
        title: "Upload failed",
        description: err?.error || "Please choose a smaller image file.",
        variant: "destructive",
      });
      return;
    }
    const data = await res.json();
    setForm((f) => ({ ...f, photoUrl: data.url }));
    setPhotoEditorOpen(false);
    setPhotoSource("");
    photoImageRef.current = null;
    photoCutoutImageRef.current = null;
    photoCutoutForSourceRef.current = "";
  }

  function openImportDialog() {
    setImportErrors([]);
    setImportOpen(true);
  }

  function toggleImportTemplateExtra(key: string, checked: boolean) {
    setImportTemplateExtras((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key)
    );
  }

  async function handleDownloadExcelTemplate() {
    setTemplateDownloading(true);
    try {
      const buffer = await buildStudentImportTemplateXlsx(importTemplateExtras);
      downloadBlobFile(
        "student-import-template.xlsx",
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
    } catch {
      toast({ title: "Could not build Excel template", variant: "destructive" });
    }
    setTemplateDownloading(false);
  }

  function handleDownloadCsvTemplate() {
    downloadCsvFile(
      "student-import-template.csv",
      buildStudentImportTemplateCsv(importTemplateExtras)
    );
  }

  function handleDownloadFullTemplate() {
    downloadCsvFile(
      "student-import-full.csv",
      buildStudentImportFullTemplateCsv()
    );
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (isExcel && reader.result instanceof ArrayBuffer) {
          const csv = await spreadsheetFileToImportCsvText(reader.result);
          setImportText(csv);
        } else {
          setImportText(String(reader.result ?? ""));
        }
        setImportErrors([]);
      } catch {
        toast({ title: "Could not read file", variant: "destructive" });
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
    e.target.value = "";
  }

  async function handleExport(format: "xlsx" | "pdf" | "csv" = exportFormat) {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        recordType: recordTypeFilter,
        ...(search ? { search } : {}),
        ...(gradeFilter ? { grade: gradeFilter } : {}),
        ...(sectionFilter ? { section: sectionFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
      });
      const res = await fetch(`/api/students/export?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast({
          title: "Export failed",
          description: err?.error || "Could not export records.",
          variant: "destructive",
        });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const ext = format === "csv" ? "csv" : format === "pdf" ? "pdf" : "xlsx";
      const filename =
        match?.[1] ||
        (recordTypeFilter === "TEACHER" ? `teachers.${ext}` : `students.${ext}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      const formatLabel =
        format === "pdf" ? "PDF" : format === "csv" ? "CSV" : "Excel";
      toast({
        title: "Export ready",
        description: `${formatLabel} file downloaded.`,
      });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
    setExporting(false);
  }

  async function handleImport() {
    setImporting(true);
    setImportErrors([]);
    try {
      const rows = csvRowsToStudentRecords(importText);
      if (rows.length === 0) {
        toast({
          title: "Nothing to import",
          description: "Add a header row and at least one data row.",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Import failed",
          description: data.error || "Could not import file.",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      const errors = (data.errors as string[] | undefined) ?? [];
      setImportErrors(errors);
      toast({
        title: "Import complete",
        description: `${data.created} created, ${data.skipped} skipped`,
      });
      if (data.created > 0) {
        fetchStudents();
      }
      if (errors.length === 0) {
        setImportOpen(false);
        setImportText("");
      }
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    }
    setImporting(false);
  }

  const gradeOptions =
    form.recordType === "TEACHER" || form.category === "TERTIARY"
      ? []
      : CATEGORY_GRADES[form.category] || [];
  const sectionOptions = Array.from(
    new Set([
      ...gradeSections
        .filter((section) => section.category === form.category)
        .filter((section) => section.grade === form.grade)
        .map((section) => section.name),
      ...(form.section ? [form.section] : []),
    ])
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            People records
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Students & teachers
          </h1>
          <p className="text-muted-foreground">
            {total} {recordTypeFilter === "TEACHER" ? "teacher" : "student"}
            {total !== 1 ? "s" : ""} · current school year
          </p>
        </div>
        {studentView === "records" && (
          <Button onClick={openCreate} className="shrink-0 shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add {recordTypeFilter === "TEACHER" ? "teacher" : "student"}
          </Button>
        )}
      </div>

      {recordTypeFilter === "STUDENT" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1">
            <Button
              size="sm"
              variant={studentView === "records" ? "default" : "ghost"}
              className="rounded-md"
              onClick={() => setStudentView("records")}
            >
              Student records
            </Button>
            <Button
              size="sm"
              variant={studentView === "enroll" ? "default" : "ghost"}
              className="rounded-md"
              onClick={() => setStudentView("enroll")}
            >
              <Layers className="mr-2 h-3.5 w-3.5" />
              Enrollment
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSectionsOpen(true)}
          >
            Section builder
          </Button>
        </div>
      )}

      {recordTypeFilter === "TEACHER" && (
        <WorkflowTip title="Employees (teachers & admin staff)">
          <p>
            Each school year has its own row per employee ID, but profile and
            card data stay the same when you{" "}
            <strong>create a new year</strong> (auto-copied from the prior
            year). If this year is missing people, use{" "}
            <strong>Sync from prior year</strong> below.
          </p>
        </WorkflowTip>
      )}

      {recordTypeFilter === "STUDENT" && studentView === "records" && (
        <WorkflowTip title="Registrar workflow">
          <p>
            <strong>1.</strong> Create sections · <strong>2.</strong> Add or
            import students (section can stay blank) · <strong>3.</strong> Open
            the <strong>Enrollment</strong> tab to assign them to a class.
          </p>
        </WorkflowTip>
      )}

      {recordTypeFilter === "STUDENT" && studentView === "enroll" && (
        <SectionEnrollmentPanel
          currentYearId={session?.user?.currentSchoolYearId ?? ""}
          onEnrolled={fetchStudents}
        />
      )}

      {!(recordTypeFilter === "STUDENT" && studentView === "enroll") && (
      <>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="inline-flex w-fit rounded-lg border bg-muted/40 p-1">
              <Button
                size="sm"
                variant={recordTypeFilter === "STUDENT" ? "default" : "ghost"}
                className="rounded-md"
                onClick={() => {
                  setRecordTypeFilter("STUDENT");
                  setCategoryFilter("");
                  setGradeFilter("");
                  setSectionFilter("");
                  setPage(1);
                }}
              >
                Students
              </Button>
              <Button
                size="sm"
                variant={recordTypeFilter === "TEACHER" ? "default" : "ghost"}
                className="rounded-md"
                onClick={() => {
                  setRecordTypeFilter("TEACHER");
                  setCategoryFilter("");
                  setGradeFilter("");
                  setSectionFilter("");
                  setPage(1);
                  setStudentView("records");
                }}
              >
                Teachers
              </Button>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-2xl xl:grid-cols-2">
              {recordTypeFilter === "TEACHER" && (
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    School year
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncStaffFromPriorYear}
                    disabled={staffSyncing}
                  >
                    {staffSyncing ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Users className="mr-2 h-3.5 w-3.5" />
                    )}
                    Sync from prior year
                  </Button>
                </div>
              )}
              {recordTypeFilter === "STUDENT" && (
                <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Enrollment
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentView("enroll")}
                    >
                      <Layers className="mr-2 h-3.5 w-3.5" />
                      Enrollment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSectionsOpen(true)}
                    >
                      Sections
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadEnrollmentHistoryCsv}
                    >
                      <Download className="mr-2 h-3.5 w-3.5" />
                      History CSV
                    </Button>
                  </div>
                </div>
              )}
              <div
                className={
                  recordTypeFilter === "STUDENT"
                    ? "space-y-2 sm:col-span-2 xl:col-span-1"
                    : "space-y-2 sm:col-span-2"
                }
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Import & export
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={openImportDialog}>
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Import CSV
                  </Button>
                  <div className="flex items-center rounded-md border bg-background">
                    <Select
                      value={exportFormat}
                      onValueChange={(v) =>
                        setExportFormat(v as "xlsx" | "pdf" | "csv")
                      }
                    >
                      <SelectTrigger className="h-9 w-[118px] border-0 shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">Excel</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-l-none px-3"
                      onClick={() => handleExport(exportFormat)}
                      disabled={exporting || total === 0}
                    >
                      {exporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          {exportFormat === "pdf" ? (
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                          ) : exportFormat === "csv" ? (
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Export
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {recordTypeFilter === "STUDENT" && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Button
                    size="sm"
                    variant={categoryFilter === "" ? "default" : "outline"}
                    className="shrink-0"
                    onClick={() => {
                      setCategoryFilter("");
                      setPage(1);
                    }}
                  >
                    All
                  </Button>
                  {ALL_CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={categoryFilter === cat ? "default" : "outline"}
                      className="shrink-0"
                      onClick={() => {
                        setCategoryFilter(cat);
                        setPage(1);
                      }}
                    >
                      {CATEGORY_LABELS[cat].split(" (")[0]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  recordTypeFilter === "TEACHER"
                    ? "Search name, ID, department…"
                    : "Search name, student ID, course…"
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 pl-10"
              />
            </div>
            {recordTypeFilter === "STUDENT" && (
              <>
                <Select
                  value={gradeFilter || "all"}
                  onValueChange={(v) => {
                    setGradeFilter(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All grades</SelectItem>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g!}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sectionFilter || "all"}
                  onValueChange={(v) => {
                    setSectionFilter(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s!}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center text-muted-foreground shadow-sm">
          No {recordTypeFilter === "TEACHER" ? "teachers" : "students"} found
          for this school year.
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((s) => {
            const fullName = `${s.firstName} ${s.lastName}`;
            return (
              <div
                key={s.id}
                className="group flex items-center gap-4 rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
              >
                <Avatar
                  src={s.photoUrl}
                  name={fullName}
                  size="lg"
                  className="ring-primary/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      {s.studentId}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {s.recordType === "TEACHER"
                        ? "Teacher"
                        : CATEGORY_LABELS[s.category].split(" (")[0]}
                    </Badge>
                  </div>
                  <p className="truncate text-base font-semibold">
                    {s.lastName}, {s.firstName}
                    {s.middleName ? ` ${s.middleName.charAt(0)}.` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.recordType === "TEACHER"
                      ? [s.position, s.department].filter(Boolean).join(" · ")
                      : `${getDisplayGrade(s)}${s.section ? ` · Sec ${s.section}` : ""}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit ${form.recordType === "TEACHER" ? "Teacher" : "Student"}`
                : `Add ${form.recordType === "TEACHER" ? "Teacher" : "Student"}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Record Type *</Label>
              <Select
                value={form.recordType}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    recordType: v as "STUDENT" | "TEACHER",
                    grade: "",
                    section: "",
                    customGradeName: "",
                    course: "",
                    department: "",
                    position: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="TEACHER">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.recordType === "STUDENT" && (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      category: v as StudentCategory,
                      grade: "",
                      section: "",
                      customGradeName: "",
                      course: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {form.recordType === "TEACHER" ? "Teacher ID" : "Student ID"} *
                </Label>
                <Input
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                />
              </div>
              {form.recordType === "STUDENT" && (
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={form.section || "none"}
                    disabled={!form.grade || sectionOptions.length === 0}
                    onValueChange={(v) =>
                      setForm({ ...form, section: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          form.grade ? "Select section" : "Select grade first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No section</SelectItem>
                      {sectionOptions.map((section) => (
                        <SelectItem key={section} value={section}>
                          {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.grade && sectionOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add sections for {form.grade} in Manage Sections.
                    </p>
                  )}
                </div>
              )}
            </div>

            {form.recordType === "STUDENT" && form.category === "TERTIARY" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Level *</Label>
                  <Input
                    placeholder="e.g. 1st Year, 2nd Year"
                    value={form.customGradeName}
                    onChange={(e) =>
                      setForm({ ...form, customGradeName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course *</Label>
                  <Input
                    placeholder="e.g. BS Computer Science"
                    value={form.course}
                    onChange={(e) =>
                      setForm({ ...form, course: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select
                  value={form.grade || ""}
                  onValueChange={(v) =>
                    setForm({ ...form, grade: v, section: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <RecordExtendedFields
              form={form}
              setForm={setForm}
              onPhotoUpload={handlePhotoUpload}
              onSignatureUpload={handleSignatureUpload}
            />

            {editing && form.recordType === "STUDENT" && (
              <div className="rounded-xl border bg-white p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold">Enrollment History</h3>
                  <p className="text-xs text-muted-foreground">
                    Past school years for this student. Update the current year
                    using grade and section at the top of this form, then Save.
                  </p>
                </div>
                {enrollments.length === 0 ? (
                  <p className="rounded-lg border bg-slate-50 p-3 text-xs text-muted-foreground">
                    No enrollment history yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {enrollments.map((enrollment) => (
                      <li
                        key={enrollment.id}
                        className="rounded-lg border bg-slate-50 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium">
                          {enrollment.schoolYear.name}
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {getDisplayGrade(enrollment)}
                          {enrollment.section
                            ? ` · Section ${enrollment.section}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={photoEditorOpen} onOpenChange={setPhotoEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Prepare Photo Before Upload</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-slate-100 p-4">
              <div className="relative h-[300px] w-[240px] overflow-hidden rounded-lg border bg-white shadow-sm">
                <canvas
                  ref={photoCanvasRef}
                  className="h-full w-full object-contain"
                />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-[18%] h-[120px] w-[95px] -translate-x-1/2 rounded-full border-2 border-dashed border-primary/80 shadow-[0_0_0_999px_rgba(15,23,42,0.08)]" />
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/25" />
                  <div className="absolute left-0 top-[42%] h-px w-full bg-primary/25" />
                  <div className="absolute bottom-[9%] left-1/2 h-[74px] w-[140px] -translate-x-1/2 rounded-t-full border-x-2 border-t-2 border-dashed border-primary/60" />
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Align the face inside the circle guide before uploading.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Background</Label>
                <Select
                  value={photoBackgroundMode}
                  onValueChange={(v) =>
                    setPhotoBackgroundMode(v as PhotoBackgroundMode)
                  }
                  disabled={photoBgProcessing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto-remove">
                      Automatic remove background (AI)
                    </SelectItem>
                    <SelectItem value="white">White background only</SelectItem>
                    <SelectItem value="remove-light">
                      Remove plain light background (fast)
                    </SelectItem>
                    <SelectItem value="original">Keep original</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3">
                  <Checkbox
                    id="auto-remove-bg-pref"
                    checked={autoRemoveBgOnUpload}
                    disabled={photoBgProcessing}
                    onCheckedChange={(checked) => {
                      const on = checked === true;
                      setAutoRemoveBgOnUpload(on);
                      writeAutoRemovePhotoBgPreference(on);
                      if (on) setPhotoBackgroundMode("auto-remove");
                    }}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="auto-remove-bg-pref"
                      className="cursor-pointer font-normal leading-snug"
                    >
                      Automatically remove background on every new upload
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Saved on this browser. AI runs once when you open the
                      photo editor (first time may take a few seconds).
                    </p>
                  </div>
                </div>
                {photoBgProcessing && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Removing background…
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  For busy backgrounds, use automatic (AI). For studio-style
                  white walls, “plain light background” is faster.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Size / Zoom</Label>
                <Input
                  type="range"
                  min="0.6"
                  max="2.5"
                  step="0.05"
                  value={photoZoom}
                  onChange={(e) => setPhotoZoom(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Move Left / Right</Label>
                  <Input
                    type="range"
                    min="-250"
                    max="250"
                    step="5"
                    value={photoOffsetX}
                    onChange={(e) => setPhotoOffsetX(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Move Up / Down</Label>
                  <Input
                    type="range"
                    min="-250"
                    max="250"
                    step="5"
                    value={photoOffsetY}
                    onChange={(e) => setPhotoOffsetY(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPhotoEditorOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={uploadPreparedPhoto}
                  disabled={photoUploading || photoBgProcessing}
                >
                  {photoUploading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Upload Prepared Photo
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sectionsOpen} onOpenChange={setSectionsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage sections</DialogTitle>
          </DialogHeader>
          <SectionBuilder onChanged={fetchGradeSections} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportErrors([]);
            setImportText("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import students</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Required: <strong>Student ID</strong>, <strong>First Name</strong>,{" "}
            <strong>Last Name</strong>. The template includes ID, name, suffix,
            birthdate, gender, LRN, student/ESC numbers, emergency contact,
            phone, address, grade, and section. Use the Excel template for
            dropdowns (suffix, gender, grade).
          </p>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-sm font-medium">Optional extra columns</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Check any fields to add them to the downloaded template.
            </p>
            <div className="grid max-h-36 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {STUDENT_IMPORT_OPTIONAL_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={importTemplateExtras.includes(field.key)}
                    onCheckedChange={(v) =>
                      toggleImportTemplateExtra(field.key, v === true)
                    }
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={templateDownloading}
              onClick={() => void handleDownloadExcelTemplate()}
            >
              {templateDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Excel template (dropdowns)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCsvTemplate}
            >
              CSV template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadFullTemplate}
            >
              Full export template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => importFileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload file
            </Button>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleImportFileChange}
            />
          </div>
          <textarea
            className="min-h-[220px] w-full rounded-md border bg-background p-3 font-mono text-xs"
            placeholder="Paste CSV here, or choose a file above…"
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportErrors([]);
            }}
          />
          {importErrors.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="mb-2 font-medium">Issues on some rows:</p>
              <ul className="list-inside list-disc space-y-1">
                {importErrors.slice(0, 20).map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
              {importErrors.length > 20 && (
                <p className="mt-2">…and {importErrors.length - 20} more</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !importText.trim()}
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <StudentsPageContent />
    </Suspense>
  );
}
