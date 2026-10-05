"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { ImageResult } from "@/components/image-result";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { readMetadata, stripMetadata, type MetadataSummary } from "@/lib/metadataRemover";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.heic,.heif,.tif,.tiff";

/** Formats one raw EXIF value for display, summarizing binary blobs instead of dumping bytes. */
function formatRawValue(value: unknown): string {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return `(binary, ${value.byteLength} bytes)`;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(formatRawValue).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "this format may not be supported by your browser";
}

export default function MetadataRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<MetadataSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function inspect(selected: File) {
    setFile(selected);
    setResult(null);
    setError(null);
    setBusy(true);
    try {
      const meta = await readMetadata(selected);
      setSummary(meta);
    } finally {
      setBusy(false);
    }
  }

  async function clean() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const output = await stripMetadata(file);
      setResult(output);
    } catch (err) {
      setError(`Couldn't clean ${file.name}: ${describeError(err)}. Try a JPG or PNG export of the photo.`);
    } finally {
      setBusy(false);
    }
  }

  const rawEntries = summary?.raw ? Object.entries(summary.raw).sort(([a], [b]) => a.localeCompare(b)) : [];

  return (
    <ToolLayout
      title="Metadata Remover"
      description="See — and remove — hidden camera, date, and GPS location data embedded in a photo before you share it."
    >
      <FileDropzone accept={ACCEPT} onFiles={(files) => inspect(files[0])} label={file ? file.name : "Click or drop a photo here"} hint="JPG, PNG, WebP, HEIC or TIFF" />

      {summary && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5 text-sm">
          {summary.hasMetadata ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              {summary.camera && (<><dt className="text-muted-foreground">Camera</dt><dd>{summary.camera}</dd></>)}
              {summary.dateTaken && (<><dt className="text-muted-foreground">Date taken</dt><dd>{summary.dateTaken}</dd></>)}
              {summary.gps && (
                <>
                  <dt className="text-muted-foreground">GPS</dt>
                  <dd className="flex flex-wrap items-center gap-3">
                    <span>
                      {summary.gps.latitude.toFixed(4)}, {summary.gps.longitude.toFixed(4)}
                    </span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${summary.gps.latitude}&mlon=${summary.gps.longitude}#map=15/${summary.gps.latitude}/${summary.gps.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline"
                    >
                      Open in map <ExternalLink className="size-3" />
                    </a>
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-muted-foreground">No readable metadata found in this file.</p>
          )}

          {rawEntries.length > 0 && (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer font-medium">All metadata fields ({rawEntries.length})</summary>
              <div className="mt-3 max-h-80 overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1 pr-4 font-medium">Field</th>
                      <th className="py-1 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawEntries.map(([key, value]) => (
                      <tr key={key} className="border-b border-border/50 align-top">
                        <td className="py-1 pr-4 font-mono text-muted-foreground">{key}</td>
                        <td className="break-all py-1 font-mono">{formatRawValue(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}

      {file && (
        <button onClick={clean} disabled={busy} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50">
          {busy ? "Cleaning…" : "Remove metadata & download"}
        </button>
      )}

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <ImageResult blob={result.blob} filename={result.filename} originalSize={file?.size}>
          <p className="flex items-center gap-1.5 text-sm text-primary">
            <CheckCircle2 className="size-4" /> Metadata stripped
          </p>
        </ImageResult>
      )}
    </ToolLayout>
  );
}
