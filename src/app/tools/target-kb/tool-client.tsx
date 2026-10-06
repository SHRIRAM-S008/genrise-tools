"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { ImageResult } from "@/components/image-result";
import { CheckCircle2 } from "lucide-react";
import { optimizeToTargetKb, type TargetKbResult } from "@/lib/targetKb";
import type { ImageMime } from "@/lib/types";

const MIN_KB = 5;
const PRESETS_KB = [20, 50, 100, 200] as const;

type FormatChoice = "auto" | ImageMime;

const FORMAT_OPTIONS: { value: FormatChoice; label: string }[] = [
  { value: "auto", label: "Same as input" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

function formatParam(value: string | null): FormatChoice {
  if (value === "jpg" || value === "jpeg") return "image/jpeg";
  if (value === "png") return "image/png";
  if (value === "webp") return "image/webp";
  return "auto";
}

function positiveInt(value: string | null): number | "" {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n > 0 ? n : "";
}

export function TargetKbTool({
  defaultKb,
  title = "UploadReady",
  description = "Tell us the exact size you need. We'll compress your photo to fit — no sliders required.",
}: {
  defaultKb?: number;
  title?: string;
  description?: string;
}) {
  const params = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [targetKb, setTargetKb] = useState<number>(() => positiveInt(params.get("kb")) || defaultKb || 50);
  const [format, setFormat] = useState<FormatChoice>(() => formatParam(params.get("format")));
  const [width, setWidth] = useState<number | "">(() => positiveInt(params.get("w")));
  const [height, setHeight] = useState<number | "">(() => positiveInt(params.get("h")));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TargetKbResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetIsNumber = Number.isFinite(targetKb);
  const effectiveKb = targetIsNumber ? Math.max(MIN_KB, Math.floor(targetKb)) : MIN_KB;
  const belowMin = targetIsNumber && targetKb < MIN_KB;
  const dimensionsValid =
    (width === "" || (Number.isFinite(width) && width > 0)) && (height === "" || (Number.isFinite(height) && height > 0));

  async function run() {
    if (!file || busy || !dimensionsValid) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const output = await optimizeToTargetKb(file, {
        targetKb: effectiveKb,
        mime: format === "auto" ? undefined : format,
        width: width === "" ? undefined : width,
        height: height === "" ? undefined : height,
      });
      setResult(output);
    } catch {
      setError("Couldn't hit that target. Try a larger size or a different photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolLayout title={title} description={description}>
      <FileDropzone
        accept="image/jpeg,image/png,image/webp"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
        }}
        label={file ? file.name : "Click or drop a photo here"}
        hint="JPG, PNG, or WebP"
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Common portal limits</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS_KB.map((kb) => (
            <button
              key={kb}
              type="button"
              aria-pressed={effectiveKb === kb}
              onClick={() => setTargetKb(kb)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                effectiveKb === kb ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40"
              }`}
            >
              {kb} KB
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Maximum size (KB)</span>
          <input
            type="number"
            min={MIN_KB}
            value={Number.isFinite(targetKb) ? targetKb : ""}
            onChange={(e) => setTargetKb(e.target.value === "" ? Number.NaN : Number(e.target.value))}
            aria-invalid={belowMin || !targetIsNumber}
            className="w-28 rounded-lg border border-border px-3 py-2"
          />
          {(belowMin || !targetIsNumber) && (
            <span className="text-xs text-amber-600">Minimum is {MIN_KB} KB; {effectiveKb} KB will be used.</span>
          )}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Output format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as FormatChoice)}
            className="rounded-lg border border-border px-3 py-2"
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Width (px, optional)</span>
          <input
            type="number"
            min={1}
            value={width}
            onChange={(e) => setWidth(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-28 rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Height (px, optional)</span>
          <input
            type="number"
            min={1}
            value={height}
            onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-28 rounded-lg border border-border px-3 py-2"
          />
        </label>
      </div>
      {!dimensionsValid && <p className="text-sm text-destructive">Width and height must be positive numbers.</p>}

      <button
        onClick={run}
        disabled={!file || busy || !dimensionsValid}
        className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Optimizing…" : "Make it ready"}
      </button>

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <ImageResult blob={result.blob} filename={result.filename} originalSize={file?.size}>
          <p className={`flex items-center gap-1.5 text-sm ${result.achieved ? "text-primary" : "text-amber-600"}`}>
            {result.achieved ? (
              <>
                <CheckCircle2 className="size-4" /> Done — {result.sizeKb} KB (target {effectiveKb} KB)
              </>
            ) : (
              `Closest we could get: ${result.sizeKb} KB (target ${effectiveKb} KB)`
            )}
          </p>
        </ImageResult>
      )}
    </ToolLayout>
  );
}

export default function TargetKbPage() {
  return (
    <Suspense fallback={null}>
      <TargetKbTool />
    </Suspense>
  );
}
