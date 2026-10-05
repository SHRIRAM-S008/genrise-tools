"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { ImageResult } from "@/components/image-result";
import { CheckCircle2 } from "lucide-react";
import { optimizeToTargetKb, type TargetKbResult } from "@/lib/targetKb";
import type { ImageMime } from "@/lib/types";

const MIN_KB = 5;
const MAX_DIMENSION = 10000;

const FORMAT_OPTIONS: { value: ImageMime; label: string; note?: string }[] = [
  { value: "image/png", label: "PNG", note: "Keeps transparency" },
  { value: "image/webp", label: "WebP", note: "Keeps transparency, smaller files" },
  { value: "image/jpeg", label: "JPEG", note: "No transparency; background is filled white" },
];

function isValidDimension(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n <= MAX_DIMENSION;
}

export default function SignatureOptimizerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(120);
  const [targetKb, setTargetKb] = useState(20);
  const [format, setFormat] = useState<ImageMime>("image/png");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TargetKbResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const widthValid = isValidDimension(width);
  const heightValid = isValidDimension(height);
  const sizeValid = Number.isFinite(targetKb) && targetKb >= MIN_KB;
  const canOptimize = !!file && !busy && widthValid && heightValid && sizeValid;
  const formatNote = FORMAT_OPTIONS.find((f) => f.value === format)?.note;

  async function run() {
    if (!file || !canOptimize) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const output = await optimizeToTargetKb(file, {
        targetKb: Math.floor(targetKb),
        width,
        height,
        mime: format,
      });
      setResult(output);
    } catch {
      setError("Couldn't optimize that signature. Try a different photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolLayout
      title="Signature Optimizer"
      description="Resize a scanned or photographed signature to exact dimensions and file size, keeping transparency."
    >
      <FileDropzone
        accept="image/png,image/jpeg"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
        }}
        label={file ? file.name : "Click or drop your signature image here"}
        hint="PNG with a transparent background works best"
      />

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Width (px)</span>
          <input
            type="number"
            min={1}
            max={MAX_DIMENSION}
            value={Number.isFinite(width) ? width : ""}
            onChange={(e) => setWidth(e.target.value === "" ? Number.NaN : Number(e.target.value))}
            aria-invalid={!widthValid}
            className="w-28 rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Height (px)</span>
          <input
            type="number"
            min={1}
            max={MAX_DIMENSION}
            value={Number.isFinite(height) ? height : ""}
            onChange={(e) => setHeight(e.target.value === "" ? Number.NaN : Number(e.target.value))}
            aria-invalid={!heightValid}
            className="w-28 rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Max size (KB)</span>
          <input
            type="number"
            min={MIN_KB}
            value={Number.isFinite(targetKb) ? targetKb : ""}
            onChange={(e) => setTargetKb(e.target.value === "" ? Number.NaN : Number(e.target.value))}
            aria-invalid={!sizeValid}
            className="w-28 rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Output format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ImageMime)}
            className="rounded-lg border border-border px-3 py-2"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        {!widthValid && <p className="text-destructive">Width must be a whole number from 1 to {MAX_DIMENSION}.</p>}
        {!heightValid && <p className="text-destructive">Height must be a whole number from 1 to {MAX_DIMENSION}.</p>}
        {!sizeValid && <p className="text-destructive">Max size must be at least {MIN_KB} KB.</p>}
        {formatNote && <p className="text-muted-foreground">{formatNote}.</p>}
      </div>

      <button
        onClick={run}
        disabled={!canOptimize}
        className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Optimizing…" : "Optimize signature"}
      </button>

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <ImageResult
          blob={result.blob}
          filename={result.filename}
          originalSize={file?.size}
          dimensions={{ width, height }}
        >
          <p className={`flex items-center gap-1.5 text-sm ${result.achieved ? "text-primary" : "text-amber-600"}`}>
            {result.achieved ? (
              <>
                <CheckCircle2 className="size-4" /> Done — {result.sizeKb} KB, {width}×{height}px
              </>
            ) : (
              `Closest we could get: ${result.sizeKb} KB (target ${Math.floor(targetKb)} KB)`
            )}
          </p>
        </ImageResult>
      )}
    </ToolLayout>
  );
}
