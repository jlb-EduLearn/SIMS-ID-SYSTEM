"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Download, FileSpreadsheet, Loader2, ScanLine, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

async function readApiJson(res: Response) {
  const text = await res.text();
  if (!text) return { data: null as null, parseError: "Empty response" };
  try {
    return { data: JSON.parse(text) as Record<string, unknown>, parseError: null };
  } catch {
    return { data: null, parseError: "Invalid JSON response" };
  }
}

type EntryLogRow = {
  id: string;
  createdAt: string;
  found: boolean;
  personType: string;
  displayId: string | null;
  fullName: string | null;
  category: string | null;
  categoryLabel: string | null;
  grade: string | null;
  section: string | null;
  department: string | null;
  scanCode: string | null;
};

type CategoryOption = { value: string; label: string };

export default function EntryLogsPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [section, setSection] = useState("");
  const [personType, setPersonType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logs, setLogs] = useState<EntryLogRow[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    recognizedStaff: 0,
    recognizedStudents: 0,
  });
  const [sections, setSections] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  function buildFilterParams() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (category) params.set("category", category);
    if (section) params.set("section", section);
    if (personType) params.set("personType", personType);
    return params;
  }

  async function exportLogs(format: "csv" | "pdf") {
    setExporting(format);
    try {
      const params = buildFilterParams();
      params.set("format", format);
      const res = await fetch(`/api/board/entry-logs/export?${params}`);
      if (!res.ok) {
        const { data } = await readApiJson(res);
        throw new Error(
          (typeof data?.error === "string" && data.error) ||
            `Export failed (${res.status})`
        );
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ||
        `entry-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Downloaded ${format.toUpperCase()}` });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  }

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
    });
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (category) params.set("category", category);
    if (section) params.set("section", section);
    if (personType) params.set("personType", personType);

    const res = await fetch(`/api/board/entry-logs?${params}`);
    const { data, parseError } = await readApiJson(res);
    setLoading(false);

    if (parseError || !data || !res.ok) {
      toast({
        title: "Could not load entry logs",
        description:
          (typeof data?.error === "string" && data.error) ||
          parseError ||
          `Request failed (${res.status})`,
        variant: "destructive",
      });
      return;
    }

    setLogs((data.logs as EntryLogRow[]) || []);
    setSummary(
      (data.summary as typeof summary) || {
        total: 0,
        recognizedStaff: 0,
        recognizedStudents: 0,
      }
    );
    setTotalPages(
      (data.pagination as { totalPages?: number })?.totalPages || 1
    );
    const opts = data.filterOptions as {
      sections?: string[];
      categories?: CategoryOption[];
    };
    setSections(opts?.sections || []);
    setCategories(opts?.categories || []);
  }, [page, search, dateFrom, dateTo, category, section, personType]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString();
  }

  function personBadge(type: string, found: boolean) {
    if (!found) return <Badge variant="destructive">Unrecognized</Badge>;
    if (type === "TEACHER") return <Badge className="bg-indigo-600">Staff</Badge>;
    if (type === "STUDENT") return <Badge variant="secondary">Student</Badge>;
    return <Badge variant="outline">{type}</Badge>;
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setCategory("");
    setSection("");
    setPersonType("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="h-4 w-4" />
          Lobby board
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Entry Logs</h1>
        <p className="text-muted-foreground">
          Each tap or scan on the info board is recorded here — students, staff,
          and unrecognized cards.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Matching entries
          </p>
          <p className="mt-1 text-3xl font-bold">{summary.total}</p>
          <p className="text-xs text-muted-foreground">With current filters</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Staff taps
          </p>
          <p className="mt-1 text-3xl font-bold">{summary.recognizedStaff}</p>
          <p className="text-xs text-muted-foreground">Recognized staff IDs</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Student taps
          </p>
          <p className="mt-1 text-3xl font-bold">{summary.recognizedStudents}</p>
          <p className="text-xs text-muted-foreground">Recognized student IDs</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5 xl:col-span-2">
            <Label htmlFor="entry-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="entry-search"
                placeholder="Name, ID, scan code…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-from">Date from</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-to">Date to</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select
              value={category || "ALL"}
              onValueChange={(v) => {
                setCategory(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All levels</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select
              value={section || "ALL"}
              onValueChange={(v) => {
                setSection(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All sections</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Person</Label>
            <Select
              value={personType || "ALL"}
              onValueChange={(v) => {
                setPersonType(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Everyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everyone</SelectItem>
                <SelectItem value="STUDENT">Students only</SelectItem>
                <SelectItem value="TEACHER">Staff only</SelectItem>
                <SelectItem value="UNKNOWN">Unrecognized only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!!exporting || summary.total === 0}
              onClick={() => exportLogs("csv")}
            >
              {exporting === "csv" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!!exporting || summary.total === 0}
              onClick={() => exportLogs("pdf")}
            >
              {exporting === "pdf" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Exports use the filters above (up to 5,000 rows, newest first).
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <ScanLine className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No entry logs yet. Scans appear when someone taps or scans on the lobby
          board.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Level / role</th>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">ID / scan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {personBadge(row.personType, row.found)}
                        <span className="font-medium">
                          {row.fullName || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.personType === "TEACHER" ? (
                        <span>
                          {row.department || row.grade || "Staff"}
                        </span>
                      ) : row.found ? (
                        <span>
                          {row.categoryLabel || row.category || "—"}
                          {row.grade ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {row.grade}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{row.section || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.displayId || row.scanCode || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
