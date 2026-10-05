"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { CopyButton } from "@/components/copy-button";
import { Download } from "lucide-react";
import { formatBytes } from "@/lib/imageCore";

type Mode = "text" | "file";

/** Shown in the preview when decoded bytes aren't UTF-8 text. */
const HEX_PREVIEW_BYTES = 64;

class InvalidBase64Error extends Error {}

function encodeUtf8Base64(text: string): string {
  return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked so a large file doesn't blow the argument limit of fromCharCode.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Base64url uses - and _ instead of + and /, and usually drops the padding. */
function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Accepts standard and URL-safe alphabets, with or without padding. */
function base64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const cleaned = input.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(cleaned)) {
    throw new InvalidBase64Error("Contains characters that aren't valid Base64.");
  }
  const unpadded = cleaned.replace(/=+$/, "");
  if (unpadded.length % 4 === 1) {
    throw new InvalidBase64Error("The length isn't valid for Base64 — the input may be truncated.");
  }
  const standard = unpadded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(unpadded.length / 4) * 4, "=");
  try {
    const binary = atob(standard);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
  } catch {
    throw new InvalidBase64Error("Couldn't decode this Base64 input.");
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hexPreview(bytes: Uint8Array): string {
  const shown = Array.from(bytes.subarray(0, HEX_PREVIEW_BYTES), (b) => b.toString(16).padStart(2, "0"));
  return shown.join(" ") + (bytes.length > HEX_PREVIEW_BYTES ? " …" : "");
}

export default function Base64CodecPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [outputIsEncoded, setOutputIsEncoded] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);
  const [dataUrl, setDataUrl] = useState("");
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number; type: string } | null>(null);
  const [binaryBytes, setBinaryBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearResult() {
    setOutput("");
    setDataUrl("");
    setBinaryBytes(null);
    setOutputIsEncoded(false);
    setError(null);
  }

  function encode() {
    try {
      setOutput(encodeUtf8Base64(input));
      setOutputIsEncoded(true);
      setBinaryBytes(null);
      setError(null);
    } catch {
      setError("Couldn't encode this text.");
    }
  }

  function decode() {
    setBinaryBytes(null);
    setOutputIsEncoded(false);
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = base64ToBytes(input);
    } catch (err) {
      setOutput("");
      setError(err instanceof InvalidBase64Error ? err.message : "Invalid Base64 input.");
      return;
    }

    try {
      // fatal: true makes the decoder throw on bytes that aren't valid UTF-8,
      // which is how text is told apart from binary payloads.
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      setOutput(text);
      setError(null);
    } catch {
      setOutput("");
      setBinaryBytes(bytes);
      setError(null);
    }
  }

  async function encodeFile(file: File) {
    setBusy(true);
    setError(null);
    setDataUrl("");
    setBinaryBytes(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const base64 = bytesToBase64(bytes);
      setOutput(base64);
      setOutputIsEncoded(true);
      setFileMeta({ name: file.name, size: file.size, type: file.type || "application/octet-stream" });
      setDataUrl(`data:${file.type || "application/octet-stream"};base64,${base64}`);
    } catch {
      setError("Couldn't read that file. Very large files may run out of memory.");
    } finally {
      setBusy(false);
    }
  }

  const displayedOutput = outputIsEncoded && urlSafe ? toUrlSafe(output) : output;

  return (
    <ToolLayout title="Base64 Encoder / Decoder" description="Encode text or a file to Base64, or decode Base64 back to text.">
      <div className="flex gap-2">
        {(["text", "file"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setFileMeta(null);
              clearResult();
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "border border-border"
            }`}
          >
            {m === "text" ? "Text" : "File"}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            placeholder="Paste text or Base64 here…"
            aria-label="Input"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={encode} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
              Encode
            </button>
            <button onClick={decode} className="rounded-full border border-border px-6 py-3 font-medium hover:border-primary/40">
              Decode
            </button>
          </div>
        </>
      ) : (
        <>
          <FileDropzone
            onFiles={(files) => encodeFile(files[0])}
            label={busy ? "Encoding…" : fileMeta ? fileMeta.name : "Click or drop any file here"}
            hint="Encoded locally — nothing is uploaded"
          />
          {fileMeta && (
            <p className="text-sm text-muted-foreground">
              {fileMeta.type} · {formatBytes(fileMeta.size)} → {formatBytes(output.length)} of Base64
            </p>
          )}
        </>
      )}

      <label className="flex w-fit items-center gap-2 text-sm">
        <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
        URL-safe output (- and _, no padding)
      </label>

      {error && <p className="text-destructive">{error}</p>}

      {binaryBytes && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <p className="text-sm">
            The decoded data is binary, not UTF-8 text — {formatBytes(binaryBytes.length)}.
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">{hexPreview(binaryBytes)}</p>
          <div>
            <button
              onClick={() => triggerDownload(new Blob([binaryBytes], { type: "application/octet-stream" }), "decoded.bin")}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <Download className="size-4" />
              Download decoded bytes
            </button>
          </div>
        </div>
      )}

      {output && (
        <div className="flex flex-col gap-2">
          <textarea
            value={displayedOutput}
            readOnly
            rows={8}
            aria-label="Output"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <CopyButton value={displayedOutput} label={outputIsEncoded ? "Copy output" : "Copy decoded text"} />
            {dataUrl && <CopyButton value={dataUrl} label="Copy as data URL" />}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
