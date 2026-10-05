"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { useLocalDraft } from "@/lib/useLocalDraft";
import { X, Printer } from "lucide-react";
import {
  calculateGpa,
  COURSE_WEIGHTS,
  SCALES,
  type Course,
  type CourseWeightId,
  type ScaleId,
} from "@/lib/gpa";

const STORAGE_KEY = "gpa-calculator-state";
const emptyCourse: Course = { name: "", credits: 3, letter: "A", weight: "regular" };

interface SavedState {
  scaleId: ScaleId;
  weighted: boolean;
  courses: Course[];
}

const DEFAULT_STATE: SavedState = { scaleId: "4.0", weighted: false, courses: [{ ...emptyCourse }] };

export default function GpaCalculatorPage() {
  // Saved to localStorage on every change, so a refresh keeps the courses.
  const { value: saved, setValue: setSaved } = useLocalDraft<SavedState>(STORAGE_KEY, DEFAULT_STATE);
  const scaleId: ScaleId = saved.scaleId === "4.3" ? "4.3" : "4.0";
  const weighted = saved.weighted === true;
  const courses: Course[] = Array.isArray(saved.courses) && saved.courses.length > 0 ? saved.courses : DEFAULT_STATE.courses;

  function setScaleId(next: ScaleId) {
    setSaved((prev) => ({ ...prev, scaleId: next }));
  }
  function setWeighted(next: boolean) {
    setSaved((prev) => ({ ...prev, weighted: next }));
  }
  function setCourses(next: Course[] | ((prev: Course[]) => Course[])) {
    setSaved((prev) => ({
      ...prev,
      courses: typeof next === "function" ? next(prev.courses) : next,
    }));
  }

  const [targetGpa, setTargetGpa] = useState("3.5");
  const [futureCredits, setFutureCredits] = useState("12");

  const result = useMemo(() => calculateGpa(courses, scaleId), [courses, scaleId]);
  const scale = SCALES[scaleId];
  const maxPoints = Math.max(...scale.map((g) => g.points));

  // Average grade points needed on upcoming credits to reach the target cumulative GPA.
  const target = useMemo(() => {
    const goal = Number(targetGpa);
    const future = Number(futureCredits);
    if (!targetGpa.trim() || !futureCredits.trim() || !Number.isFinite(goal) || !Number.isFinite(future) || future <= 0) {
      return { status: "idle" as const };
    }
    const totalCredits = result.totalCredits + future;
    const needed = (goal * totalCredits - result.qualityPoints) / future;
    if (needed > maxPoints) {
      return {
        status: "unreachable" as const,
        needed,
        message: `Reaching ${goal.toFixed(2)} would need an average of ${needed.toFixed(2)} on the remaining credits, which is above the top of the ${scaleId} scale.`,
      };
    }
    if (needed <= 0) {
      return { status: "met" as const, needed, message: `Any grades will keep you at or above ${goal.toFixed(2)}.` };
    }
    return {
      status: "ok" as const,
      needed,
      message: `You need an average of ${needed.toFixed(2)} on the next ${future} credits to finish at ${goal.toFixed(2)}.`,
    };
  }, [targetGpa, futureCredits, result, maxPoints, scaleId]);

  function update(index: number, patch: Partial<Course>) {
    setCourses((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  const inputClass = "rounded-lg border border-border px-3 py-2";

  return (
    <ToolLayout title="GPA Calculator" description="Calculate your GPA from letter grades, with credit hours and weighted courses.">
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Scale</span>
          <select value={scaleId} onChange={(e) => setScaleId(e.target.value as ScaleId)} className={inputClass}>
            <option value="4.0">4.0 (A+ = 4.0)</option>
            <option value="4.3">4.3 (A+ = 4.3)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} />
          Weighted courses (Honors / AP)
        </label>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
        >
          <Printer className="size-4" />
          Print
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {courses.map((course, i) => (
          <div
            key={i}
            className={`grid gap-2 ${weighted ? "grid-cols-[1fr_72px_84px_120px_auto]" : "grid-cols-[1fr_72px_84px_auto]"}`}
          >
            <input
              placeholder={`Course ${i + 1}`}
              value={course.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              step={0.5}
              aria-label={`Credits for course ${i + 1}`}
              value={course.credits}
              onChange={(e) => update(i, { credits: Number(e.target.value) })}
              className={inputClass}
            />
            <select
              aria-label={`Grade for course ${i + 1}`}
              value={course.letter}
              onChange={(e) => update(i, { letter: e.target.value })}
              className={inputClass}
            >
              {scale.map((g) => (
                <option key={g.letter} value={g.letter}>
                  {g.letter} ({g.points.toFixed(1)})
                </option>
              ))}
            </select>
            {weighted && (
              <select
                aria-label={`Course type for course ${i + 1}`}
                value={course.weight}
                onChange={(e) => update(i, { weight: e.target.value as CourseWeightId })}
                className={inputClass}
              >
                {COURSE_WEIGHTS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            )}
            <button
              aria-label={`Remove course ${i + 1}`}
              onClick={() => setCourses((prev) => prev.filter((_, j) => j !== i))}
              disabled={courses.length === 1}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30 print:hidden"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setCourses((prev) => [...prev, { ...emptyCourse }])}
          className="w-fit rounded-full border border-border px-4 py-2 text-sm print:hidden"
        >
          + Add course
        </button>
      </div>

      <dl className="grid w-fit grid-cols-[auto_auto] gap-x-8 gap-y-1 rounded-2xl border border-border p-5">
        <dt className="text-lg font-medium">GPA</dt>
        <dd className="text-right text-lg font-semibold">{result.gpa.toFixed(2)}</dd>
        {weighted && (
          <>
            <dt className="text-sm text-muted-foreground">Weighted GPA</dt>
            <dd className="text-right text-sm">{result.weightedGpa.toFixed(2)}</dd>
          </>
        )}
        <dt className="text-sm text-muted-foreground">Total credits</dt>
        <dd className="text-right text-sm">{result.totalCredits}</dd>
        <dt className="text-sm text-muted-foreground">Quality points</dt>
        <dd className="text-right text-sm">{result.qualityPoints.toFixed(1)}</dd>
      </dl>

      {result.totalCredits === 0 && (
        <p className="text-sm text-muted-foreground">Add credit hours to each course to get a GPA.</p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5 print:hidden">
        <p className="font-medium">What do I need?</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2 text-sm">
            Target GPA
            <input
              type="number"
              min={0}
              max={maxPoints}
              step={0.01}
              value={targetGpa}
              onChange={(e) => setTargetGpa(e.target.value)}
              className={`w-28 ${inputClass}`}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Credits left to take
            <input
              type="number"
              min={0}
              step={0.5}
              value={futureCredits}
              onChange={(e) => setFutureCredits(e.target.value)}
              className={`w-32 ${inputClass}`}
            />
          </label>
        </div>
        {target.status !== "idle" && (
          <p className={`text-sm ${target.status === "unreachable" ? "text-destructive" : "text-muted-foreground"}`}>
            {target.message}
          </p>
        )}
      </div>
    </ToolLayout>
  );
}
