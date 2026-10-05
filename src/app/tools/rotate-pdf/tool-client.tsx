"use client";

import { useMemo, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { getPdfPageCount, parsePageRange } from "@/lib/splitPdf";

const ANGLES = [90, 180, 270] as const;

/** Rotates only the given zero-based page indices, leaving the rest untouched. */
async function rotatePages(file: File, indices: number[], angle: (typeof ANGLES)[number]) {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  for (const index of indices) {
    const page = pages[index];
    if (!page) continue;
    page.setRotation(degrees(page.getRotation().angle + angle));
  }
  const pdfBytes = await doc.save();
  return {
    blob: new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
    filename: file.name.replace(/\.pdf$/i, "-rotated.pdf"),
  };
}

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmedRange = range.trim();
  const selected = useMemo(
    () => (trimmedRange ? parsePageRange(trimmedRange, pageCount) : pageCount ? Array.from({ length: pageCount }, (_, i) => i) : []),
    [trimmedRange, pageCount]
  );
  const rangeInvalid = trimmedRange !== "" && selected.length === 0;

  async function pick(selectedFile: File) {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setPageCount(0);
    try {
      setPageCount(await getPdfPageCount(selectedFile));
    } catch {
      setError("Couldn't read this PDF. Make sure it isn't password protected.");
    }
  }

  async function run(angle: (typeof ANGLES)[number]) {
    if (!file || selected.length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const output = await rotatePages(file, selected, angle);
      setResult(output);
    } catch {
      setError("Couldn't rotate this PDF. Make sure it isn't password protected.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolLayout title="Rotate PDF Pages" description="Rotate all or selected pages of a PDF by 90-degree increments.">
      <FileDropzone
        accept="application/pdf"
        onFiles={(files) => pick(files[0])}
        label={file ? file.name : "Click or drop a PDF here"}
      />

      {pageCount > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{pageCount} page(s) in this PDF</p>

          <label className="flex flex-col gap-1 text-sm">
            Pages to rotate
            <input
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setResult(null);
              }}
              placeholder="All pages"
              aria-invalid={rangeInvalid}
              className="w-64 rounded-lg border border-border px-3 py-2 font-mono"
            />
            <span className={`text-xs ${rangeInvalid ? "text-destructive" : "text-muted-foreground"}`}>
              {rangeInvalid
                ? `No valid pages in "${trimmedRange}". Use numbers 1–${pageCount}, e.g. 1-3,5.`
                : `${selected.length} page(s) will be rotated. Leave empty to rotate all pages.`}
            </span>
          </label>
        </>
      )}

      {file && (
        <div className="flex flex-wrap gap-2">
          {ANGLES.map((angle) => (
            <button
              key={angle}
              onClick={() => run(angle)}
              disabled={busy || pageCount === 0 || rangeInvalid}
              className="rounded-full border border-border px-6 py-3 font-medium hover:border-primary/40 disabled:opacity-50"
            >
              Rotate {angle}°
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}
