"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Download } from "lucide-react";
import { extractText, OCR_LANGUAGES, type OcrProgress } from "@/lib/ocrExtractor";
import { extractPages, getPdfPageCount, parsePageRange } from "@/lib/splitPdf";
import { CopyButton } from "@/components/copy-button";

/** Says why extraction failed, using pdf.js error names where present and a fetch hint for language-pack downloads. */
function explainFailure(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : "";
  if (name === "PasswordException") return "This PDF is password protected. Unlock it first, then try again.";
  if (name === "InvalidPDFException" || name === "MissingPDFException")
    return "This file doesn't look like a valid PDF or image. It may be corrupt.";
  if (/fetch|network|load/i.test(message) && /lang|traineddata|worker|core/i.test(message))
    return "Couldn't download the OCR language data. Check your connection and try again.";
  if (/canvas/i.test(message)) return "Your browser couldn't prepare this file for reading. Try a PNG or JPG.";
  return `Couldn't extract text${message ? `: ${message}` : ""}. Try a clearer image or a different file.`;
}

export default function OcrTextExtractorPage() {
  const [language, setLanguage] = useState("eng");
  const [pageRange, setPageRange] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File, lang = language) {
    setFile(file);
    setBusy(true);
    setError(null);
    setText(null);
    setProgress(null);
    try {
      let source = file;
      if (file.type === "application/pdf" && pageRange.trim()) {
        const total = await getPdfPageCount(file);
        const indices = parsePageRange(pageRange, total);
        if (indices.length === 0) {
          setError(`No pages match "${pageRange}". This PDF has ${total} page(s).`);
          return;
        }
        const subset = await extractPages(file, indices);
        source = new File([subset.blob], file.name, { type: "application/pdf" });
      }
      const result = await extractText(source, setProgress, lang);
      setText(result);
    } catch (err) {
      setError(explainFailure(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function downloadText() {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function clear() {
    setFile(null);
    setText(null);
    setError(null);
    setProgress(null);
  }

  const isPdf = file?.type === "application/pdf";

  return (
    <ToolLayout title="OCR Text Extractor" description="Pull text out of images and scanned PDFs.">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex w-fit flex-col gap-2">
          <span className="text-sm font-medium">Language</span>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              if (file) handleFile(file, e.target.value);
            }}
            className="rounded-lg border border-border px-3 py-2"
          >
            {OCR_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            The language pack downloads once, then stays cached in your browser.
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">PDF pages (optional)</span>
          <input
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            placeholder="e.g. 1-3, 7"
            disabled={busy}
            className="w-40 rounded-lg border border-border px-3 py-2 disabled:opacity-50"
          />
          <span className="text-xs text-muted-foreground">Applies to the next PDF you choose. Leave blank for all pages.</span>
        </label>
      </div>

      <FileDropzone
        accept="image/*,application/pdf"
        onFiles={(files) => handleFile(files[0])}
        label={busy ? "Reading…" : file ? file.name : "Click or drop an image or PDF here"}
      />

      {file && !busy && (
        <div className="flex flex-wrap gap-2">
          <button onClick={clear} className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40">
            Clear
          </button>
          {isPdf && pageRange.trim() && <span className="self-center text-xs text-muted-foreground">Pages: {pageRange}</span>}
        </div>
      )}

      {busy && progress && (
        <p className="text-sm text-muted-foreground">
          {progress.status} {progress.progress > 0 ? `(${Math.round(progress.progress * 100)}%)` : ""}
        </p>
      )}

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {text !== null && (
        <div className="flex flex-col gap-3">
          <textarea
            readOnly
            value={text}
            rows={12}
            aria-label="Extracted text"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <CopyButton value={text} label="Copy text" />
            <button
              onClick={downloadText}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Download className="size-3.5" />
              Download .txt
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
