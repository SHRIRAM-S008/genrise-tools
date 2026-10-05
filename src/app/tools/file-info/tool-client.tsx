"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { CopyButton } from "@/components/copy-button";
import { Download } from "lucide-react";
import { inspectFile, type FileInfoResult } from "@/lib/fileInfo";
import { formatBytes } from "@/lib/imageCore";

function toPlainText(info: FileInfoResult): string {
  const lines = [
    `Name: ${info.name}`,
    `Type: ${info.type}`,
    `Size: ${formatBytes(info.sizeBytes)} (${info.sizeBytes.toLocaleString()} bytes)`,
    `Last modified: ${info.lastModified}`,
  ];
  if (info.width && info.height) lines.push(`Dimensions: ${info.width} × ${info.height}px`);
  if (info.pageCount !== undefined) lines.push(`Pages: ${info.pageCount}`);
  return lines.join("\n");
}

export default function FileInfoPage() {
  const [info, setInfo] = useState<FileInfoResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(file: File) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await inspectFile(file);
      setInfo(result);
    } catch {
      setError(`Couldn't read ${file.name}. The file may be corrupted or blocked by your browser.`);
    } finally {
      setBusy(false);
    }
  }

  function downloadJson() {
    if (!info) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(info, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${info.name.replace(/\.[^./\\]+$/, "")}-info.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ToolLayout title="File Info Checker" description="Inspect a file's type, size, dimensions, or page count.">
      <FileDropzone onFiles={(files) => run(files[0])} label="Click or drop any file here" />

      {busy && <p className="text-sm text-muted-foreground">Reading file…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {info && (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl border border-border p-5 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="break-all">{info.name}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd>{info.type}</dd>
            <dt className="text-muted-foreground">Size</dt>
            <dd>{formatBytes(info.sizeBytes)}</dd>
            <dt className="text-muted-foreground">Last modified</dt>
            <dd>{info.lastModified}</dd>
            {info.width && info.height && (
              <>
                <dt className="text-muted-foreground">Dimensions</dt>
                <dd>{info.width} × {info.height}px</dd>
              </>
            )}
            {info.pageCount !== undefined && (
              <>
                <dt className="text-muted-foreground">Pages</dt>
                <dd>{info.pageCount}</dd>
              </>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={toPlainText(info)} label="Copy details" />
            <button
              onClick={downloadJson}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Download className="size-3.5" />
              Download JSON
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
