"use client";

import { useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { pdfToWord } from "@/lib/pdfToWord";

const PREVIEW_CHARS = 4000;

/** pdf.js tags its failures with a name; use it to say why the PDF could not be converted. */
function explainPdfError(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : "";
  if (name === "PasswordException") return "This PDF is password protected. Unlock it first, then try again.";
  if (name === "InvalidPDFException" || name === "MissingPDFException")
    return "This file doesn't look like a valid PDF. It may be corrupt.";
  return `Conversion failed${message ? ` (${message})` : ""}.`;
}

/** Reads the paragraphs back out of the generated .docx so the user can check the text before downloading. */
async function previewText(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(blob);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  return paragraphs.map((p) => p.textContent ?? "").join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setPreview(null);
    try {
      const output = await pdfToWord(file);
      setResult(output);
      setPreview(await previewText(output.blob).catch(() => ""));
    } catch (err) {
      setError(explainPdfError(err));
    } finally {
      setBusy(false);
    }
  }

  const emptyText = preview !== null && preview.trim().length < 20;

  return (
    <ToolLayout title="PDF to Word" description="Convert PDF pages into an editable Word document.">
      <FileDropzone
        accept="application/pdf"
        onFiles={(files) => {
          setFile(files[0]);
          setResult(null);
          setPreview(null);
          setError(null);
        }}
        label={file ? file.name : "Click or drop a PDF here"}
      />

      <p className="text-sm text-muted-foreground">
        This extracts the PDF&apos;s text into an editable .docx file. Complex layouts, images, and
        exact formatting are not preserved — text and page breaks are.
      </p>

      {file && (
        <button
          onClick={run}
          disabled={busy}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Converting…" : "Convert to Word"}
        </button>
      )}

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
          {preview !== null && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Text preview</p>
              {emptyText ? (
                <p className="text-sm text-muted-foreground">
                  Empty text? This PDF is probably a scan. Try{" "}
                  <Link href="/tools/ocr-text-extractor" className="font-medium text-primary underline">
                    OCR
                  </Link>{" "}
                  to read text from the page images.
                </p>
              ) : (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-accent/40 p-3 text-xs">
                  {preview.length > PREVIEW_CHARS ? `${preview.slice(0, PREVIEW_CHARS)}…` : preview}
                </pre>
              )}
            </div>
          )}
          <div>
            <DownloadButton blob={result.blob} filename={result.filename} />
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
