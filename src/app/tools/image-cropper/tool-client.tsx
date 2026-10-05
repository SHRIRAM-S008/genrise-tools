"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { ImageResult } from "@/components/image-result";
import { RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import { cropImage, type CropRect } from "@/lib/imageCropper";
import { applyRotateFlip, type RotateFlipState } from "@/lib/imageRotator";
import { useObjectUrl } from "@/lib/useObjectUrl";

type Corner = "nw" | "ne" | "sw" | "se";
type Handle = Corner | "move" | "new";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

type FieldKey = "x" | "y" | "w" | "h";

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

const MIN_SIZE = 16;
const ORIENT_INITIAL: RotateFlipState = { rotation: 0, flipH: false, flipV: false };
const CORNER_LABEL: Record<Corner, string> = {
  nw: "top-left",
  ne: "top-right",
  sw: "bottom-left",
  se: "bottom-right",
};

export default function ImageCropperPage() {
  const [file, setFile] = useState<File | null>(null);
  // The working copy is the original with rotation and flips applied; it is what gets previewed and cropped.
  const [working, setWorking] = useState<File | null>(null);
  const [orient, setOrient] = useState<RotateFlipState>(ORIENT_INITIAL);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [display, setDisplay] = useState({ width: 0, height: 0 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, width: 0, height: 0 });
  // Text the user is typing into a numeric field; null means "show the live box values".
  const [draft, setDraft] = useState<Record<FieldKey, string> | null>(null);
  const [aspect, setAspect] = useState<string>("free");
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; origin: Box } | null>(null);

  const imageUrl = useObjectUrl(working);
  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

  const scaleX = display.width > 0 ? natural.width / display.width : 1;
  const scaleY = display.height > 0 ? natural.height / display.height : 1;
  const liveNatural: Record<FieldKey, number> = {
    x: Math.round(box.x * scaleX),
    y: Math.round(box.y * scaleY),
    w: Math.round(box.width * scaleX),
    h: Math.round(box.height * scaleY),
  };

  const measure = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.clientWidth) return;
    setDisplay((prev) => {
      if (prev.width === img.clientWidth && prev.height === img.clientHeight) return prev;
      // Keep the selection in the same *relative* spot when the layout changes.
      if (prev.width > 0) {
        const sx = img.clientWidth / prev.width;
        const sy = img.clientHeight / prev.height;
        setBox((b) => ({ x: b.x * sx, y: b.y * sy, width: b.width * sx, height: b.height * sy }));
      }
      return { width: img.clientWidth, height: img.clientHeight };
    });
  }, []);

  // The displayed size drives the pixel mapping, so track it across window
  // resizes and device rotation rather than measuring once on load.
  useEffect(() => {
    if (!imageUrl) return;
    const observer = new ResizeObserver(measure);
    const img = imgRef.current;
    if (img) observer.observe(img);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [imageUrl, measure]);

  function applyRatio(next: Box, anchorRight = false, anchorBottom = false): Box {
    if (!ratio) return next;
    const width = Math.max(MIN_SIZE, next.width);
    const height = width / ratio;
    return {
      x: anchorRight ? next.x + next.width - width : next.x,
      y: anchorBottom ? next.y + next.height - height : next.y,
      width,
      height,
    };
  }

  function clamp(next: Box): Box {
    const width = Math.min(next.width, display.width);
    const height = Math.min(next.height, display.height);
    return {
      width,
      height,
      x: Math.min(Math.max(0, next.x), display.width - width),
      y: Math.min(Math.max(0, next.y), display.height - height),
    };
  }

  function clampToArea(next: Box, areaW: number, areaH: number): Box {
    const width = Math.min(next.width, areaW);
    const height = Math.min(next.height, areaH);
    return {
      width,
      height,
      x: Math.min(Math.max(0, next.x), areaW - width),
      y: Math.min(Math.max(0, next.y), areaH - height),
    };
  }

  function onImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplay({ width: img.clientWidth, height: img.clientHeight });
    setDraft(null);
    const initial = {
      x: img.clientWidth * 0.1,
      y: img.clientHeight * 0.1,
      width: img.clientWidth * 0.8,
      height: img.clientHeight * 0.8,
    };
    setBox(ratio ? clampToArea(applyRatio(initial), img.clientWidth, img.clientHeight) : initial);
  }

  /** Resizes from one corner by (dx, dy) display pixels, keeping the opposite corner fixed. */
  function resizeFromCorner(corner: Corner, o: Box, dx: number, dy: number): Box {
    const east = corner === "ne" || corner === "se";
    const south = corner === "se" || corner === "sw";
    const width = Math.max(MIN_SIZE, east ? o.width + dx : o.width - dx);
    const height = Math.max(MIN_SIZE, south ? o.height + dy : o.height - dy);
    const next = {
      x: east ? o.x : o.x + (o.width - width),
      y: south ? o.y : o.y + (o.height - height),
      width,
      height,
    };
    return clamp(ratio ? applyRatio(next, !east, !south) : next);
  }

  /** Pointer position relative to the image box, whichever element was grabbed. */
  function pointerPosition(e: React.PointerEvent<HTMLElement>) {
    const rect = (containerRef.current ?? e.currentTarget).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrag(e: React.PointerEvent<HTMLElement>, handle: Handle) {
    e.preventDefault();
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pointerPosition(e);
    dragRef.current = { handle, startX: x, startY: y, origin: box };
    setDraft(null);
    if (handle === "new") setBox({ x, y, width: 0, height: 0 });
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = pointerPosition(e);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const o = drag.origin;

    if (drag.handle === "move") {
      setBox(clamp({ ...o, x: o.x + dx, y: o.y + dy }));
      return;
    }

    if (drag.handle === "new") {
      const rect = {
        x: Math.min(drag.startX, x),
        y: Math.min(drag.startY, y),
        width: Math.abs(x - drag.startX),
        height: Math.abs(y - drag.startY),
      };
      setBox(clamp(ratio ? applyRatio(rect) : rect));
      return;
    }

    setBox(resizeFromCorner(drag.handle, o, dx, dy));
  }

  function endDrag() {
    dragRef.current = null;
  }

  /** Arrow keys nudge by 1 natural-image pixel, or 10 with Shift. */
  function arrowDelta(e: KeyboardEvent<HTMLElement>): { dx: number; dy: number } | null {
    const step = e.shiftKey ? 10 : 1;
    const dxNat = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
    const dyNat = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
    if (!dxNat && !dyNat) return null;
    e.preventDefault();
    setDraft(null);
    return { dx: dxNat / scaleX, dy: dyNat / scaleY };
  }

  function onCornerKey(e: KeyboardEvent<HTMLElement>, corner: Corner) {
    const delta = arrowDelta(e);
    if (delta) setBox(resizeFromCorner(corner, box, delta.dx, delta.dy));
  }

  function onBoxKey(e: KeyboardEvent<HTMLElement>) {
    if (e.target !== e.currentTarget) return;
    const delta = arrowDelta(e);
    if (delta) setBox(clamp({ ...box, x: box.x + delta.dx, y: box.y + delta.dy }));
  }

  function changeAspect(id: string) {
    setAspect(id);
    const next = ASPECTS.find((a) => a.id === id)?.ratio ?? null;
    if (!next || !display.width) return;
    const width = Math.min(box.width, display.width);
    setBox(clamp({ ...box, width, height: width / next }));
  }

  /** Numeric fields work in natural image pixels and keep what the user typed until they leave the field. */
  function setField(key: FieldKey, value: string) {
    const base = draft ?? { x: String(liveNatural.x), y: String(liveNatural.y), w: String(liveNatural.w), h: String(liveNatural.h) };
    setDraft({ ...base, [key]: value });
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n) || n < 0) return;

    const next = { ...box };
    if (key === "x") next.x = n / scaleX;
    if (key === "y") next.y = n / scaleY;
    if (key === "w") {
      next.width = n / scaleX;
      if (ratio) next.height = next.width / ratio;
    }
    if (key === "h") {
      next.height = n / scaleY;
      if (ratio) next.width = next.height * ratio;
    }
    setBox(clamp(next));
  }

  async function orientTo(next: RotateFlipState) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const out = await applyRotateFlip(file, next);
      setWorking(new File([out.blob], file.name, { type: out.blob.type || file.type }));
      setOrient(next);
      setResult(null);
    } catch (err) {
      setError(`Couldn't rotate or flip ${file.name}: ${err instanceof Error && err.message ? err.message : "unsupported image"}.`);
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!working || !display.width || box.width < 1 || box.height < 1) return;
    setError(null);
    setBusy(true);
    const rect: CropRect = {
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
    };
    try {
      setResult(await cropImage(working, rect));
      setCropSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    } catch (err) {
      setError(`Couldn't crop ${working.name}: ${err instanceof Error && err.message ? err.message : "try a different file"}.`);
    } finally {
      setBusy(false);
    }
  }

  const handleClass =
    "absolute size-4 rounded-full border-2 border-primary bg-background shadow-sm touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const fieldClass = "w-24 rounded-lg border border-border px-2 py-1.5 text-sm tabular-nums disabled:opacity-50";
  const fieldValue = (key: FieldKey) => draft?.[key] ?? String(liveNatural[key]);
  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40"
    }`;

  return (
    <ToolLayout title="Image Cropper" description="Crop images to any dimension or a fixed aspect ratio, right in your browser.">
      <FileDropzone
        accept="image/*"
        onFiles={(files) => {
          setFile(files[0]);
          setWorking(files[0]);
          setOrient(ORIENT_INITIAL);
          setResult(null);
          setError(null);
        }}
        label={file ? file.name : "Click or drop an image here"}
      />

      {imageUrl && (
        <>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <button key={a.id} onClick={() => changeAspect(a.id)} aria-pressed={aspect === a.id} className={pill(aspect === a.id)}>
                {a.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => orientTo({ ...orient, rotation: ((orient.rotation + 90) % 360) as RotateFlipState["rotation"] })} disabled={busy} className={pill(false)}>
              <RotateCw className="size-4" /> Rotate 90°
            </button>
            <button onClick={() => orientTo({ ...orient, flipH: !orient.flipH })} disabled={busy} aria-pressed={orient.flipH} className={pill(orient.flipH)}>
              <FlipHorizontal className="size-4" /> Flip horizontal
            </button>
            <button onClick={() => orientTo({ ...orient, flipV: !orient.flipV })} disabled={busy} aria-pressed={orient.flipV} className={pill(orient.flipV)}>
              <FlipVertical className="size-4" /> Flip vertical
            </button>
          </div>

          <div
            ref={containerRef}
            className="relative w-fit touch-none select-none overflow-hidden rounded-lg"
            onPointerDown={(e) => startDrag(e, "new")}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="To crop"
              onLoad={onImageLoad}
              className="max-h-[28rem] max-w-full rounded-lg"
              draggable={false}
            />

            {box.width > 0 && (
              <div
                tabIndex={0}
                role="group"
                aria-label="Crop area. Arrow keys move it; Shift moves 10 pixels."
                onKeyDown={onBoxKey}
                className="absolute cursor-move border-2 border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                  // Darkens everything outside the selection in one go.
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.3) 1px, transparent 1px)",
                  backgroundSize: `${box.width / 3}px ${box.height / 3}px`,
                }}
                onPointerDown={(e) => startDrag(e, "move")}
              >
                {(Object.keys(CORNER_LABEL) as Corner[]).map((corner) => {
                  const pos = {
                    nw: "-left-2 -top-2 cursor-nwse-resize",
                    ne: "-right-2 -top-2 cursor-nesw-resize",
                    sw: "-bottom-2 -left-2 cursor-nesw-resize",
                    se: "-bottom-2 -right-2 cursor-nwse-resize",
                  }[corner];
                  return (
                    <span
                      key={corner}
                      tabIndex={0}
                      role="button"
                      aria-label={`Resize ${CORNER_LABEL[corner]} corner. Arrow keys resize; Shift moves 10 pixels.`}
                      onKeyDown={(e) => onCornerKey(e, corner)}
                      className={`${handleClass} ${pos}`}
                      onPointerDown={(e) => startDrag(e, corner)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3 text-sm">
            {(
              [
                ["x", "X"],
                ["y", "Y"],
                ["w", "Width"],
                ["h", "Height"],
              ] as [FieldKey, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-muted-foreground">{label} (px)</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={fieldValue(key)}
                  disabled={!display.width}
                  onChange={(e) => setField(key, e.target.value)}
                  onBlur={() => setDraft(null)}
                  className={fieldClass}
                />
              </label>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Drag inside the box to move it, the corners to resize, or anywhere on the image to draw a new selection.
            Keyboard: Tab to a corner or the box, then arrow keys (Shift for 10px).
            {display.width > 0 && box.width > 0 ? ` · crop: ${liveNatural.w} × ${liveNatural.h}px` : ""}
          </p>
        </>
      )}

      {file && (
        <button
          onClick={run}
          disabled={box.width < 1 || busy}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Working…" : "Crop"}
        </button>
      )}

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && <ImageResult blob={result.blob} filename={result.filename} dimensions={cropSize ?? undefined} />}
    </ToolLayout>
  );
}
