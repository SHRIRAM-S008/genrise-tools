"use client";

import { useState, type KeyboardEvent } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { ImageResult } from "@/components/image-result";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createCollage, type CollageOptions } from "@/lib/imageCollage";
import { canvasToBlob } from "@/lib/imageCore";

const PRESETS = [
  { id: "original", label: "Original", size: null },
  { id: "1:1", label: "Instagram 1:1 (1080×1080)", size: { width: 1080, height: 1080 } },
  { id: "4:5", label: "Instagram 4:5 (1080×1350)", size: { width: 1080, height: 1350 } },
  { id: "9:16", label: "Story 9:16 (1080×1920)", size: { width: 1080, height: 1920 } },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

/** Places the collage centred on a canvas of the preset size, so the output has exact social-media dimensions. */
async function fitToPreset(blob: Blob, width: number, height: number, background: string): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
  bitmap.close();
  return canvasToBlob(canvas, "image/jpeg", 0.92);
}

function fileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

export default function ImageCollagePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [columns, setColumns] = useState(0);
  const [gap, setGap] = useState(8);
  const [background, setBackground] = useState("#ffffff");
  const [fit, setFit] = useState<NonNullable<CollageOptions["fit"]>>("cover");
  const [rounded, setRounded] = useState(0);
  const [preset, setPreset] = useState<PresetId>("original");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string; dimensions?: { width: number; height: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(incoming: File[]) {
    const seen = new Set(files.map(fileKey));
    const accepted: File[] = [];
    const duplicates: string[] = [];
    for (const f of incoming) {
      const key = fileKey(f);
      if (seen.has(key)) duplicates.push(f.name);
      else {
        seen.add(key);
        accepted.push(f);
      }
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    setNotice(
      duplicates.length
        ? `Skipped ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"}: ${duplicates.join(", ")}`
        : null
    );
    setResult(null);
  }

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

  function onItemKey(e: KeyboardEvent<HTMLLIElement>, index: number) {
    if (!e.altKey) return;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(index, -1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      move(index, 1);
    }
  }

  async function run() {
    if (files.length < 2) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const collage = await createCollage(files, { columns, gap, background, fit, rounded });
      const size = PRESETS.find((p) => p.id === preset)?.size ?? null;
      if (size) {
        const blob = await fitToPreset(collage.blob, size.width, size.height, background);
        setResult({ blob, filename: `collage-${size.width}x${size.height}.jpg`, dimensions: size });
      } else {
        setResult(collage);
      }
    } catch (err) {
      setError(`Couldn't create the collage: ${err instanceof Error && err.message ? err.message : "try fewer or smaller images"}.`);
    } finally {
      setBusy(false);
    }
  }

  const autoColumns = Math.ceil(Math.sqrt(files.length || 1));

  return (
    <ToolLayout title="Image Collage Maker" description="Combine images into a grid collage — your layout, your spacing.">
      <FileDropzone
        accept="image/*"
        multiple
        onFiles={addFiles}
        label={files.length ? `${files.length} image(s) selected` : "Click or drop images here"}
        hint="Add at least two images"
      />

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

      {files.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Focus an item and press Alt+↑/↓ (or Alt+←/→) to reorder it.</p>
          <ul className="flex flex-col gap-1 text-sm">
            {files.map((f, i) => (
              <li
                key={fileKey(f)}
                tabIndex={0}
                onKeyDown={(e) => onItemKey(e, i)}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="truncate">
                  {i + 1}. {f.name}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button aria-label={`Move ${f.name} earlier (position ${i + 1} to ${i})`} onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button aria-label={`Move ${f.name} later (position ${i + 1} to ${i + 2})`} onClick={() => move(i, 1)} disabled={i === files.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                    <ChevronRight className="size-4" />
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
        </>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Output size</span>
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value as PresetId);
              setResult(null);
            }}
            className="rounded-lg border border-border px-3 py-2"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Columns</span>
          <select value={columns} onChange={(e) => setColumns(Number(e.target.value))} className="rounded-lg border border-border px-3 py-2">
            <option value={0}>Auto ({autoColumns})</option>
            {[1, 2, 3, 4, 5, 6].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Gap: {gap}px</span>
          <input type="range" min={0} max={60} value={gap} onChange={(e) => setGap(Number(e.target.value))} className="w-36" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Corner radius: {rounded}px</span>
          <input type="range" min={0} max={80} value={rounded} onChange={(e) => setRounded(Number(e.target.value))} className="w-36" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Background</span>
          <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="h-10 w-16 rounded-lg border border-border" />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Fit</span>
          <div className="flex gap-2">
            {(["cover", "contain"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFit(f)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  fit === f ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {f === "cover" ? "Fill cell" : "Fit whole image"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={run}
          disabled={files.length < 2 || busy}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Collage"}
        </button>
        {files.length > 0 && (
          <button
            onClick={() => {
              setFiles([]);
              setNotice(null);
              setResult(null);
            }}
            className="w-fit rounded-full border border-border px-6 py-3 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && <ImageResult blob={result.blob} filename={result.filename} dimensions={result.dimensions} />}
    </ToolLayout>
  );
}
