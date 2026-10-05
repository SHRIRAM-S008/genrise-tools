"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { ImageResult } from "@/components/image-result";
import { buildPrintSheet } from "@/lib/printSheet";
import { paperSizesMm, type PaperSizeId } from "@/lib/photoSizes";

/** Mirrors the grid maths in lib/printSheet so the preview shows the same layout the export produces. */
function gridFor(paper: PaperSizeId, photoW: number, photoH: number, margin: number, gap: number) {
  const sheet = paperSizesMm[paper];
  const cols = Math.floor((sheet.widthMm - 2 * margin + gap) / (photoW + gap));
  const rows = Math.floor((sheet.heightMm - 2 * margin + gap) / (photoH + gap));
  return { sheet, cols, rows, copies: Math.max(0, cols) * Math.max(0, rows) };
}

function num(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function PrintSheetPage() {
  const [file, setFile] = useState<File | null>(null);
  const [paper, setPaper] = useState<PaperSizeId>("A4");
  const [photoW, setPhotoW] = useState("35");
  const [photoH, setPhotoH] = useState("45");
  const [margin, setMargin] = useState("5");
  const [gap, setGap] = useState("3");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string; copies: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const w = num(photoW);
  const h = num(photoH);
  const m = num(margin);
  const g = num(gap);

  const problems: string[] = [];
  if (w === null || w <= 0) problems.push("Photo width must be greater than 0 mm.");
  if (h === null || h <= 0) problems.push("Photo height must be greater than 0 mm.");
  if (m === null || m < 0) problems.push("Margin must be 0 mm or more.");
  if (g === null || g < 0) problems.push("Gap must be 0 mm or more.");

  const layout =
    w !== null && h !== null && m !== null && g !== null && w > 0 && h > 0 && m >= 0 && g >= 0
      ? gridFor(paper, w, h, m, g)
      : null;

  if (layout && problems.length === 0) {
    if (layout.cols < 1 || layout.rows < 1) {
      problems.push(
        `This photo size doesn't fit on ${paper} with a ${m} mm margin. Reduce the photo size or the margin.`
      );
    }
  }

  const canRun = !!file && !busy && problems.length === 0;

  async function run() {
    if (!file || problems.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const output = await buildPrintSheet(file, {
        paper,
        photoWidthMm: w!,
        photoHeightMm: h!,
        marginMm: m!,
        gapMm: g!,
      });
      setResult(output);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't build a print sheet from that image."
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-24 rounded-lg border border-border px-3 py-2";

  return (
    <ToolLayout
      title="Print Sheet Maker"
      description="Arrange repeated copies of a photo on one printable page — perfect for passport photos, labels, or stickers."
    >
      <FileDropzone
        accept="image/jpeg,image/png"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
        }}
        label={file ? file.name : "Click or drop a photo here"}
      />

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Paper</span>
          <select
            value={paper}
            onChange={(e) => {
              setPaper(e.target.value as PaperSizeId);
              setResult(null);
            }}
            className="rounded-lg border border-border px-3 py-2"
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </label>
        {(
          [
            ["Photo width (mm)", photoW, setPhotoW],
            ["Photo height (mm)", photoH, setPhotoH],
            ["Margin (mm)", margin, setMargin],
            ["Gap (mm)", gap, setGap],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="flex flex-col gap-2">
            <span className="text-sm font-medium">{label}</span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={value}
              aria-invalid={problems.length > 0 && num(value) === null}
              onChange={(e) => {
                set(e.target.value);
                setResult(null);
              }}
              className={inputClass}
            />
          </label>
        ))}
      </div>

      {layout && layout.cols >= 1 && layout.rows >= 1 && (
        <div className="flex flex-wrap items-start gap-6">
          <svg
            viewBox={`0 0 ${layout.sheet.widthMm} ${layout.sheet.heightMm}`}
            role="img"
            aria-label={`Layout preview: ${layout.copies} copies on ${paper}`}
            className="h-64 w-auto rounded border border-border bg-background"
          >
            <rect x={0} y={0} width={layout.sheet.widthMm} height={layout.sheet.heightMm} fill="#ffffff" />
            {Array.from({ length: layout.rows }).flatMap((_, r) =>
              Array.from({ length: layout.cols }).map((_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={(m ?? 0) + c * ((w ?? 0) + (g ?? 0))}
                  y={(m ?? 0) + r * ((h ?? 0) + (g ?? 0))}
                  width={w ?? 0}
                  height={h ?? 0}
                  fill="var(--color-accent, #e5e5e5)"
                  stroke="#9ca3af"
                  strokeWidth={0.5}
                />
              ))
            )}
          </svg>
          <p className="text-sm text-muted-foreground">
            <span className="block text-base font-semibold text-foreground">
              {layout.copies} copies fit
            </span>
            {layout.cols} × {layout.rows} grid on {paper} ({layout.sheet.widthMm} × {layout.sheet.heightMm} mm)
          </p>
        </div>
      )}

      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <button
        onClick={run}
        disabled={!canRun}
        className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Building…" : "Generate Sheet"}
      </button>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <ImageResult
          blob={result.blob}
          filename={result.filename}
          note={`${result.copies} copies on one ${paper} sheet`}
        />
      )}
    </ToolLayout>
  );
}
