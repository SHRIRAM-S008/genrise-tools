"use client";

import { useEffect, useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import { convertUnit, unitOptions, type UnitCategory } from "@/lib/unitConverter";

const CATEGORIES: UnitCategory[] = [
  "length",
  "weight",
  "temperature",
  "area",
  "volume",
  "speed",
  "data",
  "time",
];

function isCategory(value: string | null): value is UnitCategory {
  return value !== null && (CATEGORIES as string[]).includes(value);
}

function formatNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function UnitConverterPage() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [from, setFrom] = useState(unitOptions.length[0]);
  const [to, setTo] = useState(unitOptions.length[1]);
  const [value, setValue] = useState("1");

  // Restore state from the URL once on mount, then mirror changes back to it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (!isCategory(cat)) return;
    const units = unitOptions[cat];
    const nextFrom = params.get("from");
    const nextTo = params.get("to");
    const nextValue = params.get("value");
    // One-time hydration from the URL: the URL is only readable on the client, so this can't be a lazy initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategory(cat);
    setFrom(nextFrom && units.includes(nextFrom) ? nextFrom : units[0]);
    setTo(nextTo && units.includes(nextTo) ? nextTo : units[1]);
    if (nextValue !== null && nextValue.trim() !== "") setValue(nextValue);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ category, from, to, value });
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [category, from, to, value]);

  function changeCategory(next: UnitCategory) {
    setCategory(next);
    setFrom(unitOptions[next][0]);
    setTo(unitOptions[next][1]);
  }

  const num = useMemo(() => {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [value]);

  const result = useMemo(() => {
    if (num === null) return null;
    const converted = convertUnit(category, num, from, to);
    return Number.isFinite(converted) ? converted : null;
  }, [category, from, to, num]);

  const resultText = result !== null ? `${value} ${from} = ${formatNumber(result)} ${to}` : "";

  return (
    <ToolLayout title="Unit Converter" description="Convert between length, weight, temperature, and more.">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => changeCategory(c)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
              category === c ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          Value
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          From
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border px-3 py-2">
            {unitOptions[category].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          To
          <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border px-3 py-2">
            {unitOptions[category].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
        >
          Swap units
        </button>
        {result !== null && <CopyButton value={resultText} label="Copy result" />}
      </div>

      {result !== null ? (
        <div className="rounded-2xl border border-border p-5">
          <p className="text-lg font-semibold">{resultText}</p>
        </div>
      ) : (
        value.trim() !== "" && <p className="text-sm text-destructive">Enter a valid number to convert.</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="border-b border-border px-4 py-2 text-left font-medium">
            All {category} units for {num === null ? "—" : `${value} ${from}`}
          </caption>
          <thead className="text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Unit</th>
              <th className="px-4 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {unitOptions[category].map((u) => {
              const converted = num === null ? Number.NaN : convertUnit(category, num, from, u);
              return (
                <tr
                  key={u}
                  className={`border-t border-border ${u === to ? "bg-accent/40 font-medium" : ""}`}
                >
                  <td className="px-4 py-2">{u}</td>
                  <td className="px-4 py-2 font-mono">{Number.isFinite(converted) ? formatNumber(converted) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ToolLayout>
  );
}
