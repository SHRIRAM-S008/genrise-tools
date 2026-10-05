"use client";

import { useEffect, useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import { Download } from "lucide-react";

const PRESET = `> initializing connection...
> bypassing firewall [OK]
> injecting payload...
> access granted.
> downloading mainframe.dat [######################] 100%
> connection closed.`;

/** Base delays in ms at 1× speed. The slider scales them, so 2× halves them. */
const CHAR_DELAY_MIN = 15;
const CHAR_DELAY_JITTER = 25;
const LINE_DELAY = 120;

export default function HackerTerminalPage() {
  const [script, setScript] = useState(PRESET);
  const [output, setOutput] = useState("");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeoutRef = useRef<number | null>(null);
  // Read speed at each tick so changing the slider mid-playback takes effect right away.
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function play() {
    if (playing) return;
    setPlaying(true);
    setOutput("");
    let i = 0;

    function tick() {
      if (i >= script.length) {
        setPlaying(false);
        return;
      }
      setOutput((prev) => prev + script[i]);
      i++;
      const baseDelay = script[i - 1] === "\n" ? LINE_DELAY : CHAR_DELAY_MIN + Math.random() * CHAR_DELAY_JITTER;
      timeoutRef.current = window.setTimeout(tick, baseDelay / speedRef.current);
    }
    tick();
  }

  function stop() {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setPlaying(false);
  }

  function reset() {
    stop();
    setScript(PRESET);
    setOutput("");
  }

  function download() {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "terminal-output.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ToolLayout title="Fake Hacker Terminal" description="Play back any text as an animated hacker-style terminal typing effect.">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Script</span>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={6}
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
      </label>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Speed: {speed.toFixed(2)}×</span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Typing speed"
            className="w-48"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={play}
          disabled={playing}
          className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {playing ? "Playing…" : "Play"}
        </button>
        {playing && (
          <button onClick={stop} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
            Stop
          </button>
        )}
        <button
          onClick={reset}
          title="Stop playback, restore the default script, and clear the output"
          className="w-fit rounded-full border border-border px-6 py-3 font-medium hover:border-primary/40"
        >
          Reset
        </button>
      </div>

      <div className="min-h-64 whitespace-pre-wrap rounded-2xl border border-border bg-black p-5 font-mono text-sm text-green-400">
        {output}
        <span className="animate-pulse">▌</span>
      </div>

      {output && !playing && (
        <div className="flex flex-wrap gap-3">
          <CopyButton value={output} label="Copy output" />
          <button
            onClick={download}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Download className="size-3.5" />
            Download .txt
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
