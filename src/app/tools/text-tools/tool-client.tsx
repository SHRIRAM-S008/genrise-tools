"use client";

import { useMemo, useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import DownloadButton from "@/components/DownloadButton";
import {
  countStats,
  caseConverters,
  removeDuplicateLines,
  removeEmptyLines,
  removeExtraSpaces,
  reverseLines,
  sortLines,
} from "@/lib/textTools";

const HISTORY_LIMIT = 20;

export default function TextToolsPage() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const stats = useMemo(() => countStats(text), [text]);
  const txtBlob = useMemo(() => new Blob([text], { type: "text/plain;charset=utf-8" }), [text]);

  const matchCount = useMemo(() => (findText ? text.split(findText).length - 1 : 0), [text, findText]);

  /** Every transform is destructive, so keep the previous states around. */
  function commit(next: string) {
    if (next === text) return;
    setHistory((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), text]);
    setFuture([]);
    setText(next);
  }

  function undo() {
    if (!history.length) return;
    setFuture((prev) => [text, ...prev]);
    setText(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }

  function redo() {
    if (!future.length) return;
    setHistory((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), text]);
    setText(future[0]);
    setFuture(future.slice(1));
  }

  function clearAll() {
    commit("");
  }

  function replaceAll() {
    if (!findText || matchCount === 0) return;
    commit(text.split(findText).join(replaceText));
  }

  const actions: { label: string; run: (t: string) => string }[] = [
    { label: "UPPERCASE", run: caseConverters.upper },
    { label: "lowercase", run: caseConverters.lower },
    { label: "Title Case", run: caseConverters.title },
    { label: "Sentence case", run: caseConverters.sentence },
    { label: "Remove duplicate lines", run: removeDuplicateLines },
    { label: "Remove empty lines", run: removeEmptyLines },
    { label: "Remove extra spaces", run: removeExtraSpaces },
    { label: "Sort A→Z", run: (t) => sortLines(t, "asc") },
    { label: "Sort Z→A", run: (t) => sortLines(t, "desc") },
    { label: "Reverse line order", run: reverseLines },
  ];

  return (
    <ToolLayout title="Text Tools" description="Word counts, case conversion, and line cleanup — all client-side.">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Paste or type text here…"
        aria-label="Text to transform"
        className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
      />

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
        <span>{stats.sentences} sentences</span>
        <span>{stats.lines} lines</span>
        <span>{stats.readingTimeMinutes ? `~${stats.readingTimeMinutes} min read` : "—"}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => commit(a.run(text))}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium">Find and replace</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Find
            <input
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="w-56 rounded-lg border border-border px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Replace with
            <input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-56 rounded-lg border border-border px-3 py-2 font-mono text-sm"
            />
          </label>
          <button
            onClick={replaceAll}
            disabled={!findText || matchCount === 0}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-40"
          >
            Replace all
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {!findText ? "Enter text to find." : `${matchCount} match${matchCount === 1 ? "" : "es"} found (case-sensitive).`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={undo}
          disabled={!history.length}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-40"
        >
          <Undo2 className="size-3.5" />
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!future.length}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 disabled:opacity-40"
        >
          <Redo2 className="size-3.5" />
          Redo
        </button>
        <CopyButton value={text} label="Copy text" />
        <DownloadButton blob={txtBlob} filename="text.txt" label="Download .txt" />
        <button
          onClick={clearAll}
          disabled={!text}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </ToolLayout>
  );
}
