"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { generatePassportPhoto } from "@/lib/passportPhoto";
import { photoSizes } from "@/lib/photoSizes";
import { canvasToBlob } from "@/lib/imageCore";
import { useObjectUrl } from "@/lib/useObjectUrl";

/** Re-encodes the JPEG at lower quality until it fits the byte budget. Returns the best attempt and whether it fit. */
async function shrinkToTarget(blob: Blob, targetBytes: number): Promise<{ blob: Blob; fits: boolean }> {
  if (blob.size <= targetBytes) return { blob, fits: true };
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  let lo = 0.1;
  let hi = 0.95;
  let best: Blob | null = null;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const candidate = await canvasToBlob(canvas, "image/jpeg", mid);
    if (candidate.size <= targetBytes) {
      best = candidate;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (best) return { blob: best, fits: true };
  // Even the lowest quality is too large; return it so the user can see how close it gets.
  return { blob: await canvasToBlob(canvas, "image/jpeg", 0.1), fits: false };
}

function positive(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

export function PassportPhotoTool({
  defaultSize,
  defaultKb,
  defaultWmm,
  defaultHmm,
  title = "Passport Photo Maker",
  description = "Crop and resize a photo to an exact passport, visa, or ID-card size.",
}: {
  defaultSize?: string;
  defaultKb?: string;
  defaultWmm?: string;
  defaultHmm?: string;
  title?: string;
  description?: string;
}) {
  const params = useSearchParams();
  const sizeParam = params.get("size") ?? defaultSize;
  const [file, setFile] = useState<File | null>(null);
  const [sizeId, setSizeId] = useState(() =>
    photoSizes.some((s) => s.id === sizeParam) ? sizeParam! : photoSizes[1].id
  );
  const [customW, setCustomW] = useState(() => params.get("wmm") ?? defaultWmm ?? "35");
  const [customH, setCustomH] = useState(() => params.get("hmm") ?? defaultHmm ?? "45");
  const [targetKb, setTargetKb] = useState(() => params.get("kb") ?? defaultKb ?? "");
  const [background, setBackground] = useState(() => {
    const bg = params.get("bg");
    return bg && /^#?[0-9a-fA-F]{6}$/.test(bg) ? `#${bg.replace(/^#/, "")}` : "#ffffff";
  });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    filename: string;
    widthPx: number;
    heightPx: number;
    fitsTarget: boolean | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useObjectUrl(result?.blob);
  const sourceUrl = useObjectUrl(file);

  const selectedSize = photoSizes.find((s) => s.id === sizeId) ?? photoSizes[1];
  const customWmm = positive(customW);
  const customHmm = positive(customH);
  const widthMm = sizeId === "custom" ? customWmm : selectedSize.widthMm;
  const heightMm = sizeId === "custom" ? customHmm : selectedSize.heightMm;
  const targetKbNum = targetKb.trim() === "" ? null : positive(targetKb);
  const sizeInvalid = widthMm === null || heightMm === null;
  const targetInvalid = targetKb.trim() !== "" && targetKbNum === null;

  async function run() {
    if (!file || widthMm === null || heightMm === null || targetInvalid) return;
    setBusy(true);
    setError(null);
    try {
      const output = await generatePassportPhoto(file, { widthMm, heightMm, background, zoom });
      let blob = output.blob;
      let fitsTarget: boolean | null = null;
      if (targetKbNum !== null) {
        const shrunk = await shrinkToTarget(output.blob, targetKbNum * 1024);
        blob = shrunk.blob;
        fitsTarget = shrunk.fits;
      }
      setResult({ ...output, blob, fitsTarget });
    } catch (err) {
      setError(`Couldn't generate a passport photo${err instanceof Error && err.message ? `: ${err.message}` : " from that image"}.`);
    } finally {
      setBusy(false);
    }
  }

  // The preview box uses the output aspect ratio and a centred cover crop, which mirrors the export geometry.
  const previewAspect = widthMm && heightMm ? `${widthMm} / ${heightMm}` : "35 / 45";

  return (
    <ToolLayout title={title} description={description}>
      <FileDropzone
        accept="image/jpeg,image/png"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
          setError(null);
        }}
        label={file ? file.name : "Click or drop a portrait photo here"}
      />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Photo size</span>
        <select
          value={sizeId}
          onChange={(e) => {
            setSizeId(e.target.value);
            setResult(null);
          }}
          className="w-fit rounded-lg border border-border px-3 py-2"
        >
          {photoSizes.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      {sizeId === "custom" && (
        <div className="flex gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Width (mm)</span>
            <input
              type="number"
              min={1}
              value={customW}
              aria-invalid={customWmm === null}
              onChange={(e) => setCustomW(e.target.value)}
              className="w-24 rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Height (mm)</span>
            <input
              type="number"
              min={1}
              value={customH}
              aria-invalid={customHmm === null}
              onChange={(e) => setCustomH(e.target.value)}
              className="w-24 rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>
      )}

      {sizeInvalid && <p className="text-sm text-destructive">Width and height must both be greater than 0 mm.</p>}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Input preview with face guide</span>
          {sourceUrl ? (
            <div className="relative w-56 overflow-hidden rounded-lg border border-border bg-accent/30" style={{ aspectRatio: previewAspect }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceUrl}
                alt="Input photo"
                className="size-full object-cover"
                style={{ transform: `scale(${zoom})` }}
              />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
                <ellipse cx="50" cy="44" rx="27" ry="36" fill="none" stroke="white" strokeWidth="0.6" strokeDasharray="2 1.5" />
                <line x1="0" y1="30" x2="100" y2="30" stroke="white" strokeWidth="0.3" strokeOpacity="0.7" />
                <line x1="0" y1="62" x2="100" y2="62" stroke="white" strokeWidth="0.3" strokeOpacity="0.7" />
              </svg>
            </div>
          ) : (
            <div className="flex w-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground" style={{ aspectRatio: previewAspect }}>
              Your photo appears here
            </div>
          )}
          <p className="w-56 text-xs text-muted-foreground">Centre the face inside the oval, with the eyes near the upper line.</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Background</span>
              <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="h-10 w-16 rounded-lg border border-border" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Zoom into face ({zoom.toFixed(1)}x)</span>
              <input
                type="range"
                min={1}
                max={2}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-40"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Max file size (KB, optional)</span>
            <input
              type="number"
              min={1}
              value={targetKb}
              placeholder="e.g. 200"
              aria-invalid={targetInvalid}
              onChange={(e) => {
                setTargetKb(e.target.value);
                setResult(null);
              }}
              className="w-32 rounded-lg border border-border px-3 py-2"
            />
          </label>
          {targetInvalid && <p className="text-sm text-destructive">Enter a file size above 0 KB, or leave it blank.</p>}
        </div>
      </div>

      <button
        onClick={run}
        disabled={!file || busy || sizeInvalid || targetInvalid}
        className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Generating…" : "Generate Photo"}
      </button>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && previewUrl && (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-border p-5">
          <img src={previewUrl} alt="Passport photo preview" className="h-40 border border-border" />
          <p className="text-sm text-muted-foreground">
            {result.widthPx} × {result.heightPx}px ({widthMm}×{heightMm}mm) · {Math.max(1, Math.round(result.blob.size / 1024))} KB
          </p>
          {result.fitsTarget === false && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Couldn&apos;t reach {targetKb} KB even at the lowest quality. This is the smallest version we could make.
            </p>
          )}
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}

export default function PassportPhotoPage() {
  return (
    <Suspense fallback={null}>
      <PassportPhotoTool />
    </Suspense>
  );
}
