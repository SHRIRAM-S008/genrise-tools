"use client";

import { useEffect, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { generateMeme, type MemeOptions } from "@/lib/memeGenerator";
import { canvasToBlob, formatBytes } from "@/lib/imageCore";
import { useObjectUrl } from "@/lib/useObjectUrl";
import type { ImageMime } from "@/lib/types";

const FONTS = [
  { id: "Impact, 'Arial Black', sans-serif", label: "Impact" },
  { id: "'Arial Black', Arial, sans-serif", label: "Arial Black" },
  { id: "Georgia, serif", label: "Georgia" },
  { id: "'Comic Sans MS', cursive", label: "Comic Sans" },
];

const SIZES = [
  { id: "original", label: "Original size", width: null },
  { id: "1080p", label: "1080p (1080 px wide)", width: 1080 },
] as const;

type SizeId = (typeof SIZES)[number]["id"];

/** Downscales a file to the target width when it is wider; otherwise returns it unchanged. */
async function fitToWidth(file: File, width: number): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  if (bitmap.width <= width) {
    bitmap.close();
    return file;
  }
  const height = Math.round((bitmap.height * width) / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const mime: ImageMime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await canvasToBlob(canvas, mime, 0.95);
  return new File([blob], file.name, { type: mime });
}

export default function MemeGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  // Slider value is the text size directly: larger number, larger text.
  const [textSize, setTextSize] = useState(14);
  const [fontFamily, setFontFamily] = useState(FONTS[0].id);
  const [color, setColor] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [uppercase, setUppercase] = useState(true);
  const [format, setFormat] = useState<ImageMime>("image/jpeg");
  const [sizeId, setSizeId] = useState<SizeId>("original");
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultUrl = useObjectUrl(result);
  const fontScale = 26 - textSize;

  // Re-render the meme as the caption and styling change — with a short
  // debounce so typing doesn't queue an encode per keystroke.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const options: MemeOptions = { fontScale, fontFamily, color, strokeColor, uppercase, format };
    const targetWidth = SIZES.find((s) => s.id === sizeId)?.width ?? null;

    const id = window.setTimeout(async () => {
      try {
        const source = targetWidth ? await fitToWidth(file, targetWidth) : file;
        const blob = await generateMeme(source, topText, bottomText, options);
        if (!cancelled) {
          setResult(blob);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            `Couldn't render ${file.name}${err instanceof Error && err.message ? `: ${err.message}` : ""}. Try a different file.`
          );
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [file, topText, bottomText, fontScale, fontFamily, color, strokeColor, uppercase, format, sizeId]);

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "meme";
  const downloadName = `${baseName}-meme.${format === "image/png" ? "png" : "jpg"}`;

  return (
    <ToolLayout title="Meme Generator" description="Add captions to an image and watch the meme update as you type.">
      <FileDropzone
        accept="image/*"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
        }}
        label={file ? file.name : "Click or drop an image here"}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Top text</span>
          <input value={topText} onChange={(e) => setTopText(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Bottom text</span>
          <input value={bottomText} onChange={(e) => setBottomText(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Text size: {textSize}</span>
          <input
            type="range"
            min={6}
            max={20}
            value={textSize}
            onChange={(e) => setTextSize(Number(e.target.value))}
            aria-valuetext={`Text size ${textSize}`}
            className="w-36"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Font</span>
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="rounded-lg border border-border px-3 py-2">
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Output size</span>
          <select value={sizeId} onChange={(e) => setSizeId(e.target.value as SizeId)} className="rounded-lg border border-border px-3 py-2">
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Text</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-lg border border-border" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Outline</span>
          <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="h-10 w-16 rounded-lg border border-border" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
          UPPERCASE
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Format</span>
          <div className="flex gap-2">
            {([
              { mime: "image/jpeg" as ImageMime, label: "JPG" },
              { mime: "image/png" as ImageMime, label: "PNG" },
            ]).map((f) => (
              <button
                key={f.mime}
                onClick={() => setFormat(f.mime)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  format === f.mime ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && resultUrl && (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-border p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="Meme preview" className="max-w-full rounded-lg" />
          <p className="text-sm text-muted-foreground">Live preview · {formatBytes(result.size)}</p>
          <DownloadButton blob={result} filename={downloadName} />
        </div>
      )}
    </ToolLayout>
  );
}
