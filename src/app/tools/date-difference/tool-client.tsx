"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { daysBetween, parseDateInput } from "@/lib/dateInput";

export default function DateDifferencePage() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [inclusive, setInclusive] = useState(false);

  const missingDate = Boolean((start || end) && !(start && end));

  const result = useMemo(() => {
    const a = parseDateInput(start);
    const b = parseDateInput(end);
    if (!a || !b) return null;
    const earlier = a <= b ? a : b;
    const laterRaw = a <= b ? b : a;
    // Inclusive counts both endpoints, so the end date adds one more day.
    const later = inclusive
      ? new Date(laterRaw.getFullYear(), laterRaw.getMonth(), laterRaw.getDate() + 1)
      : laterRaw;

    const totalDays = daysBetween(earlier, later);

    let years = later.getFullYear() - earlier.getFullYear();
    let months = later.getMonth() - earlier.getMonth();
    let days = later.getDate() - earlier.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      totalDays,
      weeks: Math.floor(totalDays / 7),
      totalMonths: years * 12 + months,
      years,
      months,
      days,
    };
  }, [start, end, inclusive]);

  return (
    <ToolLayout title="Date Difference Calculator" description="Find the exact number of days, weeks, or months between dates.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Start date
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End date
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} />
        Include the end date (inclusive count)
      </label>

      {missingDate && <p className="text-sm text-destructive">Enter both a start and an end date to see the difference.</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          <p className="text-lg font-semibold">
            {result.years} years, {result.months} months, {result.days} days
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.totalDays.toLocaleString()} total days · {result.weeks.toLocaleString()} weeks ·{" "}
            {result.totalMonths.toLocaleString()} total months
          </p>
        </div>
      )}
    </ToolLayout>
  );
}
