"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, ClipboardList, Printer, Trash2 } from "lucide-react";
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

interface PrintBatch {
  id: string;
  createdAt: string;
  templateName: string;
  studentCount: number;
  printedBy: { name: string; email: string };
  entryPreview: Array<{
    studentNumber: string;
    studentName: string;
    grade: string | null;
    section: string | null;
  }>;
  totalEntries: number;
}

interface BatchDetail {
  id: string;
  createdAt: string;
  templateName: string;
  studentCount: number;
  printedBy: { name: string; email: string };
  entries: Array<{
    studentNumber: string;
    studentName: string;
    grade: string | null;
    section: string | null;
    createdAt: string;
  }>;
}

function canDeletePrintLogs(role: string | undefined) {
  return role === "ADMIN" || role === "SCHOOL_ADMIN" || role === "REGISTRAR";
}

export default function PrintLogsPage() {
  const { data: session } = useSession();
  const canDelete = canDeletePrintLogs(session?.user?.role);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState({
    totalPrintEvents: 0,
    totalBatches: 0,
    uniqueStudentsPrinted: 0,
  });
  const [leaderboard, setLeaderboard] = useState<
    Array<{
      studentNumber: string;
      studentName: string;
      printCount: number;
    }>
  >([]);
  const [batches, setBatches] = useState<PrintBatch[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/print/logs?${params}`);
    const { data, parseError } = await readApiJson(res);
    setLoading(false);
    if (parseError || !data) {
      toast({
        title: "Could not load print logs",
        description:
          parseError ||
          `Server returned ${res.status}. Restart the dev server after database updates.`,
        variant: "destructive",
      });
      return;
    }
    if (!res.ok) {
      toast({
        title: "Could not load print logs",
        description:
          (typeof data.error === "string" && data.error) ||
          `Request failed (${res.status})`,
        variant: "destructive",
      });
      return;
    }
    setSummary(
      (data.summary as typeof summary) || {
        totalPrintEvents: 0,
        totalBatches: 0,
        uniqueStudentsPrinted: 0,
      }
    );
    setLeaderboard((data.studentLeaderboard as typeof leaderboard) || []);
    setBatches((data.batches as PrintBatch[]) || []);
    setTotalPages(
      (data.pagination as { totalPages?: number })?.totalPages || 1
    );
  }, [page, search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function openBatch(batchId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setBatchDetail(null);
    const res = await fetch(`/api/print/logs?batchId=${batchId}`);
    const { data, parseError } = await readApiJson(res);
    setDetailLoading(false);
    if (parseError || !res.ok || !data?.batch) {
      toast({
        title: "Could not load session",
        description:
          (typeof data?.error === "string" && data.error) ||
          parseError ||
          `Request failed (${res.status})`,
        variant: "destructive",
      });
      return;
    }
    setBatchDetail(data.batch as BatchDetail);
  }

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString();
  }

  async function deleteBatch(batchId: string, label: string) {
    if (
      !confirm(
        `Delete this print session?\n\n${label}\n\nThis removes it from history and updates print counts.`
      )
    ) {
      return;
    }
    setDeletingId(batchId);
    const res = await fetch(`/api/print/logs/${batchId}`, { method: "DELETE" });
    setDeletingId(null);
    const { data, parseError } = await readApiJson(res);
    if (parseError || !res.ok) {
      toast({
        title: "Could not delete",
        description:
          (typeof data?.error === "string" && data.error) ||
          parseError ||
          `Request failed (${res.status})`,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Print session deleted" });
    if (batchDetail?.id === batchId) {
      setDetailOpen(false);
      setBatchDetail(null);
    }
    loadLogs();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          Print history
        </div>
        <h1 className="text-3xl font-bold tracking-tight">ID Print Logs</h1>
        <p className="text-muted-foreground">
          History is recorded after you use the system print dialog on Print IDs.
          Generate Preview alone does not create a log.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Total IDs printed
          </p>
          <p className="mt-1 text-3xl font-bold">{summary.totalPrintEvents}</p>
          <p className="text-xs text-muted-foreground">Individual print events</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Print sessions
          </p>
          <p className="mt-1 text-3xl font-bold">{summary.totalBatches}</p>
          <p className="text-xs text-muted-foreground">Completed print sessions</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Students printed
          </p>
          <p className="mt-1 text-3xl font-bold">
            {summary.uniqueStudentsPrinted}
          </p>
          <p className="text-xs text-muted-foreground">Unique records with ≥1 print</p>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Most printed (top 10)</h2>
          <ul className="mt-3 divide-y">
            {leaderboard.map((row) => (
              <li
                key={row.studentNumber + row.studentName}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>
                  {row.studentName}{" "}
                  <span className="text-muted-foreground">({row.studentNumber})</span>
                </span>
                <Badge variant="secondary">{row.printCount}× printed</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search student, ID, template, or user..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <Printer className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No print logs yet. Print IDs from the Print IDs page to record history.
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="flex gap-2 rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => openBatch(batch.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{formatWhen(batch.createdAt)}</p>
                    <p className="text-sm text-muted-foreground">
                      {batch.templateName} · {batch.studentCount} ID
                      {batch.studentCount !== 1 ? "s" : ""} · {batch.printedBy.name}
                    </p>
                  </div>
                  <Badge>{batch.studentCount} printed</Badge>
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                  {batch.entryPreview
                    .map((e) => `${e.studentName} (${e.studentNumber})`)
                    .join(", ")}
                  {batch.totalEntries > batch.entryPreview.length
                    ? ` … +${batch.totalEntries - batch.entryPreview.length} more`
                    : ""}
                </p>
              </button>
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Delete session"
                  disabled={deletingId === batch.id}
                  onClick={() =>
                    deleteBatch(
                      batch.id,
                      `${formatWhen(batch.createdAt)} · ${batch.templateName}`
                    )
                  }
                >
                  {deletingId === batch.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print session details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : batchDetail ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>{formatWhen(batchDetail.createdAt)}</p>
                <p>Template: {batchDetail.templateName}</p>
                <p>By: {batchDetail.printedBy.name}</p>
              </div>
              <ul className="divide-y rounded-lg border">
                {batchDetail.entries.map((e, i) => (
                  <li key={`${e.studentNumber}-${i}`} className="px-3 py-2 text-sm">
                    <p className="font-medium">{e.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.studentNumber}
                      {e.grade ? ` · ${e.grade}` : ""}
                      {e.section ? ` · ${e.section}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={deletingId === batchDetail.id}
                  onClick={() =>
                    deleteBatch(
                      batchDetail.id,
                      `${formatWhen(batchDetail.createdAt)} · ${batchDetail.templateName}`
                    )
                  }
                >
                  {deletingId === batchDetail.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete this session
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
