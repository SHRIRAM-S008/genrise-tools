"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { renderPdfToImages, type PdfToImageResult } from "@/lib/pdfToImage";
import { extractPages, getPdfPageCount, parsePageRange } from "@/lib/splitPdf";
import { formatBytes } from "@/lib/imageCore";

const FORMATS = [
  { id: "image/png" as const, label: "PNG", hint: "lossless, bigger files" },
  { id: "image/jpeg" as const, label: "JPG", hint: "smaller, good for scans" },
];

const RESOLUTIONS = [
  { dpi: 96, label: "Screen (96 DPI)" },
  { dpi: 150, label: "Balanced (150 DPI)" },
  { dpi: 300, label: "Print (300 DPI)" },
];

const MIN_DPI = 72;
const MAX_DPI = 600;

/** pdf.js tags its failures with a name; use it to say why the PDF could not be read. */
function explainPdfError(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : "";
  if (name === "PasswordException") return "This PDF is password protected. Unlock it first, then try again.";
  if (name === "InvalidPDFException" || name === "MissingPDFException")
    return "This file doesn't look like a valid PDF. It may be corrupt.";
  return `Conversion failed${message ? ` (${message})` : ""}.`;
}

export default function PdfToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<(typeof FORMATS)[number]["id"]>("image/png");
  const [dpi, setDpi] = useState(150);
  const [customDpi, setCustomDpi] = useState("");
  const [quality, setQuality] = useState(92);
  const [pageRange, setPageRange] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<PdfToImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customValue = Number(customDpi);
  const customValid = customDpi.trim() !== "" && Number.isFinite(customValue) && customValue >= MIN_DPI && customValue <= MAX_DPI;
  const effectiveDpi = customDpi.trim() !== "" ? (customValid ? customValue : null) : dpi;

  async function run() {
    if (!file || effectiveDpi === null) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let source = file;
      if (pageRange.trim()) {
        const total = await getPdfPageCount(file);
        const indices = parsePageRange(pageRange, total);
        if (indices.length === 0) {
          setError(`No pages match "${pageRange}". This PDF has ${total} page(s).`);
          return;
        }
        // Cut the selected pages into a temporary PDF first so only they get rendered.
        const subset = await extractPages(file, indices);
        source = new File([subset.blob], file.name, { type: "application/pdf" });
      }

      const output = await renderPdfToImages(source, {
        format,
        dpi: effectiveDpi,
        quality: format === "image/jpeg" ? quality / 100 : undefined,
        onProgress: (page, total) => setProgress(`Rendering page ${page} of ${total}…`),
      });
      setResult(output);
    } catch (err) {
      setError(explainPdfError(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <ToolLayout title="PDF to Image" description="Convert each PDF page into a downloadable image.">
      <FileDropzone
        accept="application/pdf"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
          setError(null);
        }}
        label={file ? file.name : "Click or drop a PDF here"}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Format</span>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFormat(f.id);
                  setResult(null);
                }}
                title={f.hint}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  format === f.id ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Resolution</span>
          <select
            value={dpi}
            disabled={customDpi.trim() !== ""}
            onChange={(e) => {
              setDpi(Number(e.target.value));
              setResult(null);
            }}
            className="rounded-lg border border-border px-3 py-2 disabled:opacity-50"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.dpi} value={r.dpi}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Custom DPI</span>
          <input
            type="number"
            min={MIN_DPI}
            max={MAX_DPI}
            value={customDpi}
            placeholder={`${MIN_DPI}–${MAX_DPI}`}
            aria-invalid={customDpi.trim() !== "" && !customValid}
            onChange={(e) => {
              setCustomDpi(e.target.value);
              setResult(null);
            }}
            className="w-28 rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Pages (optional)</span>
          <input
            value={pageRange}
            placeholder="e.g. 1-3, 5"
            onChange={(e) => {
              setPageRange(e.target.value);
              setResult(null);
            }}
            className="w-40 rounded-lg border border-border px-3 py-2"
          />
        </label>

        {format === "image/jpeg" && (
          <label className="flex min-w-48 flex-col gap-2">
            <span className="text-sm font-medium">JPG quality: {quality}%</span>
            <input type="range" min={50} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
          </label>
        )}
      </div>

      {customDpi.trim() !== "" && !customValid && (
        <p className="text-sm text-destructive">Enter a DPI between {MIN_DPI} and {MAX_DPI}.</p>
      )}

      {file && (
        <button
          onClick={run}
          disabled={busy || effectiveDpi === null}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? progress ?? "Converting…" : "Convert to Images"}
        </button>
      )}

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          <p className="mb-3 text-sm text-muted-foreground">
            {result.zipped
              ? `${result.pageCount} pages exported as a ZIP · ${formatBytes(result.blob.size)}`
              : `Single page exported · ${formatBytes(result.blob.size)}`}
          </p>
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}
