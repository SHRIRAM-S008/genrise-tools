"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { createZip } from "@/lib/zipCreator";
import { formatBytes } from "@/lib/imageCore";

const DEFAULT_NAME = "archive.zip";

/** Splits "photo.png" into ["photo", ".png"]; dotfiles and extension-less names keep the whole name. */
function splitName(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
}

/** Returns a unique name by appending " (2)", " (3)", … before the extension. */
function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const [base, ext] = splitName(name);
  let n = 2;
  while (taken.has(`${base} (${n})${ext}`)) n++;
  return `${base} (${n})${ext}`;
}

function withName(file: File, name: string): File {
  return name === file.name ? file : new File([file], name, { type: file.type, lastModified: file.lastModified });
}

export default function ZipCreatorPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [zipName, setZipName] = useState(DEFAULT_NAME);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);
  const trimmedName = zipName.trim();

  function addFiles(incoming: File[]) {
    setResult(null);
    setFiles((prev) => {
      const taken = new Set(prev.map((f) => f.name));
      const added = incoming.map((f) => {
        const name = uniqueName(f.name, taken);
        taken.add(name);
        return withName(f, name);
      });
      return [...prev, ...added];
    });
  }

  function move(index: number, delta: -1 | 1) {
    setResult(null);
    setFiles((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setResult(null);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    setResult(null);
    setError(null);
    setFiles([]);
  }

  async function run() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const output = await createZip(files, trimmedName || DEFAULT_NAME);
      setResult(output);
    } catch {
      setError("Couldn't create the ZIP file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolLayout title="ZIP Creator" description="Bundle multiple files into a single ZIP archive, right in your browser.">
      <FileDropzone
        multiple
        onFiles={addFiles}
        label={files.length ? `${files.length} file(s) selected` : "Click or drop files here"}
      />

      {files.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(totalBytes)} total
            </span>
            <button
              onClick={clearAll}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
            >
              Clear all
            </button>
          </div>

          <ul className="flex flex-col gap-1 text-sm">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="truncate">
                  {f.name} <span className="text-muted-foreground">({formatBytes(f.size)})</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    aria-label={`Move ${f.name} up`}
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    aria-label={`Move ${f.name} down`}
                    onClick={() => move(i, 1)}
                    disabled={i === files.length - 1}
                    className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    aria-label={`Remove ${f.name}`}
                    onClick={() => remove(i)}
                    className="px-2 text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">ZIP file name</span>
        <input
          value={zipName}
          onChange={(e) => {
            setResult(null);
            setZipName(e.target.value);
          }}
          aria-invalid={trimmedName === ""}
          className="w-64 rounded-lg border border-border px-3 py-2"
        />
        {trimmedName === "" && (
          <span className="text-xs text-muted-foreground">Name is empty, so the file will be called {DEFAULT_NAME}.</span>
        )}
      </label>

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Zipping…" : "Create ZIP"}
      </button>

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}
