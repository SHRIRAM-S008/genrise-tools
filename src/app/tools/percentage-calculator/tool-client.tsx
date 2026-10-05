"use client";

import { useState, type FormEvent } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border px-3 py-2"
      />
    </label>
  );
}

function num(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmt(n: number, digits = 4): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

type Result = { sentence: string } | { error: string } | null;

/** Shared result block: sentence + copy button, or an explanation when the inputs cannot produce an answer. */
function ResultLine({ result }: { result: Result }) {
  if (!result) return null;
  if ("error" in result) {
    return (
      <p role="alert" className="mt-3 text-sm text-destructive">
        {result.error}
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-lg font-semibold">{result.sentence}</p>
      <CopyButton value={result.sentence} label="Copy result" />
    </div>
  );
}

export default function PercentageCalculatorPage() {
  // Each section is a form so Enter submits; results show once submitted and update live afterwards.
  const [submitted, setSubmitted] = useState({ one: false, two: false, three: false });

  const [x1, setX1] = useState("");
  const [y1, setY1] = useState("");
  const [x2, setX2] = useState("");
  const [y2, setY2] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function submit(key: keyof typeof submitted) {
    return (e: FormEvent) => {
      e.preventDefault();
      setSubmitted((prev) => ({ ...prev, [key]: true }));
    };
  }

  let r1: Result = null;
  if (submitted.one) {
    const x = num(x1);
    const y = num(y1);
    if (x === null || y === null) r1 = { error: "Enter both a percentage and a number." };
    else r1 = { sentence: `${fmt(x)}% of ${fmt(y)} is ${fmt((x / 100) * y)}` };
  }

  let r2: Result = null;
  if (submitted.two) {
    const x = num(x2);
    const y = num(y2);
    if (x === null || y === null) r2 = { error: "Enter both values." };
    else if (y === 0) r2 = { error: "Cannot divide by zero: the base (Y) must be non-zero to express X as a percentage of it." };
    else r2 = { sentence: `${fmt(x)} is ${fmt((x / y) * 100, 2)}% of ${fmt(y)}` };
  }

  let r3: Result = null;
  if (submitted.three) {
    const a = num(from);
    const b = num(to);
    if (a === null || b === null) r3 = { error: "Enter both the starting and the new value." };
    else if (a === 0) r3 = { error: "Cannot calculate a percentage change from zero: the starting value (From) must be non-zero." };
    else {
      const pct = ((b - a) / a) * 100;
      const direction = pct > 0 ? "increase" : pct < 0 ? "decrease" : "no change";
      r3 = {
        sentence:
          pct === 0
            ? `${fmt(a)} to ${fmt(b)} is no change`
            : `${fmt(a)} to ${fmt(b)} is a ${direction} of ${fmt(Math.abs(pct), 2)}%`,
      };
    }
  }

  return (
    <ToolLayout title="Percentage Calculator" description="Calculate percentages, increase, decrease, and ratios.">
      <form onSubmit={submit("one")} className="rounded-2xl border border-border p-5">
        <h2 className="mb-3 font-medium">X% of Y</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="X (%)" value={x1} onChange={setX1} />
          <Field label="Y" value={y1} onChange={setY1} />
        </div>
        <button type="submit" className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40">
          Calculate
        </button>
        <ResultLine result={r1} />
      </form>

      <form onSubmit={submit("two")} className="rounded-2xl border border-border p-5">
        <h2 className="mb-3 font-medium">X is what % of Y</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="X" value={x2} onChange={setX2} />
          <Field label="Y" value={y2} onChange={setY2} />
        </div>
        <button type="submit" className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40">
          Calculate
        </button>
        <ResultLine result={r2} />
      </form>

      <form onSubmit={submit("three")} className="rounded-2xl border border-border p-5">
        <h2 className="mb-3 font-medium">% Increase / Decrease</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" value={from} onChange={setFrom} />
          <Field label="To" value={to} onChange={setTo} />
        </div>
        <button type="submit" className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40">
          Calculate
        </button>
        <ResultLine result={r3} />
      </form>
    </ToolLayout>
  );
}
