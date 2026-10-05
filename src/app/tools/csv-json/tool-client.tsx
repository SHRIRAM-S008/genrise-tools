"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { CopyButton } from "@/components/copy-button";
import { formatJson, minifyJson } from "@/lib/csvJson";

type Mode = "csv-to-json" | "json-to-csv" | "format-json" | "minify-json";

const DELIMITERS = [
  { id: ",", label: "Comma (,)" },
  { id: ";", label: "Semicolon (;)" },
  { id: "\t", label: "Tab" },
  { id: "|", label: "Pipe (|)" },
] as const;

class CsvParseError extends Error {
  constructor(
    message: string,
    readonly row: number,
    readonly column: number
  ) {
    super(message);
  }
}

/** Splits CSV text into rows of cells. Rows are 1-based in error messages. */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let quoteRow = 1;
  let quoteColumn = 1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      if (cell.length === 0) {
        inQuotes = true;
        quoteRow = rows.length + 1;
        quoteColumn = row.length + 1;
      } else {
        cell += char;
      }
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new CsvParseError(
      `Unclosed quote starting at row ${quoteRow}, column ${quoteColumn}.`,
      quoteRow,
      quoteColumn
    );
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function csvToJson(text: string, delimiter: string): string {
  const rows = parseDelimited(text, delimiter);
  if (rows.length === 0) return "[]";
  const [header, ...body] = rows;
  const objects = body.map((row, index) => {
    if (row.length > header.length) {
      throw new CsvParseError(
        `Row ${index + 2} has ${row.length} columns, but the header has ${header.length}. Check the delimiter or quoting.`,
        index + 2,
        header.length + 1
      );
    }
    const obj: Record<string, string> = {};
    header.forEach((key, i) => {
      obj[key] = row[i] ?? "";
    });
    return obj;
  });
  return JSON.stringify(objects, null, 2);
}

function escapeCell(value: string, delimiter: string): string {
  const needsQuotes = value.includes(delimiter) || /["\n\r]/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Nested objects/arrays keep their JSON shape rather than "[object Object]". */
function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function jsonToCsv(json: string, delimiter: string): string {
  const data = JSON.parse(json);
  const rows: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lines = [headers.map((h) => escapeCell(h, delimiter)).join(delimiter)];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(stringifyCell(row[h]), delimiter)).join(delimiter));
  }
  return lines.join("\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const modes: { id: Mode; label: string }[] = [
  { id: "csv-to-json", label: "CSV → JSON" },
  { id: "json-to-csv", label: "JSON → CSV" },
  { id: "format-json", label: "Format JSON" },
  { id: "minify-json", label: "Minify JSON" },
];

export default function CsvJsonPage() {
  const [mode, setMode] = useState<Mode>("csv-to-json");
  const [delimiter, setDelimiter] = useState<string>(",");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const usesDelimiter = mode === "csv-to-json" || mode === "json-to-csv";

  function changeMode(next: Mode) {
    setMode(next);
    setOutput("");
    setError(null);
  }

  function run() {
    setError(null);
    try {
      switch (mode) {
        case "csv-to-json":
          setOutput(csvToJson(input, delimiter));
          break;
        case "json-to-csv":
          setOutput(jsonToCsv(input, delimiter));
          break;
        case "format-json":
          setOutput(formatJson(input));
          break;
        case "minify-json":
          setOutput(minifyJson(input));
          break;
      }
    } catch (err) {
      setOutput("");
      if (err instanceof CsvParseError) {
        setError(`${err.message} (row ${err.row}, column ${err.column})`);
      } else if (err instanceof SyntaxError) {
        setError(`Invalid JSON: ${err.message}`);
      } else {
        setError("Couldn't parse that input. Check the format and try again.");
      }
    }
  }

  async function loadFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    const isJson = /\.json$/i.test(file.name) || file.type === "application/json";
    const text = await file.text();
    setInput(text);
    setFileName(file.name);
    // Pick the matching mode so the file can be converted straight away.
    changeMode(isJson ? "format-json" : "csv-to-json");
  }

  function download() {
    const isCsv = mode === "json-to-csv";
    triggerDownload(new Blob([output], { type: isCsv ? "text/csv" : "application/json" }), isCsv ? "output.csv" : "output.json");
  }

  return (
    <ToolLayout title="CSV / JSON Tools" description="Convert, format, and minify CSV and JSON data — all in your browser.">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => changeMode(m.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === m.id ? "bg-primary text-primary-foreground" : "border border-border"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <FileDropzone
        accept=".csv,.json,text/csv,application/json"
        onFiles={loadFile}
        label={fileName ? `Loaded ${fileName}` : "Click or drop a .csv or .json file here"}
        hint="Or paste your data in the box below"
      />

      {usesDelimiter && (
        <label className="flex w-fit flex-col gap-2">
          <span className="text-sm font-medium">Delimiter</span>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            {DELIMITERS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Input</span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
      </label>

      <button onClick={run} disabled={!input.trim()} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50">
        Convert
      </button>

      {error && <p className="text-destructive">{error}</p>}

      {output && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Output</span>
          <textarea readOnly value={output} rows={8} aria-label="Output" className="rounded-lg border border-border px-3 py-2 font-mono text-sm" />
          <div className="flex flex-wrap gap-2">
            <CopyButton value={output} label="Copy output" />
            <button onClick={download} className="w-fit rounded-full border border-border px-5 py-2 text-sm font-medium">
              Download
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
