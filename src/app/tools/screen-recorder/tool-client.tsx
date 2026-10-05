"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ToolLayout from "@/components/ToolLayout";
import DownloadButton from "@/components/DownloadButton";
import { formatBytes } from "@/lib/imageCore";
import { cachedFormats, NO_FORMATS, subscribeToFormats } from "@/lib/mediaRecording";
import { useObjectUrl } from "@/lib/useObjectUrl";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** e.g. screen-recording-2026-10-05-143012.webm */
function timestampedName(extension: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `screen-recording-${stamp}.${extension}`;
}

/** Maps getDisplayMedia / getUserMedia failures to messages the user can act on. */
function describeCaptureError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";
  switch (name) {
    case "NotAllowedError":
      return "Screen recording was blocked or cancelled. Allow screen sharing in the browser prompt, and check that the site has permission to capture the screen.";
    case "NotFoundError":
      return "No screen, window, or tab was available to capture. Make sure a display is connected and try again.";
    case "NotReadableError":
      return "The screen or microphone is in use by another app or is otherwise unreadable. Close the other app and try again.";
    case "AbortError":
      return "Screen recording was cancelled before it started.";
    default:
      return "Screen recording isn't available in this browser.";
  }
}

export default function ScreenRecorderPage() {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; duration: number } | null>(null);
  const [withMic, setWithMic] = useState(false);
  // MediaRecorder support can only be probed in the browser; the server
  // snapshot is empty, so hydration stays consistent.
  const formats = useSyncExternalStore(
    subscribeToFormats,
    () => cachedFormats("video"),
    () => NO_FORMATS
  );
  const [formatIndex, setFormatIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  // Mirrors elapsed so the recorder's onstop handler reads the latest value.
  const elapsedRef = useRef(0);

  const resultUrl = useObjectUrl(result?.blob ?? null);
  const format = formats[formatIndex];

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    if (!recording || paused) return;
    const startedAt = Date.now() - elapsedRef.current * 1000;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [recording, paused]);

  // Stop sharing the screen (and the mic) if the user navigates away.
  useEffect(
    () => () => {
      tracksRef.current.forEach((t) => t.stop());
    },
    []
  );

  function cleanup() {
    tracksRef.current.forEach((t) => t.stop());
    tracksRef.current = [];
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function start() {
    setError(null);
    setWarning(null);
    setResult(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const tracks = [...display.getTracks()];

      if (display.getAudioTracks().length === 0) {
        setWarning(
          "No system audio was shared, so the recording will be silent apart from your microphone. In the sharing prompt, pick a tab or the entire screen and enable its audio option."
        );
      }

      if (withMic) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          tracks.push(...mic.getAudioTracks());
        } catch {
          setWarning((prev) => `${prev ? `${prev} ` : ""}The microphone was unavailable, so it isn't included.`);
        }
      }

      const stream = new MediaStream(tracks);
      tracksRef.current = tracks;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, format ? { mimeType: format.mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "video/webm";
        setResult({
          blob: new Blob(chunksRef.current, { type: mimeType }),
          filename: timestampedName(format?.extension ?? "webm"),
          duration: elapsedRef.current,
        });
        cleanup();
      };

      // Clicking the browser's own "Stop sharing" bar ends the recording too.
      display.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorder.state !== "inactive") recorder.stop();
        setRecording(false);
        setPaused(false);
      });

      recorder.start();
      recorderRef.current = recorder;
      setElapsed(0);
      elapsedRef.current = 0;
      setPaused(false);
      setRecording(true);
    } catch (err) {
      setError(describeCaptureError(err));
      cleanup();
    }
  }

  function togglePause() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setPaused(false);
    }
  }

  function stop() {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    setRecording(false);
    setPaused(false);
  }

  const elapsedLabel = formatDuration(elapsed);

  return (
    <ToolLayout title="Screen Recorder" description="Record your screen — with system or microphone audio — entirely in your browser.">
      <video ref={videoRef} className="w-full rounded-lg bg-black" />

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withMic} onChange={(e) => setWithMic(e.target.checked)} disabled={recording} />
          Also record my microphone
        </label>

        {formats.length > 1 && (
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Format</span>
            <select
              value={formatIndex}
              onChange={(e) => setFormatIndex(Number(e.target.value))}
              disabled={recording}
              className="rounded-lg border border-border px-3 py-2"
            >
              {formats.map((f, i) => (
                <option key={f.mimeType} value={i}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button onClick={start} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
            Start Recording
          </button>
        ) : (
          <>
            <button onClick={togglePause} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={stop} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
              Stop
            </button>
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className={`size-2 rounded-full bg-destructive ${paused ? "" : "animate-pulse"}`} />
              {paused ? "Paused" : "Recording"} {elapsedLabel}
            </span>
          </>
        )}
      </div>

      {warning && (
        <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          {warning}
        </p>
      )}

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          {resultUrl && <video controls src={resultUrl} className="mb-4 w-full rounded-lg" />}
          <p className="mb-3 text-sm text-muted-foreground">
            Duration {formatDuration(result.duration)} · {formatBytes(result.blob.size)}
          </p>
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}
