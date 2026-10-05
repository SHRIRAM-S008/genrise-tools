"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { parsePageRange, extractPages, getPdfPageCount, splitIntoSinglePages } from "@/lib/splitPdf";
import { createZip } from "@/lib/zipCreator";

type Mode = "range" | "single-pages" | "every-n";

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<Mode>("range");
  const [range, setRange] = useState("");
  const [everyN, setEveryN] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(selected: File) {
    setFile(selected);
    setResult(null);
    setError(null);
    setPageCount(0);
    try {
      setPageCount(await getPdfPageCount(selected));
    } catch {
      setError("Couldn't read this PDF. Make sure it isn't password protected.");
    }
  }

  const trimmedRange = range.trim();
  const selectedPages = useMemo(
    () => (mode === "range" && trimmedRange ? parsePageRange(trimmedRange, pageCount) : []),
    [mode, trimmedRange, pageCount]
  );
  const selectedCount = mode === "single-pages" || mode === "every-n" ? pageCount : selectedPages.length;

  const rangeError =
    mode === "range" && trimmedRange && selectedPages.length === 0
      ? `No valid pages in "${trimmedRange}". Use numbers 1–${pageCount}, e.g. 1-3,5.`
      : null;
  const everyNValid = Number.isInteger(everyN) && everyN >= 1 && everyN <= pageCount;
  const everyNError =
    mode === "every-n" && pageCount > 0 && !everyNValid ? `Enter a whole number from 1 to ${pageCount}.` : null;

  const canRun =
    !!file &&
    !busy &&
    pageCount > 0 &&
    (mode === "single-pages" ||
      (mode === "range" && selectedPages.length > 0) ||
      (mode === "every-n" && everyNValid));

  async function run() {
    if (!file || !canRun) return;
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      let output: { blob: Blob; filename: string };
      if (mode === "single-pages") {
        output = await splitIntoSinglePages(file);
      } else if (mode === "every-n") {
        output = await splitEveryN(file, pageCount, everyN);
      } else {
        output = await extractPages(file, selectedPages);
      }
      setResult(output);
    } catch {
      setError("Couldn't split this PDF. Make sure it isn't password protected.");
    } finally {
      setBusy(false);
    }
  }

  const modes: { value: Mode; label: string }[] = [
    { value: "range", label: "Extract a page range" },
    { value: "every-n", label: "Every N pages (ZIP)" },
    { value: "single-pages", label: "One file per page (ZIP)" },
  ];

  return (
    <ToolLayout title="Split PDF" description="Extract specific pages or split a PDF into separate files.">
      <FileDropzone
        accept="application/pdf"
        onFiles={(files) => pick(files[0])}
        label={file ? file.name : "Click or drop a PDF here"}
      />

      {pageCount > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{pageCount} page(s)</p>

          <div className="flex flex-wrap gap-2">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setMode(m.value);
                  setResult(null);
                }}
                aria-pressed={mode === m.value}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === m.value ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "range" && (
            <label className="flex flex-col gap-1 text-sm">
              Pages to extract
              <input
                value={range}
                onChange={(e) => {
                  setRange(e.target.value);
                  setResult(null);
                }}
                placeholder="e.g. 1-3,5"
                aria-invalid={!!rangeError}
                className="rounded-lg border border-border px-3 py-2 font-mono"
              />
              <span className={`text-xs ${rangeError ? "text-destructive" : "text-muted-foreground"}`}>
                {rangeError ?? (trimmedRange ? `${selectedCount} page(s) selected` : `Use commas and ranges, e.g. 1-3,5 (pages 1 to ${pageCount})`)}
              </span>
            </label>
          )}

          {mode === "every-n" && (
            <label className="flex flex-col gap-1 text-sm">
              Pages per file
              <input
                type="number"
                min={1}
                max={pageCount}
                value={Number.isFinite(everyN) ? everyN : ""}
                onChange={(e) => {
                  setEveryN(e.target.value === "" ? Number.NaN : Number(e.target.value));
                  setResult(null);
                }}
                aria-invalid={!!everyNError}
                className="w-32 rounded-lg border border-border px-3 py-2"
              />
              <span className={`text-xs ${everyNError ? "text-destructive" : "text-muted-foreground"}`}>
                {everyNError ??
                  `${Math.ceil(pageCount / everyN)} file(s) of up to ${everyN} page(s) each, bundled into a ZIP`}
              </span>
            </label>
          )}
        </>
      )}

      {file && (
        <button
          onClick={run}
          disabled={!canRun}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy
            ? "Splitting…"
            : mode === "single-pages"
              ? "Split into single pages"
              : mode === "every-n"
                ? "Split every N pages"
                : "Extract Pages"}
        </button>
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

/** Splits into consecutive chunks of `n` pages, one PDF per chunk, bundled into a ZIP. */
async function splitEveryN(file: File, pageCount: number, n: number): Promise<{ blob: Blob; filename: string }> {
  const base = file.name.replace(/\.pdf$/i, "");
  const chunks: File[] = [];
  for (let start = 0; start < pageCount; start += n) {
    const end = Math.min(start + n, pageCount);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const part = await extractPages(file, indices);
    const name = `${base}-pages-${start + 1}-${end}.pdf`;
    chunks.push(new File([part.blob], name, { type: "application/pdf" }));
  }
  return createZip(chunks, `${base}-split.zip`);
}
