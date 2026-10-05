"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import DownloadButton from "@/components/DownloadButton";
import { CopyButton } from "@/components/copy-button";
import { JsonTree } from "@/components/json-tree";

type View = "text" | "tree";

interface ParseFailure {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Engines report JSON errors differently: Chrome says "at line 3 column 5"
 * (newer) or "at position 42" (older), Firefox and Safari use other wording
 * with no position at all. Parse what is there and fall back to the message.
 */
function describeError(error: unknown, source: string): ParseFailure {
  const message = error instanceof Error ? error.message : "Invalid JSON";

  const lineCol = /line (\d+) column (\d+)/i.exec(message);
  if (lineCol) return { message, line: Number(lineCol[1]), column: Number(lineCol[2]) };

  const position = /position (\d+)/i.exec(message);
  if (position) {
    const offset = Math.min(Number(position[1]), source.length);
    const upTo = source.slice(0, offset);
    const line = upTo.split("\n").length;
    const column = offset - upTo.lastIndexOf("\n");
    return { message, line, column };
  }

  return { message };
}

interface TreeMatch {
  path: string;
  value: string;
}

/** Walks the parsed JSON and collects paths whose key or primitive value contains the query. */
function findMatches(root: unknown, query: string, limit = 200): TreeMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches: TreeMatch[] = [];

  function walk(value: unknown, path: string) {
    if (matches.length >= limit) return;
    if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const childPath = Array.isArray(value) ? `${path}[${key}]` : path ? `${path}.${key}` : key;
        if (key.toLowerCase().includes(needle) && !Array.isArray(value)) {
          matches.push({ path: childPath, value: typeof child === "object" && child !== null ? "(object or array)" : String(child) });
        } else if (typeof child !== "object" || child === null) {
          if (String(child).toLowerCase().includes(needle)) matches.push({ path: childPath, value: String(child) });
        }
        walk(child, childPath);
      }
    }
  }

  walk(root, "");
  return matches;
}

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [parsed, setParsed] = useState<unknown>(null);
  const [view, setView] = useState<View>("text");
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [failure, setFailure] = useState<ParseFailure | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const outputBlob = useMemo(() => new Blob([output], { type: "application/json" }), [output]);
  const matches = useMemo(() => (view === "tree" ? findMatches(parsed, query) : []), [parsed, query, view]);

  function sortDeep(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sortDeep);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, sortDeep(v)])
      );
    }
    return value;
  }

  function run(mode: "format" | "minify" | "validate") {
    try {
      const data = JSON.parse(input);
      const prepared = sortKeys ? sortDeep(data) : data;
      setParsed(prepared);
      setFailure(null);

      if (mode === "validate") {
        setOutput("");
        setStatus(`Valid JSON — ${describeShape(prepared)}`);
        return;
      }

      setStatus(null);
      setOutput(mode === "format" ? JSON.stringify(prepared, null, indent) : JSON.stringify(prepared));
    } catch (e) {
      setFailure(describeError(e, input));
      setOutput("");
      setParsed(null);
      setStatus(null);
    }
  }

  return (
    <ToolLayout title="JSON Formatter" description="Format, validate, minify and explore JSON data instantly.">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
        placeholder="Paste JSON here…"
        aria-label="JSON input"
        className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Indent
          <select value={indent} onChange={(e) => setIndent(Number(e.target.value))} className="rounded-lg border border-border px-2 py-1">
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={0}>None</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} />
          Sort keys
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => run("format")} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
          Format
        </button>
        <button onClick={() => run("minify")} className="rounded-full border border-border px-6 py-3 font-medium hover:border-primary/40">
          Minify
        </button>
        <button onClick={() => run("validate")} className="rounded-full border border-border px-6 py-3 font-medium hover:border-primary/40">
          Validate
        </button>
      </div>

      {failure && (
        <p role="alert" className="text-destructive">
          {failure.message}
          {failure.line !== undefined && failure.column !== undefined ? ` (line ${failure.line}, column ${failure.column})` : ""}
        </p>
      )}

      {status && <p className="text-primary">{status}</p>}

      {parsed !== null && (
        <div className="flex gap-2">
          {(["text", "tree"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                view === v ? "bg-primary text-primary-foreground" : "border border-border"
              }`}
            >
              {v === "text" ? "Text output" : "Tree view"}
            </button>
          ))}
        </div>
      )}

      {view === "tree" && parsed !== null ? (
        <div className="flex flex-col gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keys and values…"
            aria-label="Search tree"
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
          {query.trim() && (
            <div className="max-h-48 overflow-auto rounded-lg border border-border p-3 font-mono text-xs">
              <p className="mb-2 text-muted-foreground">
                {matches.length === 0 ? "No matches" : `${matches.length}${matches.length >= 200 ? "+" : ""} match(es)`}
              </p>
              <ul className="flex flex-col gap-1">
                {matches.map((m, i) => (
                  <li key={`${m.path}-${i}`} className="break-all">
                    <span className="text-primary">{m.path || "(root)"}</span>
                    <span className="text-muted-foreground"> = {m.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="max-h-[32rem] overflow-auto rounded-lg border border-border p-4">
            <JsonTree value={parsed} />
          </div>
        </div>
      ) : (
        output && (
          <div className="flex flex-col gap-2">
            <textarea
              value={output}
              readOnly
              rows={10}
              aria-label="Output JSON"
              className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <CopyButton value={output} label="Copy output" />
              <DownloadButton blob={outputBlob} filename="formatted.json" label="Download .json" />
            </div>
          </div>
        )
      )}
    </ToolLayout>
  );
}

function describeShape(value: unknown): string {
  if (Array.isArray(value)) return `array with ${value.length} item(s)`;
  if (value && typeof value === "object") return `object with ${Object.keys(value).length} key(s)`;
  return typeof value;
}
