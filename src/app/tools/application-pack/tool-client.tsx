"use client";

import { useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { createZip } from "@/lib/zipCreator";
import { formatBytes } from "@/lib/imageCore";

/** Files above this size are flagged, since many portals cap uploads around 10 MB. */
const LARGE_FILE_BYTES = 10 * 1024 * 1024;

interface PackItem {
  id: number;
  file: File;
}

export default function ApplicationPackPage() {
  const [items, setItems] = useState<PackItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(0);

  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  function addFiles(newFiles: File[]) {
    const added = newFiles.map((file) => ({ id: nextId.current++, file }));
    setItems((prev) => [...prev, ...added]);
    setResult(null);
  }

  function move(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  async function run() {
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const output = await createZip(
        items.map((item) => item.file),
        "application-pack.zip"
      );
      setResult(output);
    } catch {
      setError("Couldn't build the application pack.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolLayout
      title="Application Pack Builder"
      description="Gather your resume, photo, signature, and certificates into one organized ZIP, ready to submit."
    >
      <FileDropzone
        multiple
        onFiles={addFiles}
        label={items.length ? `${items.length} file(s) added` : "Click or drop your documents here"}
        hint="Resume, photo, signature, certificates — any file type"
      />

      {items.length > 0 && (
        <>
          <ul className="flex flex-col gap-1 text-sm">
            {items.map((item, i) => {
              const isLarge = item.file.size > LARGE_FILE_BYTES;
              return (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="truncate">
                    {i + 1}. {item.file.name}{" "}
                    <span className="text-muted-foreground">({formatBytes(item.file.size)})</span>
                    {isLarge && <span className="ml-2 text-destructive">Large file — some portals reject files over 10 MB</span>}
                  </span>
                  <span className="flex gap-2">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${item.file.name} up`}
                      className="text-muted-foreground hover:text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      aria-label={`Move ${item.file.name} down`}
                      className="text-muted-foreground hover:text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">Remove</button>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground">
            {items.length} file(s) · {formatBytes(totalBytes)} total
          </p>
        </>
      )}

      <button onClick={run} disabled={items.length === 0 || busy} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50">
        {busy ? "Packing…" : "Build Application Pack"}
      </button>

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          <p className="flex items-center gap-1.5 text-sm text-primary"><CheckCircle2 className="size-4" /> Pack ready — {items.length} files</p>
          <div className="mt-3">
            <DownloadButton blob={result.blob} filename={result.filename} />
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
