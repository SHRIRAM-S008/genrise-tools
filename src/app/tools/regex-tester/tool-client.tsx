"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";

const MAX_HIGHLIGHTED = 1000;

type FlagKey = "i" | "m" | "s" | "u";
type Mode = "match" | "replace";

const FLAG_OPTIONS: { key: FlagKey; label: string; hint: string }[] = [
  { key: "i", label: "i", hint: "Ignore case" },
  { key: "m", label: "m", hint: "Multiline (^ and $ match each line)" },
  { key: "s", label: "s", hint: "Dot matches newlines" },
  { key: "u", label: "u", hint: "Unicode" },
];

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>({ i: false, m: false, s: false, u: false });
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("match");
  const [replacement, setReplacement] = useState("");

  const flagString = useMemo(
    () => FLAG_OPTIONS.filter((f) => flags[f.key]).map((f) => f.key).join("") + "g",
    [flags]
  );

  const { error, matches, total, highlighted } = useMemo(() => {
    if (!pattern) {
      return {
        error: null as string | null,
        matches: [] as RegExpMatchArray[],
        total: 0,
        highlighted: escapeHtml(text),
      };
    }

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flagString);
    } catch (err) {
      const message = err instanceof SyntaxError ? err.message : "Invalid regular expression.";
      return { error: message, matches: [] as RegExpMatchArray[], total: 0, highlighted: "" };
    }

    const found: RegExpMatchArray[] = [];
    let count = 0;
    let lastIndex = 0;
    const parts: string[] = [];

    for (const match of text.matchAll(regex)) {
      count++;
      if (found.length >= MAX_HIGHLIGHTED) continue;
      const start = match.index ?? 0;
      const end = start + match[0].length;

      // Zero-length matches (e.g. /^/gm or /\b/g) are real matches; they just
      // can't be highlighted, so count them and keep scanning.
      if (end > start) {
        parts.push(escapeHtml(text.slice(lastIndex, start)));
        parts.push(`<mark class="rounded bg-primary/30 text-inherit">${escapeHtml(match[0])}</mark>`);
        lastIndex = end;
      }
      found.push(match);
    }
    parts.push(escapeHtml(text.slice(lastIndex)));

    return { error: null, matches: found, total: count, highlighted: parts.join("") };
  }, [pattern, flagString, text]);

  const replaced = useMemo(() => {
    if (mode !== "replace" || !pattern || error) return "";
    try {
      return text.replace(new RegExp(pattern, flagString), replacement);
    } catch {
      return "";
    }
  }, [mode, pattern, flagString, text, replacement, error]);

  return (
    <ToolLayout title="Regex Tester" description="Test regular expressions against sample text with live match highlighting.">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Pattern</span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="\d+"
          aria-invalid={!!error}
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">Flags</span>
        {FLAG_OPTIONS.map((f) => (
          <label key={f.key} title={f.hint} className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={flags[f.key]}
              onChange={(e) => setFlags((prev) => ({ ...prev, [f.key]: e.target.checked }))}
            />
            <span className="font-mono">{f.label}</span>
          </label>
        ))}
      </div>

      <div role="group" aria-label="Mode" className="inline-flex w-fit rounded-full border border-border p-1 text-sm">
        {(["match", "replace"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 font-medium capitalize ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "replace" && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Replacement (use $1, $2 for groups, $&amp; for the match)</span>
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="$1"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Test string</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste text to test against…"
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-sm text-destructive">
          Invalid pattern: {error}
        </p>
      )}

      {!error && total > MAX_HIGHLIGHTED && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Found {total.toLocaleString()} matches. Only the first {MAX_HIGHLIGHTED.toLocaleString()} are highlighted and listed.
        </p>
      )}

      {!error && mode === "match" && text && (
        <div className="rounded-2xl border border-border p-5">
          <p className="mb-2 text-sm font-medium">Highlighted matches ({total.toLocaleString()})</p>
          <p
            className="whitespace-pre-wrap break-words font-mono text-sm"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      )}

      {!error && mode === "match" && matches.length > 0 && (
        <div className="rounded-2xl border border-border p-5">
          <p className="mb-2 text-sm font-medium">Capture groups</p>
          <ul className="flex flex-col gap-2 text-sm">
            {matches.map((m, i) => (
              <li key={i} className="rounded-lg border border-border px-3 py-2">
                <span className="mr-2 text-xs text-muted-foreground">@{m.index ?? 0}</span>
                <span className="font-mono">{m[0] === "" ? "(empty match)" : m[0]}</span>
                {m.length > 1 && (
                  <span className="ml-2 text-muted-foreground">
                    groups: {m.slice(1).map((g) => g ?? "—").join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!error && mode === "replace" && text && pattern && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <p className="text-sm font-medium">Result ({total.toLocaleString()} replacements)</p>
          <textarea
            value={replaced}
            readOnly
            rows={8}
            aria-label="Replacement result"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />
          <CopyButton value={replaced} label="Copy result" />
        </div>
      )}
    </ToolLayout>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
