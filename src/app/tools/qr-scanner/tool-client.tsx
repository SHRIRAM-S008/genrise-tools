"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { CopyButton } from "@/components/copy-button";
import { CheckCircle2, Camera, ExternalLink } from "lucide-react";
import {
  decodeFromFile,
  decodeImageData,
  describeCameraError,
  describeScan,
  listCameras,
  requestCameraStream,
  type CameraFailure,
  type CameraOption,
  type ScanResult,
} from "@/lib/qrScanner";

type Mode = "image" | "camera";

/** Decode at roughly 10 frames per second; decoding every frame wastes CPU without finding codes faster. */
const DECODE_INTERVAL_MS = 100;
const HISTORY_LIMIT = 100;

type HistoryEntry = { text: string; kind: ScanResult["kind"]; scannedAt: string };

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

function toCsv(entries: HistoryEntry[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = entries.map((e) => [escape(e.scannedAt), escape(e.kind), escape(e.text)].join(","));
  return ["scanned_at,kind,content", ...rows].join("\n");
}

export default function QrScannerPage() {
  const [mode, setMode] = useState<Mode>("image");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<CameraFailure | null>(null);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDecodeRef = useRef(0);
  const decodingRef = useRef(false);

  // Never leave the camera running behind the user's back.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const historyCsv = useMemo(() => toCsv(history), [history]);
  const historyJson = useMemo(() => JSON.stringify(history, null, 2), [history]);
  const csvBlob = useMemo(() => new Blob([historyCsv], { type: "text/csv;charset=utf-8" }), [historyCsv]);
  const jsonBlob = useMemo(() => new Blob([historyJson], { type: "application/json" }), [historyJson]);

  function accept(text: string) {
    const scan = describeScan(text);
    setResult(scan);
    setHistory((prev) =>
      prev[0]?.text === text
        ? prev
        : [{ text, kind: scan.kind, scannedAt: new Date().toISOString() }, ...prev].slice(0, HISTORY_LIMIT)
    );
    setError(null);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const text = await decodeFromFile(file);
      if (text) accept(text);
      else setError("No QR code found in that image. Try a sharper photo, or crop closer to the code.");
    } catch {
      setError("Couldn't read that file. Try a PNG or JPG screenshot of the code.");
    } finally {
      setBusy(false);
    }
  }

  // Ctrl/Cmd+V with an image on the clipboard decodes it directly.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (isTypingTarget(e.target)) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      if (mode === "camera") {
        stopCamera();
        setMode("image");
      }
      void handleFile(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // handleFile and stopCamera only use state setters and refs, so re-binding per render is safe.
  });

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    decodingRef.current = false;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  async function startCamera(preferredDeviceId = deviceId) {
    setError(null);
    setCameraError(null);
    setResult(null);
    try {
      const stream = await requestCameraStream(preferredDeviceId || undefined);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play();

      // Device labels stay blank until permission is granted, so the picker
      // is only worth populating after a successful start.
      const available = await listCameras();
      setCameras(available);
      const active = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (active) setDeviceId(active);

      setScanning(true);
      lastDecodeRef.current = 0;
      tick();
    } catch (err) {
      setCameraError(describeCameraError(err));
      stopCamera();
    }
  }

  async function switchCamera(nextDeviceId: string) {
    setDeviceId(nextDeviceId);
    if (!scanning) return;
    stopCamera();
    await startCamera(nextDeviceId);
  }

  function tick() {
    // A decode is already in flight; its callback schedules the next frame.
    if (decodingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });

    if (!video || !canvas || !ctx || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const now = performance.now();
    if (now - lastDecodeRef.current < DECODE_INTERVAL_MS) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    lastDecodeRef.current = now;
    decodingRef.current = true;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    void decodeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas)
      .catch(() => null)
      .then((text) => {
        decodingRef.current = false;
        if (!streamRef.current) return;
        if (text) {
          accept(text);
          stopCamera();
        } else {
          rafRef.current = requestAnimationFrame(tick);
        }
      });
  }

  const previous = history.slice(1);

  return (
    <ToolLayout
      title="QR Code Scanner"
      description="Scan a QR code from your camera or an image file — decoded in your browser, never uploaded."
    >
      <div className="flex flex-wrap items-center gap-2">
        {(["image", "camera"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              if (m === "image") stopCamera();
              setMode(m);
              setError(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "border border-border"
            }`}
          >
            {m === "image" ? "Scan an image" : "Use my camera"}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">Tip: press Ctrl/Cmd+V to scan an image from your clipboard.</span>
      </div>

      {mode === "image" ? (
        <FileDropzone
          accept="image/*"
          onFiles={(files) => handleFile(files[0])}
          label={busy ? "Reading…" : "Click or drop a QR code image here"}
          hint="A screenshot or photo of the code — decoded on your device"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" />
            {scanning && (
              <span className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
            )}
            {!scanning && (
              <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                Camera preview
              </span>
            )}
          </div>

          {cameras.length > 1 && (
            <label className="flex w-fit flex-col gap-2 text-sm">
              <span className="font-medium">Camera</span>
              <select
                value={deviceId}
                onChange={(e) => void switchCamera(e.target.value)}
                className="rounded-lg border border-border px-3 py-2"
              >
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-wrap gap-3">
            {!scanning ? (
              <button
                onClick={() => void startCamera()}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
              >
                <Camera className="size-4" />
                Start camera
              </button>
            ) : (
              <button onClick={stopCamera} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
                Stop
              </button>
            )}
            {scanning && <span className="self-center text-sm text-muted-foreground">Point the camera at a QR code…</span>}
          </div>

          {cameraError && (
            <div className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">{cameraError.message}</p>
              {cameraError.hint && <p className="text-sm text-muted-foreground">{cameraError.hint}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void startCamera()}
                  className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
                >
                  Try again
                </button>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setMode("image");
                  }}
                  className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
                >
                  Scan an image instead
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {error && <p className="text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
          <p className="flex items-center gap-1.5 text-sm text-primary">
            <CheckCircle2 className="size-4" /> QR code decoded
          </p>

          {result.fields && result.fields.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              {result.fields.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="break-all">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-accent/40 p-3 text-xs">
            {result.text}
          </pre>

          <div className="flex flex-wrap gap-2">
            <CopyButton value={result.text} label="Copy content" />
            {result.href && (
              <a
                href={result.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
              >
                <ExternalLink className="size-3.5" />
                Open link
              </a>
            )}
          </div>

          {result.kind === "url" && (
            <p className="text-xs text-muted-foreground">
              Check the address before opening it — QR codes are a common way to disguise phishing links.
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Need to create one instead?{" "}
        <Link href="/tools/qr-code" className="text-primary underline underline-offset-2">
          Generate a free static QR code
        </Link>{" "}
        for a link, Wi-Fi network, or contact card.
      </p>

      {history.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Scan history (this session, {history.length})</span>
            <div className="flex flex-wrap gap-2">
              <DownloadButton blob={csvBlob} filename="qr-scan-history.csv" label="Export CSV" />
              <DownloadButton blob={jsonBlob} filename="qr-scan-history.json" label="Export JSON" />
            </div>
          </div>
          {previous.length > 0 && (
            <ul className="flex max-h-72 flex-col gap-1 overflow-auto">
              {previous.map((entry, i) => (
                <li
                  key={`${entry.scannedAt}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <span className="truncate font-mono text-xs">{entry.text}</span>
                  <CopyButton value={entry.text} label="Copy" className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
