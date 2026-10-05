"use client";

import { useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { videoToGif, readVideoDuration } from "@/lib/videoToGif";
import { formatBytes } from "@/lib/imageCore";
import { useObjectUrl } from "@/lib/useObjectUrl";

const WIDTHS = [320, 480, 640];
const MAX_CLIP_SEC = 15;
const MAX_FRAMES = 150;

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export default function VideoToGifPage() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [clipSec, setClipSec] = useState(5);
  const [fps, setFps] = useState(8);
  const [maxWidth, setMaxWidth] = useState(480);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ stage: "capturing" | "encoding"; ratio: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const resultUrl = useObjectUrl(result);
  const sourceUrl = useObjectUrl(file);

  async function pick(selected: File) {
    setFile(selected);
    setResult(null);
    setError(null);
    setStartSec(0);
    setSelectionEnd(null);
    setVideoSize(null);
    try {
      const seconds = await readVideoDuration(selected);
      setDuration(seconds);
      setClipSec(Math.min(5, Math.max(1, Math.floor(seconds))));
    } catch {
      setDuration(0);
      setError("Couldn't read that video. Try a different file.");
    }
  }

  function seekPreview(time: number) {
    if (previewRef.current) previewRef.current.currentTime = time;
  }

  function playSelection() {
    const video = previewRef.current;
    if (!video) return;
    const end = Math.min(duration, startSec + clipSec);
    video.currentTime = startSec;
    setSelectionEnd(end);
    void video.play();
  }

  function cancel() {
    abortRef.current?.abort();
  }

  async function run() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ stage: "capturing", ratio: 0 });

    const cancelled = new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Conversion cancelled.", "AbortError")),
        { once: true }
      );
    });
    cancelled.catch(() => {});

    try {
      const blob = await Promise.race([
        videoToGif(file, {
          fps,
          maxWidth,
          startSec,
          durationSec: clipSec,
          onProgress: (stage, ratio) => {
            if (controller.signal.aborted) {
              // Throwing stops frame capture. Encoding runs in workers that can't be stopped, so it is ignored instead.
              if (stage === "capturing") throw new DOMException("Conversion cancelled.", "AbortError");
              return;
            }
            setProgress({ stage, ratio });
          },
        }),
        cancelled,
      ]);
      setResult(blob);
    } catch (err) {
      setError(isAbortError(err) ? "Conversion cancelled." : "Couldn't convert this video. Try a shorter clip or a smaller size.");
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  const frameCount = Math.min(MAX_FRAMES, Math.max(1, Math.floor(clipSec * fps)));
  const outWidth = videoSize ? Math.max(1, Math.round(videoSize.width * Math.min(1, maxWidth / videoSize.width))) : null;
  const outHeight = videoSize && outWidth ? Math.max(1, Math.round((outWidth * videoSize.height) / videoSize.width)) : null;
  const overallPercent = progress
    ? Math.round((progress.stage === "capturing" ? progress.ratio * 0.5 : 0.5 + progress.ratio * 0.5) * 100)
    : 0;
  const clipMaxSec = Math.max(1, Math.min(MAX_CLIP_SEC, Math.floor(duration - startSec) || 1));

  return (
    <ToolLayout title="Video to GIF Converter" description="Convert part of a video clip into an animated GIF.">
      <FileDropzone
        accept="video/*"
        onFiles={(files) => pick(files[0])}
        label={file ? file.name : "Click or drop a video here"}
        hint="Pick the exact section and size below"
      />

      {file && duration > 0 && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
            {sourceUrl && (
              <video
                ref={previewRef}
                src={sourceUrl}
                controls
                muted
                preload="metadata"
                onLoadedMetadata={(e) =>
                  setVideoSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
                }
                onTimeUpdate={(e) => {
                  if (selectionEnd !== null && e.currentTarget.currentTime >= selectionEnd) {
                    e.currentTarget.pause();
                    setSelectionEnd(null);
                  }
                }}
                className="w-full rounded-lg bg-black"
              />
            )}

            <div className="relative h-3 w-full rounded-full bg-border" aria-hidden="true">
              <div
                className="absolute inset-y-0 rounded-full bg-primary/50"
                style={{
                  left: `${(startSec / duration) * 100}%`,
                  width: `${(Math.min(clipSec, duration - startSec) / duration) * 100}%`,
                }}
              />
              <span
                className="absolute -top-1 h-5 w-0.5 bg-primary"
                style={{ left: `${(startSec / duration) * 100}%` }}
                title={`Start ${startSec.toFixed(1)}s`}
              />
              <span
                className="absolute -top-1 h-5 w-0.5 bg-destructive"
                style={{ left: `${Math.min(100, ((startSec + clipSec) / duration) * 100)}%` }}
                title={`End ${(startSec + clipSec).toFixed(1)}s`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Selection {startSec.toFixed(1)}s – {Math.min(duration, startSec + clipSec).toFixed(1)}s of{" "}
                {duration.toFixed(1)}s
              </span>
              <button
                type="button"
                onClick={playSelection}
                disabled={busy}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
              >
                Play selection
              </button>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Start at: {startSec.toFixed(1)}s</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, duration - 1)}
                step={0.1}
                value={startSec}
                disabled={busy}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setStartSec(next);
                  setSelectionEnd(null);
                  seekPreview(next);
                }}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Clip length: {clipSec}s</span>
              <input
                type="range"
                min={1}
                max={clipMaxSec}
                value={Math.min(clipSec, clipMaxSec)}
                disabled={busy}
                onChange={(e) => setClipSec(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Frames per second: {fps}</span>
              <input type="range" min={2} max={20} value={fps} disabled={busy} onChange={(e) => setFps(Number(e.target.value))} className="w-40" />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Width</span>
              <div className="flex gap-2">
                {WIDTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setMaxWidth(w)}
                    disabled={busy}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      maxWidth === w ? "bg-primary text-primary-foreground" : "border border-border"
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {frameCount} frames
            {outWidth && outHeight ? ` at ${outWidth}×${outHeight}px` : ""} · video is {duration.toFixed(1)}s long. Fewer
            frames and a smaller width mean a much smaller GIF.
          </p>
        </>
      )}

      {file && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={run}
            disabled={busy}
            className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Converting…" : "Convert to GIF"}
          </button>
          {busy && (
            <button
              type="button"
              onClick={cancel}
              className="w-fit rounded-full border border-border px-6 py-3 font-medium hover:border-destructive/40 hover:text-destructive"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {busy && progress && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progress.stage === "capturing" ? "Capturing frames" : "Encoding GIF"}</span>
            <span>{overallPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="GIF conversion progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallPercent}
            className="h-2 w-full overflow-hidden rounded-full bg-border"
          >
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${overallPercent}%` }} />
          </div>
        </div>
      )}

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-border p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {resultUrl && <img src={resultUrl} alt="Generated GIF" className="max-w-full rounded-lg" />}
          <p className="text-sm text-muted-foreground">
            {formatBytes(result.size)}
            {outWidth && outHeight ? ` · ${outWidth}×${outHeight}px` : ""} · {frameCount} frames at {fps} fps
          </p>
          <DownloadButton blob={result} filename="converted.gif" />
        </div>
      )}
    </ToolLayout>
  );
}
