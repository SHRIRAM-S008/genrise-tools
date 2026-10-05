"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";
import { daysBetween, parseDateInput, todayInputValue } from "@/lib/dateInput";

function diff(birth: Date, asOf: Date) {
  let years = asOf.getFullYear() - birth.getFullYear();
  let months = asOf.getMonth() - birth.getMonth();
  let days = asOf.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = daysBetween(birth, asOf);

  // Next birthday: this year's occurrence, or next year's if it has already passed.
  let nextBirthday = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate());
  if (daysBetween(asOf, nextBirthday) < 0) {
    nextBirthday = new Date(asOf.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }
  const daysToNextBirthday = daysBetween(asOf, nextBirthday);

  return { years, months, days, totalDays, daysToNextBirthday };
}

export default function AgeCalculatorPage() {
  const [birthDate, setBirthDate] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayInputValue);

  const invalidRange = useMemo(() => {
    const birth = parseDateInput(birthDate);
    const asOf = parseDateInput(asOfDate);
    return Boolean(birth && asOf && birth > asOf);
  }, [birthDate, asOfDate]);

  const result = useMemo(() => {
    const birth = parseDateInput(birthDate);
    const asOf = parseDateInput(asOfDate);
    if (!birth || !asOf || birth > asOf) return null;
    return diff(birth, asOf);
  }, [birthDate, asOfDate]);

  const summaryText = result
    ? `${result.years} years, ${result.months} months, ${result.days} days (${result.totalDays.toLocaleString()} total days). ` +
      (result.daysToNextBirthday === 0
        ? "Birthday is today."
        : `Next birthday in ${result.daysToNextBirthday.toLocaleString()} days.`)
    : "";

  return (
    <ToolLayout title="Age Calculator" description="Calculate exact age in years, months, and days from a date.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Birth date
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            aria-invalid={invalidRange}
            className="rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          As of date
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            aria-invalid={invalidRange}
            className="rounded-lg border border-border px-3 py-2"
          />
        </label>
      </div>

      {invalidRange && (
        <p className="text-sm text-destructive">The birth date can&apos;t be after the as-of date.</p>
      )}

      {result && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <p className="text-lg font-semibold">
            {result.years} years, {result.months} months, {result.days} days
          </p>
          <p className="text-sm text-muted-foreground">{result.totalDays.toLocaleString()} total days</p>
          <p className="text-sm">
            {result.daysToNextBirthday === 0
              ? "Happy birthday! It's your birthday today."
              : `${result.daysToNextBirthday.toLocaleString()} days until the next birthday (turning ${result.years + 1}).`}
          </p>
          <div>
            <CopyButton value={summaryText} label="Copy as text" />
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
