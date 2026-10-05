"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";

type Mode = "component" | "uri";

type Result = { value: string } | null;

type QueryRow = { key: string; value: string };

function encodeValue(input: string, mode: Mode, formEncoding: boolean): string {
  const encoded = mode === "component" ? encodeURIComponent(input) : encodeURI(input);
  return formEncoding ? encoded.replace(/%20/g, "+") : encoded;
}

function decodeValue(input: string, mode: Mode, formEncoding: boolean): string {
  const source = formEncoding ? input.replace(/\+/g, " ") : input;
  return mode === "component" ? decodeURIComponent(source) : decodeURI(source);
}

/** Accepts a full URL, a "?a=b" fragment, or a bare "a=b&c=d" string. */
function parseQuery(input: string): QueryRow[] {
  const trimmed = input.trim();
  const queryStart = trimmed.indexOf("?");
  let query = queryStart >= 0 ? trimmed.slice(queryStart + 1) : trimmed;
  const hashStart = query.indexOf("#");
  if (hashStart >= 0) query = query.slice(0, hashStart);
  const params = new URLSearchParams(query);
  return Array.from(params.entries()).map(([key, value]) => ({ key, value }));
}

export default function UrlEncoderPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("component");
  const [formEncoding, setFormEncoding] = useState(false);
  const [rows, setRows] = useState<QueryRow[] | null>(null);

  function run(action: "encode" | "decode") {
    try {
      const value =
        action === "encode" ? encodeValue(input, mode, formEncoding) : decodeValue(input, mode, formEncoding);
      setResult({ value });
      setError(null);
    } catch {
      setResult(null);
      setError("Invalid URL-encoded input. Check for a stray % that isn't followed by two hex digits.");
    }
  }

  function parse() {
    setRows(parseQuery(input));
  }

  return (
    <ToolLayout title="URL Encoder / Decoder" description="Encode or decode URL components and query strings.">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div role="group" aria-label="Encoding mode" className="inline-flex rounded-full border border-border p-1">
          {(
            [
              { value: "component", label: "encodeURIComponent" },
              { value: "uri", label: "encodeURI" },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={mode === m.value}
              onClick={() => setMode(m.value)}
              className={`rounded-full px-3 py-1.5 font-mono text-xs ${
                mode === m.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={formEncoding} onChange={(e) => setFormEncoding(e.target.checked)} />
          Form encoding (space as +)
        </label>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={8}
        aria-label="Input"
        placeholder="Paste text, a URL-encoded string, or a query string here…"
        className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => run("encode")} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
          Encode
        </button>
        <button onClick={() => run("decode")} className="rounded-full border border-border px-6 py-3 font-medium hover:border-primary/40">
          Decode
        </button>
        <button onClick={parse} className="rounded-full border border-border px-6 py-3 font-medium hover:border-primary/40">
          Parse query string
        </button>
      </div>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2">
          <textarea
            value={result.value}
            readOnly
            rows={8}
            aria-label="Output"
            placeholder="(empty result)"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />
          <div className="flex items-center gap-3">
            <CopyButton value={result.value} label="Copy output" />
            {result.value === "" && <span className="text-sm text-muted-foreground">The result is empty.</span>}
          </div>
        </div>
      )}

      {rows && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Query parameters</p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No query parameters found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Key</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="break-all px-3 py-2 font-mono">{row.key}</td>
                      <td className="break-all px-3 py-2 font-mono">{row.value}</td>
                      <td className="flex gap-2 px-3 py-2">
                        <CopyButton
                          value={row.key}
                          label="Copy key"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        />
                        <CopyButton
                          value={row.value}
                          label="Copy value"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
