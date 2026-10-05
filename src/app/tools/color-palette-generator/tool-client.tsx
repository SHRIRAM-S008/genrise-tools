"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Copy, Check } from "lucide-react";
import { extractPalette, type PaletteColor } from "@/lib/colorPalette";

/** WCAG relative luminance of an sRGB color. */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
function contrastRatio(a: PaletteColor, b: PaletteColor): number {
  const la = luminance(a.rgb);
  const lb = luminance(b.rgb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ColorPaletteGeneratorPage() {
  const [busy, setBusy] = useState(false);
  const [colors, setColors] = useState<PaletteColor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  const contrastPairs = useMemo(() => {
    if (!colors) return [];
    const pairs: { a: PaletteColor; b: PaletteColor; ratio: number }[] = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        pairs.push({ a: colors[i], b: colors[j], ratio: contrastRatio(colors[i], colors[j]) });
      }
    }
    return pairs.sort((x, y) => y.ratio - x.ratio);
  }, [colors]);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setColors(null);
    setClipboardError(null);
    try {
      const palette = await extractPalette(file);
      setColors(palette);
    } catch {
      setError("Couldn't read this image. Try a different file.");
    } finally {
      setBusy(false);
    }
  }

  async function copyHex(hex: string) {
    const ok = await copyToClipboard(hex);
    if (!ok) {
      setClipboardError("Couldn't access the clipboard. Select the code and copy it manually.");
      return;
    }
    setClipboardError(null);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  }

  async function copyFormat(key: string, text: string) {
    const ok = await copyToClipboard(text);
    if (!ok) {
      setClipboardError("Couldn't access the clipboard. Your browser may have blocked it.");
      return;
    }
    setClipboardError(null);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function exportText(format: "hex" | "css" | "scss" | "tailwind" | "json"): string {
    if (!colors) return "";
    switch (format) {
      case "hex":
        return colors.map((c) => c.hex).join(", ");
      case "css":
        return `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join("\n")}\n}`;
      case "scss":
        return colors.map((c, i) => `$color-${i + 1}: ${c.hex};`).join("\n");
      case "tailwind": {
        const entries = colors.map((c, i) => `        "palette-${i + 1}": "${c.hex}",`).join("\n");
        return `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${entries}\n      },\n    },\n  },\n};`;
      }
      case "json":
        return JSON.stringify(
          Object.fromEntries(colors.map((c, i) => [`color${i + 1}`, c.hex])),
          null,
          2
        );
    }
  }

  const exportButtons: { key: "hex" | "css" | "scss" | "tailwind" | "json"; label: string }[] = [
    { key: "hex", label: "Copy all hex codes" },
    { key: "css", label: "Copy as CSS variables" },
    { key: "scss", label: "Copy as SCSS" },
    { key: "tailwind", label: "Copy as Tailwind" },
    { key: "json", label: "Copy as JSON" },
  ];

  return (
    <ToolLayout title="Color Palette Generator" description="Extract a color palette from any image.">
      <FileDropzone
        accept="image/*"
        onFiles={(files) => handleFile(files[0])}
        label={busy ? "Analyzing…" : "Click or drop an image here"}
      />

      {error && <p className="text-destructive">{error}</p>}

      {colors && colors.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => copyHex(c.hex)}
                className="flex flex-col overflow-hidden rounded-lg border border-border text-left"
              >
                <div className="h-16 w-full" style={{ backgroundColor: c.hex }} />
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <span className="font-mono text-xs">{c.hex}</span>
                  {copiedHex === c.hex ? (
                    <Check className="size-3.5 text-primary" />
                  ) : (
                    <Copy className="size-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {exportButtons.map((b) => (
              <button
                key={b.key}
                onClick={() => copyFormat(b.key, exportText(b.key))}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
              >
                {copiedKey === b.key ? "Copied!" : b.label}
              </button>
            ))}
          </div>

          {clipboardError && <p className="text-sm text-destructive">{clipboardError}</p>}

          {contrastPairs.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
              <div>
                <p className="font-medium">Contrast pairs (WCAG)</p>
                <p className="text-sm text-muted-foreground">
                  AA needs 4.5:1 for normal text and 3:1 for large text. AAA needs 7:1.
                </p>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {contrastPairs.map(({ a, b, ratio }) => {
                  const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail";
                  return (
                    <li key={`${a.hex}-${b.hex}`} className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="size-4 rounded border border-border" style={{ backgroundColor: a.hex }} />
                        <span className="size-4 rounded border border-border" style={{ backgroundColor: b.hex }} />
                        <span className="font-mono text-xs">
                          {a.hex} / {b.hex}
                        </span>
                      </span>
                      <span className="font-mono">{ratio.toFixed(2)}:1</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          grade === "Fail" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {grade}
                      </span>
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: a.hex, color: b.hex }}
                      >
                        Sample text
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
