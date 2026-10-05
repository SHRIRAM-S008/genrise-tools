"use client";

import { useEffect, useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { useLocalDraft } from "@/lib/useLocalDraft";

interface Picked {
  hex: string;
  rgb: string;
}

interface Cursor extends Picked {
  x: number;
  y: number;
}

const HISTORY_KEY = "color-picker-history";
const HISTORY_LIMIT = 12;

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function isPicked(value: unknown): value is Picked {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Picked).hex === "string" &&
    typeof (value as Picked).rgb === "string"
  );
}

function readPixel(ctx: CanvasRenderingContext2D, x: number, y: number): Picked {
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
  return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, rgb: `rgb(${r}, ${g}, ${b})` };
}

export default function ColorPickerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [current, setCurrent] = useState<Picked | null>(null);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  const { value: storedHistory, setValue: setHistory, clearDraft: clearHistory } = useLocalDraft<Picked[]>(HISTORY_KEY, []);
  const history = storedHistory.filter(isPicked).slice(0, HISTORY_LIMIT);

  useEffect(() => {
    if (!file || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxWidth = 640;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const x = Math.floor(canvas.width / 2);
      const y = Math.floor(canvas.height / 2);
      setCursor({ x, y, ...readPixel(ctx, x, y) });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  function moveCursor(x: number, y: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setCursor({ x, y, ...readPixel(ctx, x, y) });
  }

  function commit(picked: Picked) {
    setCurrent(picked);
    setHistory((prev) => [picked, ...prev].slice(0, HISTORY_LIMIT));
  }

  function pick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    const picked = readPixel(ctx, x, y);
    setCursor({ x, y, ...picked });
    commit(picked);
  }

  function onCanvasKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !cursor) return;
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      moveCursor(
        Math.min(canvas.width - 1, Math.max(0, cursor.x + move[0])),
        Math.min(canvas.height - 1, Math.max(0, cursor.y + move[1]))
      );
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit({ hex: cursor.hex, rgb: cursor.rgb });
    }
  }

  function copy(key: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1500);
  }

  return (
    <ToolLayout title="Color Picker from Image" description="Upload an image and pick exact pixel colors with hex codes.">
      <FileDropzone accept="image/*" onFiles={(files) => setFile(files[0])} label={file ? file.name : "Click or drop an image here"} />

      {file && (
        <>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="img"
            aria-label="Image to pick colors from. Use arrow keys to move the cursor and Enter to pick."
            onClick={pick}
            onKeyDown={onCanvasKeyDown}
            className="max-w-full cursor-crosshair rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Keyboard: arrow keys move the cursor (hold Shift for 10px steps), Enter or Space picks the color.
            {cursor && (
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="size-3 rounded-sm border border-border" style={{ backgroundColor: cursor.hex }} />
                Cursor {cursor.x}, {cursor.y} · {cursor.hex}
              </span>
            )}
          </p>
        </>
      )}

      {current && (
        <div className="flex items-center gap-4 rounded-2xl border border-border p-5">
          <div className="size-12 shrink-0 rounded-lg border border-border" style={{ backgroundColor: current.hex }} />
          <div className="flex flex-col gap-1 text-sm">
            <button onClick={() => copy("hex", current.hex)} className="font-mono text-left hover:text-primary">
              {current.hex}
            </button>
            <button onClick={() => copy("rgb", current.rgb)} className="font-mono text-left text-muted-foreground hover:text-primary">
              {current.rgb}
            </button>
            <span className="h-4 text-xs text-primary" role="status">
              {copiedKey === "hex" && "Hex copied to clipboard"}
              {copiedKey === "rgb" && "RGB copied to clipboard"}
            </span>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">Recent picks</span>
            <button onClick={clearHistory} className="text-muted-foreground hover:text-destructive">
              Clear history
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((c, i) => (
              <button
                key={`${c.hex}-${i}`}
                onClick={() => copy(`history-${i}`, c.hex)}
                title={`Copy ${c.hex}`}
                aria-label={copiedKey === `history-${i}` ? `${c.hex} copied` : `Copy ${c.hex}`}
                className="size-8 rounded-full border border-border"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <span className="h-4 text-xs text-primary" role="status">
            {copiedKey?.startsWith("history-") && "Color copied to clipboard"}
          </span>
        </div>
      )}
    </ToolLayout>
  );
}
