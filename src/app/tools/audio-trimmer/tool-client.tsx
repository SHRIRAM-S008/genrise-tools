"use client";

import { useEffect, useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { Pause, Play } from "lucide-react";
import { decodeAudioFile, drawWaveform, trimAudioBuffer, audioBufferToWav } from "@/lib/audioTrimmer";
import { formatBytes } from "@/lib/imageCore";
import { useObjectUrl } from "@/lib/useObjectUrl";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}

export default function AudioTrimmerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackRef = useRef<{ ctx: AudioContext; source: AudioBufferSourceNode } | null>(null);

  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [fade, setFade] = useState(0.02);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const resultUrl = useObjectUrl(result);

  useEffect(() => {
    if (buffer && canvasRef.current) drawWaveform(canvasRef.current, buffer, { startSec: start, endSec: end });
  }, [buffer, start, end]);

  useEffect(() => {
    return () => {
      playbackRef.current?.source.stop();
      void playbackRef.current?.ctx.close();
    };
  }, []);

  // Space toggles preview playback, unless focus is on a control that already uses Space.
  useEffect(() => {
    if (!buffer) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
      e.preventDefault();
      playSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const decoded = await decodeAudioFile(file);
      setBuffer(decoded);
      setStart(0);
      setEnd(decoded.duration);
    } catch {
      setError("Couldn't decode this audio file. Try MP3, WAV, M4A or OGG.");
    } finally {
      setBusy(false);
    }
  }

  function stopPlayback() {
    playbackRef.current?.source.stop();
    playbackRef.current = null;
    setPlaying(false);
  }

  /** Previews exactly the region that will be exported, fades included. */
  function playSelection() {
    if (!buffer) return;
    if (playing) {
      stopPlayback();
      return;
    }
    const clip = trimAudioBuffer(buffer, start, end, { fadeSec: fade });
    const ctx = new AudioContext();
    const source = ctx.createBufferSource();
    source.buffer = clip;
    source.connect(ctx.destination);
    source.onended = () => {
      void ctx.close();
      playbackRef.current = null;
      setPlaying(false);
    };
    source.start();
    playbackRef.current = { ctx, source };
    setPlaying(true);
  }

  function trim() {
    if (!buffer) return;
    stopPlayback();
    setResult(audioBufferToWav(trimAudioBuffer(buffer, start, end, { fadeSec: fade })));
  }

  const selectionLength = Math.max(0, end - start);

  return (
    <ToolLayout title="Audio Trimmer" description="Trim an audio file to the exact section you need, preview it, and export a WAV.">
      <FileDropzone accept="audio/*" onFiles={handleFiles} label="Click or drop an audio file here" />

      {busy && <p className="text-muted-foreground">Decoding…</p>}
      {error && <p className="text-destructive">{error}</p>}

      {buffer && (
        <div className="rounded-2xl border border-border p-5">
          <canvas ref={canvasRef} width={640} height={120} className="w-full rounded-lg bg-accent/30" />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-medium">Start: {formatTime(start)}</span>
              <input
                type="range"
                aria-label="Start time"
                min={0}
                max={buffer.duration}
                step={0.01}
                value={start}
                onChange={(e) => setStart(Math.min(Number(e.target.value), end - 0.05))}
              />
            </label>
            <label className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-medium">End: {formatTime(end)}</span>
              <input
                type="range"
                aria-label="End time"
                min={0}
                max={buffer.duration}
                step={0.01}
                value={end}
                onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 0.05))}
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Start (s)</span>
              <input
                type="number"
                min={0}
                max={buffer.duration}
                step={0.01}
                value={start.toFixed(2)}
                onChange={(e) => setStart(Math.max(0, Math.min(Number(e.target.value), end - 0.05)))}
                className="w-28 rounded-lg border border-border px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">End (s)</span>
              <input
                type="number"
                min={0}
                max={buffer.duration}
                step={0.01}
                value={end.toFixed(2)}
                onChange={(e) => setEnd(Math.min(buffer.duration, Math.max(Number(e.target.value), start + 0.05)))}
                className="w-28 rounded-lg border border-border px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Fade in/out: {Math.round(fade * 1000)}ms</span>
              <input type="range" aria-label="Fade in and out duration" min={0} max={0.5} step={0.01} value={fade} onChange={(e) => setFade(Number(e.target.value))} className="w-40" />
            </label>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Selection: {formatTime(selectionLength)} of {formatTime(buffer.duration)} ·{" "}
            {buffer.numberOfChannels === 1 ? "mono" : "stereo"} · {Math.round(buffer.sampleRate / 1000)} kHz
          </p>

          <p className="mt-3 text-xs text-muted-foreground">Tip: press Space to play or stop the selection.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={playSelection}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-primary/40"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {playing ? "Stop" : "Play selection"}
            </button>
            <button
              onClick={trim}
              disabled={selectionLength <= 0}
              className="w-fit rounded-full bg-primary px-6 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
            >
              Trim &amp; Export
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          {resultUrl && <audio controls src={resultUrl} className="mb-4 w-full" />}
          <p className="mb-3 text-sm text-muted-foreground">
            {formatTime(selectionLength)} · WAV · {formatBytes(result.size)}
          </p>
          <DownloadButton blob={result} filename="trimmed-audio.wav" />
        </div>
      )}
    </ToolLayout>
  );
}
