"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import DownloadButton from "@/components/DownloadButton";

const MIN_COUNT = 1;
const MAX_COUNT = 100;

type Version = "v4" | "v7";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function formatUuid(bytes: Uint8Array): string {
  const h = hex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Uses crypto.randomUUID when available, otherwise builds a v4 UUID from getRandomValues. */
function uuidV4(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

/** Time-ordered UUID (RFC 9562): 48-bit unix ms timestamp followed by random bits. */
function uuidV7(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let ms = Date.now();
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

export default function UuidGeneratorPage() {
  const [count, setCount] = useState(5);
  const [version, setVersion] = useState<Version>("v4");
  const [uppercase, setUppercase] = useState(false);
  const [noHyphens, setNoHyphens] = useState(false);
  const [braces, setBraces] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clamped = Number.isFinite(count) ? Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.floor(count))) : MIN_COUNT;
  const wasClamped = Number.isFinite(count) && clamped !== count;

  function format(raw: string): string {
    let out = raw;
    if (noHyphens) out = out.replace(/-/g, "");
    if (uppercase) out = out.toUpperCase();
    if (braces) out = `{${out}}`;
    return out;
  }

  function generate() {
    if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
      setError("This browser doesn't provide a secure random number generator, so UUIDs can't be created here.");
      setUuids([]);
      return;
    }
    setError(null);
    const make = version === "v7" ? uuidV7 : uuidV4;
    const list = Array.from({ length: clamped }, () => format(make()));
    setUuids(list);
    setGeneratedCount(clamped);
  }

  const text = useMemo(() => uuids.join("\n"), [uuids]);
  const txtBlob = useMemo(() => new Blob([text], { type: "text/plain;charset=utf-8" }), [text]);

  return (
    <ToolLayout title="UUID Generator" description="Generate random UUIDs (v4) or time-ordered UUIDs (v7) in bulk, instantly.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          How many? (1–{MAX_COUNT})
          <input
            type="number"
            min={MIN_COUNT}
            max={MAX_COUNT}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Version
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value as Version)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          >
            <option value="v4">v4 (random)</option>
            <option value="v7">v7 (time-ordered)</option>
          </select>
        </label>
        <button onClick={generate} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
          Generate
        </button>
      </div>

      {wasClamped && (
        <p className="text-sm text-muted-foreground">
          Count limited to {MIN_COUNT}–{MAX_COUNT}; {clamped} will be generated.
        </p>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
          Uppercase
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={noHyphens} onChange={(e) => setNoHyphens(e.target.checked)} />
          No hyphens
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={braces} onChange={(e) => setBraces(e.target.checked)} />
          Wrap in braces
        </label>
      </div>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {uuids.length > 0 && (
        <div className="rounded-2xl border border-border p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {generatedCount} UUID{generatedCount === 1 ? "" : "s"} ({version})
            </span>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={text} label="Copy all" />
              <DownloadButton blob={txtBlob} filename={`uuids-${version}.txt`} label="Download .txt" />
            </div>
          </div>
          <ul className="flex flex-col gap-1 font-mono text-sm">
            {uuids.map((u, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-accent/40">
                <span className="break-all">{u}</span>
                <CopyButton
                  value={u}
                  label="Copy"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </ToolLayout>
  );
}
