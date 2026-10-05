"use client";

import { useEffect, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { randomInt } from "@/lib/random";

const DICE_TYPES = [4, 6, 8, 10, 12, 20];
const MIN_COUNT = 1;
const MAX_COUNT = 20;
const HISTORY_LIMIT = 20;
const NOTATION_PATTERN = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i;

interface RollEntry {
  id: number;
  label: string;
  rolls: number[];
  modifier: number;
  total: number;
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_COUNT;
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(value)));
}

/** Parses notation such as "d20", "2d6" or "3d8+2". Returns null when it isn't valid. */
function parseNotation(text: string): { count: number; sides: number; modifier: number } | null {
  const match = NOTATION_PATTERN.exec(text);
  if (!match) return null;
  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3].replace(/\s+/g, "")) : 0;
  if (count < MIN_COUNT || count > MAX_COUNT) return null;
  if (sides < 2 || sides > 100) return null;
  return { count, sides, modifier };
}

export default function DiceRollerPage() {
  const [diceType, setDiceType] = useState(6);
  const [count, setCount] = useState(2);
  const [results, setResults] = useState<number[]>([]);
  const [modifier, setModifier] = useState(0);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [notation, setNotation] = useState("");
  const [notationError, setNotationError] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);
  const [coin, setCoin] = useState<"Heads" | "Tails" | null>(null);

  function record(label: string, rolls: number[], mod: number) {
    const entry: RollEntry = {
      id: nextId,
      label,
      rolls,
      modifier: mod,
      total: rolls.reduce((a, b) => a + b, 0) + mod,
    };
    setNextId((id) => id + 1);
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
  }

  function roll() {
    const rolls = Array.from({ length: count }, () => randomInt(diceType) + 1);
    setResults(rolls);
    setModifier(0);
    record(`${count}d${diceType}`, rolls, 0);
  }

  function rollNotation() {
    const parsed = parseNotation(notation);
    if (!parsed) {
      setNotationError(`Use a format like d20, 2d6 or 3d8+2 (1–${MAX_COUNT} dice, 2–100 sides).`);
      return;
    }
    const rolls = Array.from({ length: parsed.count }, () => randomInt(parsed.sides) + 1);
    const sign = parsed.modifier === 0 ? "" : parsed.modifier > 0 ? `+${parsed.modifier}` : `${parsed.modifier}`;
    setNotationError(null);
    setResults(rolls);
    setModifier(parsed.modifier);
    record(`${parsed.count}d${parsed.sides}${sign}`, rolls, parsed.modifier);
  }

  // Space rolls the dice, unless focus is on a control that already uses Space.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
      e.preventDefault();
      roll();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function flipCoin() {
    setCoin(randomInt(2) === 0 ? "Heads" : "Tails");
  }

  const resultTotal = results.reduce((a, b) => a + b, 0) + modifier;

  return (
    <ToolLayout title="Dice Roller & Coin Flip" description="Roll virtual dice or flip a coin with true randomness.">
      <div className="rounded-2xl border border-border p-5">
        <p className="mb-3 font-medium">Dice</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Dice type</span>
            <select
              value={diceType}
              onChange={(e) => setDiceType(Number(e.target.value))}
              className="rounded-lg border border-border px-3 py-2"
            >
              {DICE_TYPES.map((d) => (
                <option key={d} value={d}>
                  d{d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Count</span>
            <input
              type="number"
              min={MIN_COUNT}
              max={MAX_COUNT}
              value={count}
              onChange={(e) => setCount(clampCount(Number(e.target.value)))}
              className="w-24 rounded-lg border border-border px-3 py-2"
            />
          </label>
          <button onClick={roll} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
            Roll
          </button>
        </div>

        <form
          className="mt-4 flex flex-wrap items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            rollNotation();
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Or roll notation</span>
            <input
              value={notation}
              onChange={(e) => {
                setNotation(e.target.value);
                setNotationError(null);
              }}
              placeholder="e.g. 2d6+3"
              aria-invalid={Boolean(notationError)}
              className="w-40 rounded-lg border border-border px-3 py-2 font-mono text-sm"
            />
          </label>
          <button type="submit" disabled={!notation.trim()} className="mt-7 w-fit rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-primary/40 disabled:opacity-50">
            Roll notation
          </button>
          {notationError && <p className="mt-2 basis-full text-sm text-destructive">{notationError}</p>}
        </form>

        {results.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {results.map((r, i) => (
                <span key={i} className="flex size-10 items-center justify-center rounded-lg border border-border font-semibold">
                  {r}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Total: {resultTotal}
              {modifier !== 0 && ` (includes ${modifier > 0 ? "+" : ""}${modifier})`}
            </p>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">Tip: press Space to roll.</p>

        {history.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Roll history</p>
              <button onClick={() => setHistory([])} className="text-sm text-muted-foreground hover:text-destructive">
                Clear
              </button>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2 text-muted-foreground">
                  <span className="font-mono">{h.label}</span>
                  <span>
                    [{h.rolls.join(", ")}]
                    {h.modifier !== 0 && ` ${h.modifier > 0 ? "+" : ""}${h.modifier}`} = <span className="font-semibold text-foreground">{h.total}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border p-5">
        <p className="mb-3 font-medium">Coin flip</p>
        <button onClick={flipCoin} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
          Flip
        </button>
        {coin && <p className="mt-3 text-lg font-semibold">{coin}</p>}
      </div>
    </ToolLayout>
  );
}
