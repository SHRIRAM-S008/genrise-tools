"use client";

import { useEffect, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { CopyButton } from "@/components/copy-button";
import { formatBytes } from "@/lib/imageCore";

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
type Algorithm = (typeof ALGORITHMS)[number];
type Source = "text" | "file";

async function digestToHex(algorithm: Algorithm, data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Result tagged with the input it was computed for, so a stale hash is never shown. */
type Result = { key: string; hash: string } | { key: string; error: string };

export default function HashGeneratorPage() {
  const [source, setSource] = useState<Source>("text");
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm>("SHA-256");
  const [expected, setExpected] = useState("");
  const [uppercase, setUppercase] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const fileKey = file ? `${file.name}:${file.size}:${file.lastModified}` : "";
  const currentKey = source === "file" ? `file|${algorithm}|${fileKey}` : `text|${algorithm}|${input}`;
  const hasInput = source === "file" ? file !== null : input.length > 0;

  // Hash live: text is debounced while typing, files hash as soon as they are chosen.
  useEffect(() => {
    if (!hasInput) return;
    const key = currentKey;
    let cancelled = false;
    const id = window.setTimeout(
      async () => {
        try {
          const data =
            source === "file" && file
              ? await file.arrayBuffer()
              : new TextEncoder().encode(input);
          const hash = await digestToHex(algorithm, data);
          if (!cancelled) setResult({ key, hash });
        } catch {
          if (!cancelled) {
            setResult({ key, error: "Couldn't hash that input. Very large files may run out of memory." });
          }
        }
      },
      source === "file" ? 0 : 250
    );
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // currentKey already captures input/file/algorithm; source and hasInput gate the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, source, hasInput]);

  const current = result && result.key === currentKey ? result : null;
  const hash = current && "hash" in current ? current.hash : "";
  const error = current && "error" in current ? current.error : null;
  const busy = hasInput && !current;
  const displayHash = uppercase ? hash.toUpperCase() : hash;

  const normalizedExpected = expected.trim().replace(/\s+/g, "").toLowerCase();
  const matchState: "none" | "match" | "mismatch" =
    !normalizedExpected || !hash ? "none" : normalizedExpected === hash ? "match" : "mismatch";

  return (
    <ToolLayout title="Hash Generator" description="Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes of text or a file.">
      <div className="flex gap-2">
        {(["text", "file"] as Source[]).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              source === s ? "bg-primary text-primary-foreground" : "border border-border"
            }`}
          >
            {s === "text" ? "Hash text" : "Hash a file"}
          </button>
        ))}
      </div>

      {source === "text" ? (
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          placeholder="Enter text to hash…"
          aria-label="Text to hash"
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
      ) : (
        <>
          <FileDropzone
            onFiles={(files) => setFile(files[0])}
            label={file ? file.name : "Click or drop any file here"}
            hint="Checksums are computed locally — nothing is uploaded"
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
          aria-label="Hash algorithm"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          {ALGORITHMS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
          Uppercase
        </label>
        {busy && <span className="text-sm text-muted-foreground">Hashing…</span>}
      </div>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {hash && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="break-all font-mono text-sm">{displayHash}</span>
            <CopyButton
              value={displayHash}
              label="Copy"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
            />
          </div>
        </div>
      )}

      <label className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          Expected hash (optional)
          {matchState === "match" && (
            <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Match
            </span>
          )}
          {matchState === "mismatch" && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Mismatch</span>
          )}
        </span>
        <input
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="Paste a published checksum to compare"
          spellCheck={false}
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
      </label>
    </ToolLayout>
  );
}
