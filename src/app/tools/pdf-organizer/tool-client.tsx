"use client";

import { useEffect, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { ChevronLeft, ChevronRight, RotateCw, Trash2, Undo2 } from "lucide-react";
import { getPageCount, rebuildPdf, type PdfPageState } from "@/lib/pdfOrganizer";
import { renderPdfThumbnails } from "@/lib/pdfThumbnails";

const MAX_THUMBNAILS = 60;

function explainPdfError(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : "";
  if (name === "PasswordException") return "This PDF is password protected. Unlock it first, then try again.";
  if (name === "InvalidPDFException" || name === "MissingPDFException")
    return "This file doesn't look like a valid PDF. It may be corrupt.";
  return `Couldn't rebuild the PDF${message ? ` (${message})` : ""}.`;
}

export default function PdfOrganizerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageState[]>([]);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [rendering, setRendering] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Selection is keyed by originalIndex, which stays stable when pages are reordered.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Object URLs for the thumbnails live as long as the loaded document does.
  useEffect(() => {
    return () => {
      thumbnails.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [thumbnails]);

  async function load(selectedFile: File) {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setSelected(new Set());
    setThumbnails(new Map());

    try {
      const count = await getPageCount(selectedFile);
      setPages(Array.from({ length: count }, (_, i) => ({ originalIndex: i, rotation: 0, deleted: false })));
    } catch (err) {
      setPages([]);
      setFile(null);
      const name = err instanceof Error ? err.name : "";
      setError(
        name === "PasswordException" || /encrypt|password/i.test(err instanceof Error ? err.message : "")
          ? "This PDF is password protected. Unlock it first, then try again."
          : "Couldn't read that PDF. It may be corrupt."
      );
      return;
    }

    setRendering("Rendering page previews…");
    try {
      const rendered = await renderPdfThumbnails(selectedFile, {
        maxPages: MAX_THUMBNAILS,
        onProgress: (page, total) => setRendering(`Rendering previews… ${page}/${total}`),
      });
      setThumbnails(new Map(rendered.map((t) => [t.pageIndex, URL.createObjectURL(t.blob)])));
    } catch {
      // Previews are a nicety — the page list still works without them.
    } finally {
      setRendering(null);
    }
  }

  function move(index: number, target: number) {
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setResult(null);
  }

  function update(index: number, patch: Partial<PdfPageState>) {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    setResult(null);
  }

  function toggleSelected(originalIndex: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) next.delete(originalIndex);
      else next.add(originalIndex);
      return next;
    });
  }

  function bulk(action: "delete" | "restore" | "rotate") {
    if (selected.size === 0) return;
    setPages((prev) =>
      prev.map((p) => {
        if (!selected.has(p.originalIndex)) return p;
        if (action === "delete") return { ...p, deleted: true };
        if (action === "restore") return { ...p, deleted: false };
        return { ...p, rotation: (p.rotation + 90) % 360 };
      })
    );
    setResult(null);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await rebuildPdf(file, pages));
    } catch (err) {
      setError(explainPdfError(err));
    } finally {
      setBusy(false);
    }
  }

  const keptCount = pages.filter((p) => !p.deleted).length;
  const allSelected = pages.length > 0 && selected.size === pages.length;

  return (
    <ToolLayout title="PDF Page Organizer" description="Reorder, rotate, or delete pages visually, then export a new PDF.">
      <FileDropzone accept="application/pdf" onFiles={(files) => load(files[0])} label={file ? file.name : "Click or drop a PDF here"} />

      {rendering && <p className="text-sm text-muted-foreground">{rendering}</p>}

      {pages.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {keptCount} of {pages.length} page(s) kept · drag a page or focus it and press Alt+←/→ to reorder
            {pages.length > MAX_THUMBNAILS ? ` · previews shown for the first ${MAX_THUMBNAILS} pages` : ""}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(pages.map((p) => p.originalIndex)))}
              />
              Select all
            </label>
            <span className="text-muted-foreground">{selected.size} selected</span>
            <button
              onClick={() => bulk("rotate")}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-medium hover:border-primary/40 disabled:opacity-40"
            >
              <RotateCw className="size-3.5" /> Rotate selected
            </button>
            <button
              onClick={() => bulk("delete")}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-medium hover:border-destructive/40 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" /> Delete selected
            </button>
            <button
              onClick={() => bulk("restore")}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-medium hover:border-primary/40 disabled:opacity-40"
            >
              <Undo2 className="size-3.5" /> Restore selected
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page, i) => {
              const thumbnail = thumbnails.get(page.originalIndex);
              const pageNo = page.originalIndex + 1;
              const isSelected = selected.has(page.originalIndex);
              return (
                <li
                  key={page.originalIndex}
                  tabIndex={0}
                  aria-label={`Page ${pageNo}, position ${i + 1} of ${pages.length}${page.deleted ? ", deleted" : ""}`}
                  onKeyDown={(e) => {
                    if (!e.altKey) return;
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      move(i, i - 1);
                    } else if (e.key === "ArrowRight") {
                      e.preventDefault();
                      move(i, i + 1);
                    }
                  }}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`flex cursor-grab flex-col gap-2 rounded-xl border p-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing ${
                    page.deleted ? "border-destructive/40 bg-destructive/5" : isSelected ? "border-primary" : "border-border"
                  } ${dragIndex === i ? "opacity-50" : ""}`}
                >
                  <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-accent/30">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt={`Page ${pageNo}`}
                        className={`max-h-full max-w-full object-contain transition-transform ${page.deleted ? "opacity-30" : ""}`}
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Page {pageNo}</span>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium">{pageNo}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(page.originalIndex)}
                      aria-label={`Select page ${pageNo}`}
                      className="absolute right-1 top-1 size-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex gap-1">
                      <button
                        aria-label={`Move page ${pageNo} earlier`}
                        onClick={() => move(i, i - 1)}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-primary disabled:opacity-30"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        aria-label={`Move page ${pageNo} later`}
                        onClick={() => move(i, i + 1)}
                        disabled={i === pages.length - 1}
                        className="text-muted-foreground hover:text-primary disabled:opacity-30"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </span>
                    <span className="flex gap-2">
                      <button
                        aria-label={`Rotate page ${pageNo}`}
                        onClick={() => update(i, { rotation: (page.rotation + 90) % 360 })}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <RotateCw className="size-4" />
                      </button>
                      <button
                        aria-label={`${page.deleted ? "Restore" : "Delete"} page ${pageNo}`}
                        onClick={() => update(i, { deleted: !page.deleted })}
                        className={page.deleted ? "text-primary" : "text-muted-foreground hover:text-destructive"}
                      >
                        {page.deleted ? <Undo2 className="size-4" /> : <Trash2 className="size-4" />}
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            onClick={run}
            disabled={busy || keptCount === 0}
            className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Rebuilding…" : `Export ${keptCount} page PDF`}
          </button>
          {keptCount === 0 && <p className="text-sm text-muted-foreground">Keep at least one page to export.</p>}
        </>
      )}

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}
