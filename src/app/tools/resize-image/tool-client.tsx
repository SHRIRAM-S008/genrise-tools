"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { ImageResult } from "@/components/image-result";
import { BatchResults, type BatchOutput } from "@/components/batch-results";
import { resizeImage } from "@/lib/resizeImage";
import { loadImage } from "@/lib/imageCore";
import { runBatch, toBatchItems, type BatchItem } from "@/lib/batch";
import type { ImageMime } from "@/lib/types";

type Mode = "pixels" | "percentage";
type FormatChoice = "auto" | ImageMime;

const PERCENT_PRESETS = [75, 50, 25];
const SIZE_PRESETS = [512, 1080, 1920];

const FORMAT_OPTIONS: { value: FormatChoice; label: string }[] = [
  { value: "auto", label: "Same as input" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

export default function ResizeImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<BatchItem<BatchOutput>[]>([]);
  const [source, setSource] = useState<{ width: number; height: number } | null>(null);
  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [percentage, setPercentage] = useState(50);
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState<FormatChoice>("auto");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBatch = extraFiles.length > 1;
  const mime = format === "auto" ? undefined : format;
  const lossy = format === "image/jpeg" || format === "image/webp" || (format === "auto" && file?.type !== "image/png");
  const qualityArg = lossy ? quality / 100 : undefined;

  async function pick(files: File[]) {
    const [selected, ...rest] = files;
    setFile(selected);
    setExtraFiles(rest.length ? toBatchItems<BatchOutput>(files, 0) : []);
    setResult(null);
    setError(null);
    try {
      const { bitmap, width: w, height: h } = await loadImage(selected);
      bitmap.close();
      setSource({ width: w, height: h });
      if (rest.length) {
        // Batch uses a fit-within box, so start with an empty box rather than the first image's size.
        setWidth("");
        setHeight("");
      } else {
        setWidth(w);
        setHeight(h);
      }
    } catch {
      setSource(null);
      setError("Couldn't read that image. Try a different file.");
    }
  }

  function changeWidth(value: number | "") {
    setWidth(value);
    if (lockAspect && source && value !== "") {
      setHeight(Math.round(value * (source.height / source.width)));
    }
  }

  function changeHeight(value: number | "") {
    setHeight(value);
    if (lockAspect && source && value !== "") {
      setWidth(Math.round(value * (source.width / source.height)));
    }
  }

  /** Applies a preset: the longest side for a single image, or a square fit-box in batch mode. */
  function applyPreset(size: number) {
    setMode("pixels");
    if (isBatch) {
      setWidth(size);
      setHeight(size);
      return;
    }
    if (!source) return;
    const scale = size / Math.max(source.width, source.height);
    setWidth(Math.max(1, Math.round(source.width * scale)));
    setHeight(Math.max(1, Math.round(source.height * scale)));
  }

  function resetToOriginal() {
    if (!source) return;
    setMode("pixels");
    setWidth(source.width);
    setHeight(source.height);
    setPercentage(100);
    setResult(null);
  }

  const boxW = typeof width === "number" ? width : undefined;
  const boxH = typeof height === "number" ? height : undefined;
  const batchReady = !!boxW || !!boxH;

  /** Shrinks an image to fit inside the box while keeping its aspect ratio. Never enlarges. */
  async function fitWithin(f: File) {
    const { bitmap, width: w, height: h } = await loadImage(f);
    bitmap.close();
    const scale = Math.min(1, boxW ? boxW / w : Infinity, boxH ? boxH / h : Infinity);
    return resizeImage(f, { percentage: scale * 100, mime, quality: qualityArg });
  }

  function singleOptions() {
    return mode === "percentage"
      ? { percentage, mime, quality: qualityArg }
      : {
          width: width === "" ? undefined : width,
          height: height === "" ? undefined : height,
          maintainAspectRatio: lockAspect,
          mime,
          quality: qualityArg,
        };
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);

    // Fixed pixel dimensions on a mixed batch would distort every image that
    // isn't the first one, so batches are fitted inside a box instead.
    if (isBatch) {
      const queued = extraFiles.map((item) => ({ ...item, status: "queued" as const, result: undefined, error: undefined }));
      setExtraFiles(queued);
      await runBatch(queued, fitWithin, (updated) =>
        setExtraFiles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      );
      setBusy(false);
      return;
    }

    try {
      const output = await resizeImage(file, singleOptions());
      setResult(output);
    } catch {
      setError("Couldn't resize that image. Try a different file.");
    } finally {
      setBusy(false);
    }
  }

  const canRun = !!file && !busy && (!isBatch || batchReady);

  return (
    <ToolLayout title="Resize Image" description="Resize by pixel dimensions or percentage, with an optional aspect-ratio lock.">
      <FileDropzone
        accept="image/jpeg,image/png,image/webp"
        multiple
        onFiles={pick}
        label={isBatch ? `${extraFiles.length} images selected` : file ? file.name : "Click or drop images here"}
        hint="JPG, PNG, or WebP — drop several to resize them all to fit a box"
      />

      {source && !isBatch && (
        <p className="text-sm text-muted-foreground">
          Original: {source.width} × {source.height}px
        </p>
      )}

      {isBatch && (
        <p className="text-sm text-muted-foreground">
          Batch mode: each image is shrunk to fit inside the box below (aspect ratio kept, never enlarged).
        </p>
      )}

      {!isBatch && (
        <div className="flex gap-2">
          {(["pixels", "percentage"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "border border-border"
              }`}
            >
              {m === "pixels" ? "By pixels" : "By percentage"}
            </button>
          ))}
        </div>
      )}

      {(isBatch || mode === "pixels") && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{isBatch ? "Fit box width (px)" : "Width (px)"}</span>
              <input
                type="number"
                min={1}
                value={width}
                onChange={(e) => changeWidth(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-28 rounded-lg border border-border px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{isBatch ? "Fit box height (px)" : "Height (px)"}</span>
              <input
                type="number"
                min={1}
                value={height}
                onChange={(e) => changeHeight(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-28 rounded-lg border border-border px-3 py-2"
              />
            </label>
            {!isBatch && (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
                Lock aspect ratio
              </label>
            )}
            {!isBatch && source && (
              <button
                type="button"
                onClick={resetToOriginal}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
              >
                Reset to original
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{isBatch ? "Fit a square box:" : "Longest side:"}</span>
            {SIZE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                disabled={!isBatch && !source}
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/40 disabled:opacity-40"
              >
                {p}px
              </button>
            ))}
          </div>
        </div>
      )}

      {!isBatch && mode === "percentage" && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-1 items-center gap-3 text-sm">
            <span className="whitespace-nowrap font-medium">Scale: {percentage}%</span>
            <input
              type="range"
              min={5}
              max={200}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          {PERCENT_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPercentage(p)}
              className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/40"
            >
              {p}%
            </button>
          ))}
          {source && (
            <span className="text-sm text-muted-foreground">
              → {Math.round(source.width * (percentage / 100))} × {Math.round(source.height * (percentage / 100))}px
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
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
        {lossy && (
          <label className="flex w-48 flex-col gap-2">
            <span className="text-sm font-medium">Quality: {quality}%</span>
            <input
              type="range"
              min={50}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
          </label>
        )}
        {format === "image/png" && <span className="pb-2 text-sm text-muted-foreground">PNG is lossless; quality doesn&apos;t apply.</span>}
      </div>

      <button
        onClick={run}
        disabled={!canRun}
        className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Resizing…" : isBatch ? `Resize ${extraFiles.length} images` : "Resize"}
      </button>

      {isBatch && !batchReady && (
        <p className="text-sm text-muted-foreground">Enter a width or height for the fit box to resize the batch.</p>
      )}

      {error && <p className="text-destructive">{error}</p>}

      {isBatch && (
        <BatchResults
          items={extraFiles}
          zipName="resized-images.zip"
          onRemove={(id) => setExtraFiles((prev) => prev.filter((i) => i.id !== id))}
        />
      )}

      {result && !isBatch && (
        <ImageResult
          blob={result.blob}
          filename={result.filename}
          originalSize={file?.size}
          dimensions={{ width: result.width, height: result.height }}
        />
      )}
    </ToolLayout>
  );
}
