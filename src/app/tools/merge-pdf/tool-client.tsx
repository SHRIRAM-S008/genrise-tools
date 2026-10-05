"use client";

import { useEffect, useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { mergePdfs } from "@/lib/mergePdf";
import { getPdfPageCount } from "@/lib/splitPdf";
import { renderPdfThumbnails } from "@/lib/pdfThumbnails";
import { formatBytes } from "@/lib/imageCore";

interface Entry {
  id: string;
  file: File;
  pageCount?: number;
  thumbnail?: string;
  unreadable?: boolean;
}

/** Turns free text into a safe base filename (no extension, no path separators). */
function safeBaseName(name: string): string {
  const cleaned = name.trim().replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "merged";
}

export default function MergePdfPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("merged");

  // Every thumbnail URL we create is tracked here, so cleanup always sees the current set
  // (state captured by a mount-only effect would be the initial empty list).
  const urlsRef = useRef(new Set<string>());

  function trackUrl(url: string) {
    urlsRef.current.add(url);
    return url;
  }

  function revokeUrl(url: string | undefined) {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  async function add(files: File[]) {
    const added: Entry[] = files.map((file, i) => ({ id: `${Date.now()}-${i}-${file.name}`, file }));
    setEntries((prev) => [...prev, ...added]);
    setResult(null);

    // Fill in page counts and cover previews as they finish, so the list is
    // usable immediately rather than after every file has been parsed.
    for (const entry of added) {
      try {
        const pageCount = await getPdfPageCount(entry.file);
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, pageCount } : e)));
        const [cover] = await renderPdfThumbnails(entry.file, { maxPages: 1, maxWidth: 100 });
        if (cover) {
          const url = trackUrl(URL.createObjectURL(cover.blob));
          setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, thumbnail: url } : e)));
        }
      } catch {
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, unreadable: true } : e)));
      }
    }
  }

  function move(index: number, direction: -1 | 1) {
    setEntries((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }

  function remove(entry: Entry) {
    revokeUrl(entry.thumbnail);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setResult(null);
  }

  async function run() {
    if (entries.length < 2) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await mergePdfs(entries.map((e) => e.file)));
    } catch {
      setError("Couldn't merge these PDFs. Make sure they aren't password protected.");
    } finally {
      setBusy(false);
    }
  }

  const totalPages = entries.reduce((sum, e) => sum + (e.pageCount ?? 0), 0);
  const unreadable = entries.some((e) => e.unreadable);
  const downloadName = `${safeBaseName(outputName)}.pdf`;

  return (
    <ToolLayout title="Merge PDF" description="Combine multiple PDF files into one, in the order you choose.">
      <FileDropzone
        accept="application/pdf"
        multiple
        onFiles={add}
        label={entries.length ? `${entries.length} PDF(s) selected` : "Click or drop PDFs here"}
        hint="Add at least two PDFs"
      />

      {entries.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {entries.map((entry, i) => (
              <li key={entry.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <span className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-accent/30 text-xs text-muted-foreground">
                  {entry.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.thumbnail} alt="" className="h-full w-full object-contain" />
                  ) : (
                    i + 1
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {i + 1}. {entry.file.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {entry.unreadable
                      ? "Couldn't read this PDF — it may be password protected"
                      : `${entry.pageCount !== undefined ? `${entry.pageCount} page(s) · ` : ""}${formatBytes(entry.file.size)}`}
                  </span>
                </span>

                <span className="flex shrink-0 gap-1">
                  <button aria-label={`Move ${entry.file.name} up`} onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                    <ChevronUp className="size-4" />
                  </button>
                  <button aria-label={`Move ${entry.file.name} down`} onClick={() => move(i, 1)} disabled={i === entries.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                    <ChevronDown className="size-4" />
                  </button>
                  <button aria-label={`Remove ${entry.file.name}`} onClick={() => remove(entry)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground">
            {totalPages > 0 ? `${totalPages} page(s) in the merged document` : "Reading page counts…"}
          </p>
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={run}
          disabled={entries.length < 2 || busy || unreadable}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Merging…" : "Merge PDFs"}
        </button>
        {entries.length > 0 && (
          <button
            onClick={() => {
              urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
              urlsRef.current.clear();
              setEntries([]);
              setResult(null);
            }}
            className="w-fit rounded-full border border-border px-6 py-3 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">
            {totalPages} page(s) · {formatBytes(result.blob.size)}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Output filename
            <span className="flex items-center gap-2">
              <input
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2"
              />
              <span className="text-muted-foreground">.pdf</span>
            </span>
          </label>
          <div>
            <DownloadButton blob={result.blob} filename={downloadName} />
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
