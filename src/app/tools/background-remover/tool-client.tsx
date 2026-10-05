"use client";

import { useEffect, useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { removeImageBackground } from "@/lib/backgroundRemover";
import { useObjectUrl } from "@/lib/useObjectUrl";

type ExportFormat = "png" | "jpg";

/** Draws a transparent PNG onto a solid background and re-encodes it as PNG or JPG. */
async function composeOnBackground(source: Blob, color: string, format: ExportFormat): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      format === "jpg" ? "image/jpeg" : "image/png",
      0.95
    );
  });
}

function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (err instanceof RangeError || /memory|allocation/i.test(message)) {
    return "This image is too large to process in your browser. Try a smaller image.";
  }
  if (err instanceof TypeError || /fetch|network|failed to load|download/i.test(message)) {
    return "Couldn't download the background model. Check your connection and try again.";
  }
  if (/decode|unsupported|format|invalid/i.test(message)) {
    return "This file doesn't look like a supported image. Try a PNG, JPG or WebP.";
  }
  return "Couldn't remove the background from this image. Try a different file.";
}

export default function BackgroundRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [useSolid, setUseSolid] = useState(false);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [format, setFormat] = useState<ExportFormat>("png");
  // Composed export for the current result/background/format. Tagged with its
  // inputs so a stale composition is never shown after a change.
  const [composed, setComposed] = useState<{ source: Blob; key: string; blob: Blob } | null>(null);

  // Incremented on cancel so a finished run that was cancelled is discarded.
  const runIdRef = useRef(0);

  const originalUrl = useObjectUrl(file);
  const resultUrl = useObjectUrl(result?.blob);

  // JPG has no alpha channel, so transparent JPG exports also need a flat background (white).
  const needsCompose = useSolid || format === "jpg";
  const composeKey = `${useSolid ? bgColor : "white"}|${format}`;

  useEffect(() => {
    if (!result || !needsCompose) return;
    let cancelled = false;
    const source = result.blob;
    composeOnBackground(source, useSolid ? bgColor : "#ffffff", format)
      .then((blob) => {
        if (!cancelled) setComposed({ source, key: composeKey, blob });
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't prepare the export. Try a different background or format.");
      });
    return () => {
      cancelled = true;
    };
  }, [result, needsCompose, useSolid, bgColor, format, composeKey]);

  const exportBlob: Blob | null = !result
    ? null
    : !needsCompose
      ? result.blob
      : composed && composed.source === result.blob && composed.key === composeKey
        ? composed.blob
        : null;

  const exportFilename = result ? result.filename.replace(/\.png$/i, `.${format}`) : "";

  async function run() {
    if (!file) return;
    const runId = ++runIdRef.current;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ label: "Loading model", percent: 0 });
    try {
      const output = await removeImageBackground(file, (key, current, total) => {
        if (runId !== runIdRef.current) return;
        const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        const label = key.toLowerCase().startsWith("fetch") ? "Downloading model" : "Removing background";
        setProgress({ label, percent });
      });
      if (runId === runIdRef.current) setResult(output);
    } catch (err) {
      if (runId === runIdRef.current) setError(describeError(err));
    } finally {
      if (runId === runIdRef.current) {
        setBusy(false);
        setProgress(null);
      }
    }
  }

  function cancel() {
    // The on-device model can't be aborted mid-inference, so cancelling stops
    // the UI from waiting and discards whatever the run produces.
    runIdRef.current++;
    setBusy(false);
    setProgress(null);
  }

  return (
    <ToolLayout title="Image Background Remover" description="Remove image backgrounds instantly, on-device.">
      <FileDropzone
        accept="image/*"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
          setError(null);
        }}
        label={file ? file.name : "Click or drop an image here"}
      />

      <p className="text-sm text-muted-foreground">
        The first run downloads a small on-device model, then everything runs locally in your browser
        — your image is never uploaded to a server.
      </p>

      {file && !busy && (
        <button
          onClick={run}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          Remove Background
        </button>
      )}

      {busy && progress && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span>
              {progress.label}… <span className="font-semibold">{progress.percent}%</span>
            </span>
            <button onClick={cancel} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-destructive hover:text-destructive">
              Cancel
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-accent" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
            <div className="h-full bg-primary transition-[width]" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {error && <p className="text-destructive">{error}</p>}

      {(originalUrl || resultUrl) && (
        <div className="grid grid-cols-2 gap-4">
          {originalUrl && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Original</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalUrl} alt="Original" className="w-full rounded-lg border border-border" />
            </div>
          )}
          {resultUrl && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Background removed</p>
              <div
                className="w-full overflow-hidden rounded-lg border border-border"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="Background removed" className="w-full" />
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
          <div className="flex flex-wrap items-end gap-4">
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1 font-medium">Background</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="bg-mode" checked={!useSolid} onChange={() => setUseSolid(false)} />
                Transparent
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="bg-mode" checked={useSolid} onChange={() => setUseSolid(true)} />
                Solid color
                <input
                  type="color"
                  aria-label="Background color"
                  value={bgColor}
                  disabled={!useSolid}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-border disabled:opacity-40"
                />
              </label>
            </fieldset>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Format</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className="rounded-lg border border-border px-3 py-2">
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </label>
          </div>

          {format === "jpg" && !useSolid && (
            <p className="text-sm text-muted-foreground">JPG has no transparency, so the export uses a white background.</p>
          )}

          {exportBlob ? (
            <DownloadButton blob={exportBlob} filename={exportFilename} />
          ) : (
            <p className="text-sm text-muted-foreground">Preparing export…</p>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
