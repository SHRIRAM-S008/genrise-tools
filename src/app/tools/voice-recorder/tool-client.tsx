"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ToolLayout from "@/components/ToolLayout";
import DownloadButton from "@/components/DownloadButton";
import { formatBytes } from "@/lib/imageCore";
import { cachedFormats, NO_FORMATS, subscribeToFormats } from "@/lib/mediaRecording";
import { useObjectUrl } from "@/lib/useObjectUrl";

const MAX_DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "No limit" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 900, label: "15 minutes" },
  { value: 1800, label: "30 minutes" },
];

function formatClock(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/** Turns getUserMedia failures into a specific, actionable message. */
function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was denied. Allow microphone access for this site in your browser's permission settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found. Connect one, or pick a different input device, and try again.";
    case "NotReadableError":
      return "The microphone is in use by another app or couldn't be read. Close the other app and try again.";
    default:
      return "Couldn't start the microphone. Check your audio setup and try again.";
  }
}

export default function VoiceRecorderPage() {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; duration: number } | null>(null);
  const [formatIndex, setFormatIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [maxSeconds, setMaxSeconds] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const resultUrl = useObjectUrl(result?.blob ?? null);
  const formats = useSyncExternalStore(
    subscribeToFormats,
    () => cachedFormats("audio"),
    () => NO_FORMATS
  );
  const format = formats[formatIndex];

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput"));
    } catch {
      // Device listing is optional; the default input still works.
    }
  }

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((all) => {
        if (active) setDevices(all.filter((d) => d.kind === "audioinput"));
      })
      .catch(() => {
        // Device listing is optional; the default input still works.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    if (!recording || paused) return;
    const startedAt = Date.now() - elapsedRef.current * 1000;
    const id = window.setInterval(() => {
      const next = Math.floor((Date.now() - startedAt) / 1000);
      elapsedRef.current = next;
      setElapsed(next);
      if (maxSeconds > 0 && next >= maxSeconds && recorderRef.current?.state !== "inactive") {
        recorderRef.current?.stop();
        setRecording(false);
        setPaused(false);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [recording, paused, maxSeconds]);

  // Release the microphone if the user navigates away while recording.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  async function start() {
    setError(null);
    setResult(null);
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      // Labels only become available after permission is granted, so refresh now.
      void refreshDevices();

      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      function draw() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        analyser.getByteTimeDomainData(data);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(120,120,255,0.6)";
        const barWidth = canvas.width / data.length;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          const h = Math.abs(v) * canvas.height;
          ctx.fillRect(i * barWidth, canvas.height / 2 - h / 2, barWidth, h);
        }
        rafRef.current = requestAnimationFrame(draw);
      }
      draw();

      const recorder = new MediaRecorder(stream, format ? { mimeType: format.mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      const ctxToClose = audioCtx;
      const streamToStop = stream;
      recorder.onstop = () => {
        setResult({
          blob: new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }),
          duration: elapsedRef.current,
        });
        streamToStop.getTracks().forEach((t) => t.stop());
        void ctxToClose.close();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
      recorder.start();
      recorderRef.current = recorder;
      setElapsed(0);
      elapsedRef.current = 0;
      setPaused(false);
      setRecording(true);
    } catch (err) {
      // Release anything acquired before the failure so the mic light goes off.
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtx && audioCtx.state !== "closed") void audioCtx.close();
      setError(describeMicError(err));
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

  function discard() {
    setResult(null);
    setError(null);
  }

  const elapsedLabel = formatClock(elapsed);
  const extension = format?.extension ?? "webm";
  const limitReached = maxSeconds > 0 && recording;

  return (
    <ToolLayout title="Voice Recorder" description="Record audio from your microphone, pause as you go, and download it.">
      <canvas
        ref={canvasRef}
        width={640}
        height={120}
        role="img"
        aria-label="Live microphone input level"
        className="w-full rounded-lg bg-accent/30"
      />

      <div className="flex flex-wrap items-end gap-4">
        {devices.length > 1 && !recording && (
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Input device</span>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="max-w-xs rounded-lg border border-border px-3 py-2"
            >
              <option value="">Default</option>
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}

        {formats.length > 1 && !recording && (
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Format</span>
            <select
              value={formatIndex}
              onChange={(e) => setFormatIndex(Number(e.target.value))}
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

        {!recording && (
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Max duration</span>
            <select
              value={maxSeconds}
              onChange={(e) => setMaxSeconds(Number(e.target.value))}
              className="rounded-lg border border-border px-3 py-2"
            >
              {MAX_DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button onClick={start} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
            {result ? "Record again" : "Start Recording"}
          </button>
        ) : (
          <>
            <button onClick={stop} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
              Stop
            </button>
            <button onClick={togglePause} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
              {paused ? "Resume" : "Pause"}
            </button>
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className={`size-2 rounded-full bg-destructive ${paused ? "" : "animate-pulse"}`} />
              {paused ? "Paused" : "Recording"} {elapsedLabel}
              {limitReached && ` / ${formatClock(maxSeconds)}`}
            </span>
          </>
        )}
      </div>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
          {resultUrl && <audio controls src={resultUrl} className="w-full" />}
          <p className="text-sm text-muted-foreground">
            {formatClock(result.duration)} · {formatBytes(result.blob.size)}
          </p>
          <div className="flex flex-wrap gap-2">
            <DownloadButton blob={result.blob} filename={`recording.${extension}`} />
            <button
              type="button"
              onClick={discard}
              className="rounded-full border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
