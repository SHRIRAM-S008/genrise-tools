"use client";

import { useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { RotateCw, FlipHorizontal, FlipVertical, Undo2, RotateCcw } from "lucide-react";
import { applyRotateFlip, type RotateFlipState } from "@/lib/imageRotator";
import { useObjectUrl } from "@/lib/useObjectUrl";

const INITIAL: RotateFlipState = { rotation: 0, flipH: false, flipV: false };

function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "the file may be corrupt or in an unsupported format";
}

export default function ImageRotatorPage() {
  const [file, setFile] = useState<File | null>(null);
  // History stack of states; the last entry is the one currently applied.
  const [history, setHistory] = useState<RotateFlipState[]>([INITIAL]);
  const state = history[history.length - 1];
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const previewUrl = useObjectUrl(result?.blob);

  /** Renders `next` for `target`. Only the latest request may update the UI, and the history only advances on success. */
  async function render(target: File, next: RotateFlipState, nextHistory: RotateFlipState[]) {
    const id = ++requestRef.current;
    setBusy(true);
    setError(null);
    try {
      const output = await applyRotateFlip(target, next);
      if (id !== requestRef.current) return;
      setResult(output);
      setHistory(nextHistory);
    } catch (err) {
      if (id !== requestRef.current) return;
      setError(`Couldn't process ${target.name}: ${describeError(err)}.`);
    } finally {
      if (id === requestRef.current) setBusy(false);
    }
  }

  function transform(next: RotateFlipState) {
    if (!file) return;
    void render(file, next, [...history, next]);
  }

  function undo() {
    if (!file || history.length < 2) return;
    const previous = history.slice(0, -1);
    void render(file, previous[previous.length - 1], previous);
  }

  function reset() {
    if (!file) return;
    void render(file, INITIAL, [INITIAL]);
  }

  return (
    <ToolLayout title="Image Rotator" description="Rotate or flip images by 90, 180, or 270 degrees.">
      <FileDropzone
        accept="image/*"
        onFiles={(files) => {
          const picked = files[0];
          setFile(picked);
          setResult(null);
          setHistory([INITIAL]);
          void render(picked, INITIAL, [INITIAL]);
        }}
        label={file ? file.name : "Click or drop an image here"}
      />

      {file && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => transform({ ...state, rotation: ((state.rotation + 90) % 360) as RotateFlipState["rotation"] })}
              disabled={busy}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-50"
            >
              <RotateCw className="size-4" /> Rotate 90°
            </button>
            <button
              onClick={() => transform({ ...state, flipH: !state.flipH })}
              disabled={busy}
              aria-pressed={state.flipH}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 ${state.flipH ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40"}`}
            >
              <FlipHorizontal className="size-4" /> Flip horizontal
            </button>
            <button
              onClick={() => transform({ ...state, flipV: !state.flipV })}
              disabled={busy}
              aria-pressed={state.flipV}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 ${state.flipV ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40"}`}
            >
              <FlipVertical className="size-4" /> Flip vertical
            </button>
            <button
              onClick={undo}
              disabled={busy || history.length < 2}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-50"
            >
              <Undo2 className="size-4" /> Undo
            </button>
            <button
              onClick={reset}
              disabled={busy || history.length < 2}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-50"
            >
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {previewUrl && (
            <div className="rounded-2xl border border-border p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview" className="mx-auto max-h-96 rounded-lg" />
            </div>
          )}

          {busy && <p className="text-sm text-muted-foreground">Processing…</p>}

          {result && (
            <div className="rounded-2xl border border-border p-5">
              <DownloadButton blob={result.blob} filename={result.filename} />
            </div>
          )}
        </>
      )}
    </ToolLayout>
  );
}
