"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import { diffLines, type DiffLine, type DiffWord } from "@/lib/textDiff";

/** Normalises text for comparison only when the matching toggle is on. */
function normalize(text: string, ignoreWhitespace: boolean, ignoreCase: boolean): string {
  let out = text;
  if (ignoreWhitespace) {
    out = out
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n");
  }
  if (ignoreCase) out = out.toLowerCase();
  return out;
}

function WordSegments({ words }: { words: DiffWord[] }) {
  return (
    <>
      {words.map((w, i) =>
        w.changed ? (
          <mark key={i} className="rounded-sm bg-amber-300/60 px-0.5 text-inherit dark:bg-amber-500/40">
            {w.text}
          </mark>
        ) : (
          <span key={i}>{w.text}</span>
        )
      )}
    </>
  );
}

type NumberedLine = DiffLine & { leftNo: number | null; rightNo: number | null };

function numberLines(lines: DiffLine[]): NumberedLine[] {
  let left = 0;
  let right = 0;
  return lines.map((line) => {
    if (line.type === "same") {
      left++;
      right++;
      return { ...line, leftNo: left, rightNo: right };
    }
    if (line.type === "removed") {
      left++;
      return { ...line, leftNo: left, rightNo: null };
    }
    right++;
    return { ...line, leftNo: null, rightNo: right };
  });
}

export default function TextDiffCheckerPage() {
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  const diff = useMemo(
    () =>
      numberLines(
        diffLines(
          normalize(original, ignoreWhitespace, ignoreCase),
          normalize(changed, ignoreWhitespace, ignoreCase)
        )
      ),
    [original, changed, ignoreWhitespace, ignoreCase]
  );
  const added = diff.filter((l) => l.type === "added").length;
  const removed = diff.filter((l) => l.type === "removed").length;
  const hasInput = original !== "" || changed !== "";

  const plainDiff = useMemo(
    () => diff.map((l) => `${l.type === "added" ? "+" : l.type === "removed" ? "-" : " "} ${l.text}`).join("\n"),
    [diff]
  );

  return (
    <ToolLayout title="Text Diff Checker" description="Compare two blocks of text and highlight what changed, down to the word.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Original</span>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            rows={10}
            aria-label="Original text"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Changed</span>
          <textarea
            value={changed}
            onChange={(e) => setChanged(e.target.value)}
            rows={10}
            aria-label="Changed text"
            className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={ignoreWhitespace}
            onChange={(e) => setIgnoreWhitespace(e.target.checked)}
          />
          Ignore whitespace
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />
          Ignore case
        </label>
      </div>

      {hasInput && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-wrap gap-4 text-sm">
            <span className="text-emerald-700 dark:text-emerald-400">+{added} added</span>
            <span className="text-red-700 dark:text-red-400">-{removed} removed</span>
            <span className="text-muted-foreground">
              {added + removed === 0
                ? "The two texts are identical."
                : `${diff.length} lines compared · changed words are highlighted`}
            </span>
          </p>
          <CopyButton value={plainDiff} label="Copy diff" />
        </div>
      )}

      {hasInput && (
        <div className="overflow-x-auto rounded-2xl border border-border p-3 font-mono text-sm">
          {diff.map((line, i) => (
            <div
              key={i}
              className={
                line.type === "added"
                  ? "flex bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : line.type === "removed"
                    ? "flex bg-red-500/15 text-red-700 dark:text-red-400"
                    : "flex"
              }
            >
              <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground">
                {line.leftNo ?? ""}
              </span>
              <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground">
                {line.rightNo ?? ""}
              </span>
              <span className="mr-2 select-none text-muted-foreground">
                {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
              </span>
              <span className="whitespace-pre">
                {line.words ? <WordSegments words={line.words} /> : line.text || " "}
              </span>
            </div>
          ))}
        </div>
      )}
    </ToolLayout>
  );
}
