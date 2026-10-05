"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import { randomInt } from "@/lib/random";

const COLORS = ["#f43f5e", "#f59e0b", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899", "#84cc16"];
const SPIN_MS = 4000;
const HISTORY_LIMIT = 50;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export default function RandomPickerWheelPage() {
  const [raw, setRaw] = useState("Pizza\nSushi\nTacos\nBurgers\nSalad");
  const [rotation, setRotation] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [removeWinners, setRemoveWinners] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  const options = useMemo(() => raw.split("\n").map((s) => s.trim()).filter(Boolean), [raw]);
  const sliceAngle = options.length ? 360 / options.length : 0;

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const gradient = useMemo(() => {
    if (!options.length) return "conic-gradient(#e5e7eb 0deg 360deg)";
    const stops = options.map((_, i) => {
      const color = COLORS[i % COLORS.length];
      return `${color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [options, sliceAngle]);

  function spin() {
    if (!options.length || spinning) return;
    setSpinning(true);
    setWinner(null);
    setAnimate(true);

    const winningIndex = randomInt(options.length);
    const targetSliceCenter = winningIndex * sliceAngle + sliceAngle / 2;
    // Land the winning slice under the pointer at the top (0deg).
    const current = ((rotation % 360) + 360) % 360;
    const delta = (360 - targetSliceCenter - current + 360 * 2) % 360;
    // Reduced motion: skip the spin animation and land on the result immediately.
    const duration = reducedMotion ? 0 : SPIN_MS;
    setRotation(rotation + (duration ? 5 * 360 : 0) + delta);

    timeoutRef.current = window.setTimeout(() => {
      const picked = options[winningIndex];
      setSpinning(false);
      setWinner(picked);
      setHistory((prev) => [picked, ...prev].slice(0, HISTORY_LIMIT));
      if (removeWinners) {
        // Keep the same visual angle, but without animating the wheel back to 0.
        setAnimate(false);
        setRotation(((rotation + delta) % 360 + 360) % 360);
        setRaw(options.filter((_, i) => i !== winningIndex).join("\n"));
      }
    }, duration);
  }

  // Space spins the wheel, unless the user is typing or focused on a control.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName))) return;
      e.preventDefault();
      spin();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <ToolLayout title="Random Picker Wheel" description="Spin a wheel to randomly pick from your list of options.">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Options (one per line)</span>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
      </label>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input type="checkbox" checked={removeWinners} onChange={(e) => setRemoveWinners(e.target.checked)} />
        Remove each winner from the list
      </label>

      <div className="flex flex-col items-center gap-6 py-4">
        <div className="relative size-64 sm:size-80">
          {/* One rotating layer holds both the slices and their labels, so a
              label always stays on top of its own colour. */}
          <div
            className="absolute inset-0 rounded-full border-4 border-border shadow-lg ease-out"
            style={{
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transitionProperty: animate ? "transform" : "none",
              transitionDuration: animate ? `${reducedMotion ? 0 : SPIN_MS}ms` : "0ms",
            }}
          >
            {options.map((opt, i) => {
              const angle = i * sliceAngle + sliceAngle / 2;
              return (
                <span
                  key={`${opt}-${i}`}
                  className="absolute left-1/2 top-1/2 max-w-[42%] origin-left truncate pl-6 text-xs font-medium text-white drop-shadow"
                  style={{ transform: `rotate(${angle - 90}deg)` }}
                >
                  {opt}
                </span>
              );
            })}
          </div>
          <div className="absolute -top-2 left-1/2 size-0 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-primary" />
        </div>

        <button
          onClick={spin}
          disabled={!options.length || spinning}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {spinning ? "Spinning…" : "Spin"}
        </button>
        <p className="text-xs text-muted-foreground">Tip: press Space to spin.</p>

        {winner && <p className="text-lg font-semibold">🎉 {winner}</p>}
        {!options.length && <p className="text-sm text-muted-foreground">Add at least one option to spin.</p>}
      </div>

      {history.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Winner history ({history.length})</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={history.join("\n")} label="Copy history" />
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  setWinner(null);
                }}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
              >
                Reset history
              </button>
            </div>
          </div>
          <ol className="flex flex-col gap-1 text-sm">
            {history.map((h, i) => (
              <li key={`${h}-${i}`} className="flex gap-3">
                <span className="w-8 text-right text-muted-foreground">{history.length - i}.</span>
                <span>{h}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </ToolLayout>
  );
}
