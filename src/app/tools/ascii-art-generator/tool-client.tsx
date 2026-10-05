"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { CopyButton } from "@/components/copy-button";
import { Download } from "lucide-react";
import { imageToAscii, type AsciiRamp } from "@/lib/asciiArt";

const RAMPS: { id: AsciiRamp; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "detailed", label: "Detailed" },
  { id: "blocks", label: "Blocks" },
  { id: "minimal", label: "Minimal" },
];

/** Approximate advance width of a monospace glyph, in em. */
const CHAR_WIDTH_EM = 0.6;
/** Preview font size never grows past this, so narrow art stays readable at a normal size. */
const MAX_PREVIEW_FONT_PX = 9;
const EXPORT_FONT_PX = 10;
const EXPORT_FONT_FAMILY = 'ui-monospace, Menlo, Consolas, "Courier New", monospace';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AsciiArtGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState(120);
  const [ramp, setRamp] = useState<AsciiRamp>("standard");
  const [invert, setInvert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ascii, setAscii] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  // Re-render whenever a setting changes, so the controls feel live.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;

    const id = window.setTimeout(async () => {
      setBusy(true);
      try {
        const result = await imageToAscii(file, { columns, ramp, invert });
        if (!cancelled) {
          setAscii(result);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Couldn't process this image.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [file, columns, ramp, invert]);

  // Track the preview container width so wide art shrinks to fit instead of overflowing.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setPreviewWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ascii]);

  const lines = useMemo(() => (ascii ? ascii.split("\n") : []), [ascii]);
  const maxLineLength = useMemo(() => lines.reduce((max, line) => Math.max(max, [...line].length), 0), [lines]);

  const previewFontPx =
    previewWidth > 0 && maxLineLength > 0
      ? Math.min(MAX_PREVIEW_FONT_PX, previewWidth / (maxLineLength * CHAR_WIDTH_EM))
      : MAX_PREVIEW_FONT_PX;

  function download() {
    if (!ascii) return;
    triggerDownload(new Blob([ascii], { type: "text/plain" }), "ascii-art.txt");
  }

  function downloadPng() {
    if (!ascii || lines.length === 0) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const font = `${EXPORT_FONT_PX}px ${EXPORT_FONT_FAMILY}`;
    ctx.font = font;
    const padding = 16;
    const lineHeight = Math.ceil(EXPORT_FONT_PX * 1.1);
    const textWidth = Math.ceil(Math.max(...lines.map((line) => ctx.measureText(line).width)));

    canvas.width = textWidth + padding * 2;
    canvas.height = lines.length * lineHeight + padding * 2;

    // Dark art on light paper by default; inverted art is light-on-dark.
    ctx.fillStyle = invert ? "#000000" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    ctx.fillStyle = invert ? "#ffffff" : "#000000";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => ctx.fillText(line, padding, padding + i * lineHeight));

    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, "ascii-art.png");
    }, "image/png");
  }

  return (
    <ToolLayout title="ASCII Art Generator" description="Turn any image into text-based ASCII art — tune the width, character set and contrast.">
      <FileDropzone
        accept="image/*"
        onFiles={(files) => setFile(files[0])}
        label={file ? file.name : "Click or drop an image here"}
      />

      {file && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Width: {columns} chars</span>
            <input type="range" min={40} max={300} step={10} value={columns} onChange={(e) => setColumns(Number(e.target.value))} className="w-44" />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Character set</span>
            <select value={ramp} onChange={(e) => setRamp(e.target.value as AsciiRamp)} className="rounded-lg border border-border px-3 py-2">
              {RAMPS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
            Invert (for dark backgrounds)
          </label>
        </div>
      )}

      {busy && <p className="text-muted-foreground">Converting…</p>}
      {error && <p className="text-destructive">{error}</p>}

      {ascii && (
        <div className="rounded-2xl border border-border p-5">
          <div ref={previewRef} className="w-full overflow-hidden">
            <pre
              className="whitespace-pre"
              style={{ fontSize: `${previewFontPx}px`, lineHeight: `${previewFontPx}px` }}
            >
              {ascii}
            </pre>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyButton value={ascii} label="Copy" />
            <button onClick={download} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
              <Download className="size-4" />
              Download .txt
            </button>
            <button onClick={downloadPng} className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-primary/40">
              <Download className="size-4" />
              Download .png
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
