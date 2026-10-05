"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { imagesToPdf, type PdfPageSize } from "@/lib/imageToPdf";
import { formatBytes } from "@/lib/imageCore";

const PAGE_SIZES: { id: PdfPageSize; label: string }[] = [
  { id: "A4", label: "A4" },
  { id: "Letter", label: "Letter" },
  { id: "image", label: "Fit to image" },
];

function reasonOf(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "the file could not be decoded";
}

/**
 * imagesToPdf is all-or-nothing, so on failure retry each file on its own to
 * name the one that breaks the build instead of reporting a generic error.
 */
async function explainFailure(
  files: File[],
  pageSize: PdfPageSize,
  marginMm: number,
  err: unknown
): Promise<string> {
  for (const file of files) {
    try {
      await imagesToPdf([file], { pageSize, marginMm });
    } catch (fileErr) {
      return `Couldn't add ${file.name}: ${reasonOf(fileErr)}. Remove it and try again.`;
    }
  }
  return `Couldn't build the PDF: ${reasonOf(err)}.`;
}

export default function ImageToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PdfPageSize>("A4");
  const [marginMm, setMarginMm] = useState(10);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function move(index: number, direction: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }

  async function run() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const output = await imagesToPdf(files, { pageSize, marginMm });
      setResult(output);
    } catch (err) {
      setError(await explainFailure(files, pageSize, marginMm, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolLayout title="Image to PDF" description="Combine images into a single PDF, in the order you choose.">
      <FileDropzone
        accept="image/*"
        multiple
        onFiles={(newFiles) => {
          setFiles((prev) => [...prev, ...newFiles]);
          setResult(null);
        }}
        label={files.length ? `${files.length} image(s) selected` : "Click or drop images here"}
        hint="JPG, PNG, WebP, GIF or BMP — add as many as you like"
      />

      {files.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span className="truncate">
                {i + 1}. {f.name} <span className="text-muted-foreground">({formatBytes(f.size)})</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <button aria-label={`Move ${f.name} up`} onClick={() => move(i, -1)} className="text-muted-foreground hover:text-primary">
                  <ChevronUp className="size-4" />
                </button>
                <button aria-label={`Move ${f.name} down`} onClick={() => move(i, 1)} className="text-muted-foreground hover:text-primary">
                  <ChevronDown className="size-4" />
                </button>
                <button
                  aria-label={`Remove ${f.name}`}
                  onClick={() => {
                    setFiles((prev) => prev.filter((_, j) => j !== i));
                    setResult(null);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Page size</span>
          <div className="flex gap-2">
            {PAGE_SIZES.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPageSize(p.id);
                  setResult(null);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  pageSize === p.id ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {pageSize !== "image" && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Margin (mm)</span>
            <input
              type="number"
              min={0}
              max={50}
              value={marginMm}
              onChange={(e) => {
                setMarginMm(Math.max(0, Number(e.target.value)));
                setResult(null);
              }}
              className="w-24 rounded-lg border border-border px-3 py-2"
            />
          </label>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={run}
          disabled={files.length === 0 || busy}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Building PDF…" : "Create PDF"}
        </button>
        {files.length > 0 && (
          <button
            onClick={() => {
              setFiles([]);
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
        <div className="rounded-2xl border border-border p-5">
          <p className="mb-3 text-sm text-muted-foreground">
            {files.length} page(s) · {formatBytes(result.blob.size)}
          </p>
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}
