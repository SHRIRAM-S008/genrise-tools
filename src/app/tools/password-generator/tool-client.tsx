"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import { randomInt, randomItem, shuffle } from "@/lib/random";

const CHARSETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const LABELS: Record<keyof typeof CHARSETS, string> = {
  upper: "Uppercase",
  lower: "Lowercase",
  numbers: "Numbers",
  symbols: "Symbols",
};

/** Strength buckets based on entropy in bits (length * log2(pool size)). */
function strengthOf(bits: number): { label: string; percent: number; bar: string } {
  if (bits < 40) return { label: "Weak", percent: 25, bar: "bg-destructive" };
  if (bits < 60) return { label: "Fair", percent: 50, bar: "bg-amber-500" };
  if (bits < 80) return { label: "Strong", percent: 75, bar: "bg-primary" };
  return { label: "Very strong", percent: 100, bar: "bg-primary" };
}

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ upper: true, lower: true, numbers: true, symbols: true });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const enabledKeys = (Object.keys(options) as (keyof typeof options)[]).filter((k) => options[k]);
  const poolSize = enabledKeys.reduce((sum, k) => sum + CHARSETS[k].length, 0);
  const entropyBits = poolSize > 0 ? length * Math.log2(poolSize) : 0;
  const strength = useMemo(() => strengthOf(entropyBits), [entropyBits]);

  function toggle(key: keyof typeof options) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    setError(null);
  }

  function generate() {
    if (!enabledKeys.length) {
      setError("Select at least one character type (uppercase, lowercase, numbers, or symbols) to generate a password.");
      return;
    }
    setError(null);

    const charset = enabledKeys.map((k) => CHARSETS[k]).join("");

    // One character from every enabled class first, so "include symbols"
    // actually guarantees a symbol, then fill the rest and shuffle.
    const picked = enabledKeys.slice(0, length).map((k) => randomItem(CHARSETS[k].split("")));
    while (picked.length < length) picked.push(charset[randomInt(charset.length)]);

    setPassword(shuffle(picked).join(""));
  }

  return (
    <ToolLayout title="Password Generator" description="Generate strong, secure passwords with custom rules.">
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground" htmlFor="length">
          Length: {length}
        </label>
        <input
          id="length"
          type="range"
          min={4}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="flex-1"
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {(Object.keys(CHARSETS) as (keyof typeof options)[]).map((key) => (
          <label key={key} className="flex items-center gap-2">
            <input type="checkbox" checked={options[key]} onChange={() => toggle(key)} />
            {LABELS[key]}
          </label>
        ))}
      </div>

      <div className="rounded-2xl border border-border p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Estimated strength</span>
          <span className="font-medium">
            {poolSize > 0 ? `${strength.label} · ${Math.round(entropyBits)} bits of entropy` : "No character types selected"}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={poolSize > 0 ? strength.percent : 0}>
          <div className={`h-full transition-all ${strength.bar}`} style={{ width: `${poolSize > 0 ? strength.percent : 0}%` }} />
        </div>
      </div>

      <button onClick={generate} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
        Generate
      </button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {password && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-5">
          <span className="break-all font-mono text-sm">{password}</span>
          <CopyButton value={password} label="Copy" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40" />
        </div>
      )}
    </ToolLayout>
  );
}
