"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import { parseCron, nextRunTimes, FIELD_NAMES } from "@/lib/cronParser";

const PRESETS: { label: string; expr: string }[] = [
  { label: "Every 5 minutes", expr: "*/5 * * * *" },
  { label: "Weekdays 9 AM–5 PM, hourly", expr: "0 9-17 * * 1-5" },
  { label: "Daily at midnight", expr: "0 0 * * *" },
];

/**
 * The parser only reports success or failure. To name the bad field, replace
 * each field with "*" in turn; the field whose wildcard makes the rest parse
 * is the one that was invalid.
 */
function findBadField(expr: string): string {
  const parts = expr.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    return `Expected 5 fields (minute hour day-of-month month day-of-week), found ${parts.length}.`;
  }
  for (let i = 0; i < parts.length; i++) {
    const probe = [...parts];
    probe[i] = "*";
    if (parseCron(probe.join(" "))) {
      return `The ${FIELD_NAMES[i]} field "${parts[i]}" isn't valid. Check its range and syntax.`;
    }
  }
  return "Couldn't parse this cron expression.";
}

export default function CronExplainerPage() {
  const [expr, setExpr] = useState("*/15 9-17 * * 1-5");

  const parsed = useMemo(() => parseCron(expr), [expr]);
  const nextRuns = useMemo(() => (parsed ? nextRunTimes(parsed, 5) : []), [parsed]);
  const error = useMemo(() => (!parsed && expr.trim() ? findBadField(expr) : null), [parsed, expr]);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  return (
    <ToolLayout title="Cron Expression Explainer" description="Turn a cron expression into plain English and see upcoming run times.">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.expr}
            onClick={() => setExpr(p.expr)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              expr.trim() === p.expr ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Cron expression</span>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="* * * * *"
          aria-invalid={Boolean(error)}
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
        <span className="text-xs text-muted-foreground">minute hour day-of-month month day-of-week</span>
      </label>

      {error && <p className="text-destructive">{error}</p>}

      {parsed && (
        <>
          <div className="rounded-2xl border border-border p-5">
            <p className="font-medium">{parsed.description}</p>
            <div className="mt-3">
              <CopyButton value={expr.trim()} label="Copy expression" />
            </div>
          </div>

          <div className="rounded-2xl border border-border p-5">
            <p className="mb-1 text-sm font-medium">Next 5 run times</p>
            <p className="mb-2 text-xs text-muted-foreground">Times shown in your timezone: {timeZone}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {nextRuns.map((d) => (
                <li key={d.getTime()} className="text-muted-foreground">
                  {d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}{" "}
                  <span className="text-xs">({timeZone})</span>
                </li>
              ))}
              {nextRuns.length === 0 && <li className="text-muted-foreground">No upcoming runs found.</li>}
            </ul>
          </div>
        </>
      )}
    </ToolLayout>
  );
}
