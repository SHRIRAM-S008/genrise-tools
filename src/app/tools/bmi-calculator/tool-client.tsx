"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";

const LB_PER_KG = 1 / 0.45359237;

function category(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

type Calc =
  | { status: "empty"; message: string }
  | { status: "error"; message: string }
  | { status: "ok"; bmi: number; kg: number; meters: number };

export default function BmiCalculatorPage() {
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftin">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [heightCm, setHeightCm] = useState("170");
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("7");
  const [weight, setWeight] = useState("70");

  const calc = useMemo<Calc>(() => {
    const heightBlank = heightUnit === "cm" ? heightCm.trim() === "" : heightFt.trim() === "" && heightIn.trim() === "";
    if (heightBlank || weight.trim() === "") {
      return { status: "empty", message: "Enter your height and weight to see your BMI." };
    }

    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) return { status: "error", message: "Weight must be a positive number." };
    const kg = weightUnit === "kg" ? w : w / LB_PER_KG;
    if (kg < 2 || kg > 500) return { status: "error", message: "That weight looks unrealistic — check the value and unit." };

    let meters: number;
    if (heightUnit === "cm") {
      const cm = Number(heightCm);
      if (!Number.isFinite(cm) || cm <= 0) return { status: "error", message: "Height must be a positive number." };
      meters = cm / 100;
    } else {
      const ft = Number(heightFt || "0");
      const inch = Number(heightIn || "0");
      if (!Number.isFinite(ft) || !Number.isFinite(inch) || ft < 0 || inch < 0) {
        return { status: "error", message: "Height must be a positive number." };
      }
      if (inch >= 12) return { status: "error", message: "Inches must be between 0 and 11." };
      const totalIn = ft * 12 + inch;
      if (totalIn <= 0) return { status: "error", message: "Height must be a positive number." };
      meters = totalIn * 0.0254;
    }

    if (meters < 0.5 || meters > 2.7) {
      return { status: "error", message: "That height looks unrealistic — check the value and unit." };
    }

    return { status: "ok", bmi: kg / (meters * meters), kg, meters };
  }, [heightUnit, weightUnit, heightCm, heightFt, heightIn, weight]);

  // Healthy range is BMI 18.5–24.9 at the entered height, shown in the chosen weight unit.
  const healthyRange = useMemo(() => {
    if (calc.status !== "ok") return null;
    const toUnit = (kg: number) => (weightUnit === "kg" ? kg : kg * LB_PER_KG);
    const low = toUnit(18.5 * calc.meters * calc.meters);
    const high = toUnit(24.9 * calc.meters * calc.meters);
    return { low: low.toFixed(1), high: high.toFixed(1) };
  }, [calc, weightUnit]);

  const copyText =
    calc.status === "ok" && healthyRange
      ? `BMI ${calc.bmi.toFixed(1)} (${category(calc.bmi)}). Healthy weight at ${Math.round(calc.meters * 100)} cm: ${healthyRange.low}–${healthyRange.high} ${weightUnit}.`
      : "";

  return (
    <ToolLayout title="BMI Calculator" description="Calculate Body Mass Index from height and weight.">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setHeightUnit("cm")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${heightUnit === "cm" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          cm
        </button>
        <button
          onClick={() => setHeightUnit("ftin")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${heightUnit === "ftin" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          ft/in
        </button>
        <button
          onClick={() => setWeightUnit("kg")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${weightUnit === "kg" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          kg
        </button>
        <button
          onClick={() => setWeightUnit("lb")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${weightUnit === "lb" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          lb
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {heightUnit === "cm" ? (
          <label className="flex flex-col gap-1 text-sm">
            Height (cm)
            <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
          </label>
        ) : (
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Feet
              <input type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Inches
              <input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
            </label>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Weight ({weightUnit})
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
        </label>
      </div>

      {calc.status === "empty" && <p className="text-sm text-muted-foreground">{calc.message}</p>}
      {calc.status === "error" && <p className="text-sm text-destructive">{calc.message}</p>}

      {calc.status === "ok" && healthyRange && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <p className="text-lg font-semibold">BMI: {calc.bmi.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">{category(calc.bmi)}</p>
          <p className="text-sm">
            Healthy weight range at {Math.round(calc.meters * 100)} cm (BMI 18.5–24.9):{" "}
            <span className="font-medium">
              {healthyRange.low}–{healthyRange.high} {weightUnit}
            </span>
          </p>
          <div>
            <CopyButton value={copyText} label="Copy result" />
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
