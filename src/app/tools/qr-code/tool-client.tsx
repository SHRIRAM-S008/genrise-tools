"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ToolLayout from "@/components/ToolLayout";
import DownloadButton from "@/components/DownloadButton";
import { CopyButton } from "@/components/copy-button";
import { generateQrPngBlob, generateQrSvgString, type QrOptions } from "@/lib/qrCode";
import {
  buildEmailPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildVCardPayload,
  buildWifiPayload,
  CONTENT_TYPES,
  normalizeUrl,
  type QrContentType,
  type WifiPayload,
} from "@/lib/qrPayload";
import { useObjectUrl } from "@/lib/useObjectUrl";

type ErrorLevel = NonNullable<QrOptions["errorCorrection"]>;

const ERROR_LEVELS: { id: ErrorLevel; label: string; hint: string }[] = [
  { id: "L", label: "L", hint: "7% recoverable — smallest code" },
  { id: "M", label: "M", hint: "15% recoverable — good default" },
  { id: "Q", label: "Q", hint: "25% recoverable" },
  { id: "H", label: "H", hint: "30% recoverable — best for print or logos" },
];

const MIN_SIZE = 128;
const MAX_SIZE = 2048;
const DEBOUNCE_MS = 400;
/** WCAG AA threshold for graphics; scanners are most reliable at high contrast. */
const MIN_CONTRAST = 4.5;

const inputClass = "rounded-lg border border-border px-3 py-2";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, or null if either isn't a 6-digit hex. */
function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export default function QrCodePage() {
  const [type, setType] = useState<QrContentType>("url");

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState<WifiPayload>({ ssid: "", password: "", encryption: "WPA", hidden: false });
  const [card, setCard] = useState({
    firstName: "",
    lastName: "",
    organization: "",
    title: "",
    phone: "",
    email: "",
    website: "",
  });
  const [email, setEmail] = useState({ to: "", subject: "", body: "" });
  const [sms, setSms] = useState({ number: "", message: "" });
  const [phone, setPhone] = useState("");

  const [size, setSize] = useState(512);
  const [color, setColor] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const [errorCorrection, setErrorCorrection] = useState<ErrorLevel>("M");

  const [png, setPng] = useState<Blob | null>(null);
  const [svg, setSvg] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useObjectUrl(png);

  const payload = useMemo(() => {
    switch (type) {
      case "url":
        return normalizeUrl(url);
      case "text":
        return text;
      case "wifi":
        return wifi.ssid ? buildWifiPayload(wifi) : "";
      case "vcard":
        return card.firstName || card.lastName || card.phone || card.email ? buildVCardPayload(card) : "";
      case "email":
        return email.to ? buildEmailPayload(email) : "";
      case "sms":
        return sms.number ? buildSmsPayload(sms) : "";
      case "phone":
        return phone ? buildPhonePayload(phone) : "";
    }
  }, [type, url, text, wifi, card, email, sms, phone]);

  const effectiveSize = Number.isFinite(size) ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size))) : 512;
  const sizeClamped = Number.isFinite(size) && effectiveSize !== size;
  const contrast = contrastRatio(color, background);
  const lowContrast = contrast !== null && contrast < MIN_CONTRAST;
  const inverted = relativeLuminance(color) !== null && relativeLuminance(background) !== null
    ? (relativeLuminance(color) as number) > (relativeLuminance(background) as number)
    : false;

  // Regenerate automatically after the user stops editing. A sequence number
  // discards results from requests that were overtaken by a newer edit.
  useEffect(() => {
    if (!payload.trim()) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const options: QrOptions = { size: effectiveSize, color, background, errorCorrection };
        const [pngBlob, svgString] = await Promise.all([
          generateQrPngBlob(payload, options),
          generateQrSvgString(payload, options),
        ]);
        if (cancelled) return;
        setPng(pngBlob);
        setSvg(new Blob([svgString], { type: "image/svg+xml" }));
        setError(null);
      } catch {
        if (cancelled) return;
        setPng(null);
        setSvg(null);
        setError("Couldn't generate a QR code for that content — it may be too long.");
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payload, effectiveSize, color, background, errorCorrection]);

  // Only show the code that matches the current content, so an empty form never shows a stale image.
  const hasContent = payload.trim() !== "";
  const showPng = hasContent && png !== null;
  const pending = hasContent && png === null && !error;

  return (
    <ToolLayout
      title="QR Code Generator"
      description="Create a free static QR code for a link, text, Wi-Fi network, or contact card. It never expires and works offline."
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">What should the QR code do?</span>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.id}
              onClick={() => setType(c.id)}
              title={c.hint}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                type === c.id ? "bg-primary text-primary-foreground" : "border border-border"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{CONTENT_TYPES.find((c) => c.id === type)?.hint}</span>
      </div>

      {type === "url" && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Website address</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" inputMode="url" className={inputClass} />
          {url.trim() && <span className="text-xs text-muted-foreground">Encodes: {normalizeUrl(url)}</span>}
        </label>
      )}

      {type === "text" && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Any text — a note, a code, a serial number…"
            className={inputClass}
          />
        </label>
      )}

      {type === "wifi" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Network name (SSID)</span>
            <input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} className={inputClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Password</span>
            <input
              value={wifi.password}
              onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
              disabled={wifi.encryption === "nopass"}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Security</span>
            <select
              value={wifi.encryption}
              onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as WifiPayload["encryption"] })}
              className={inputClass}
            >
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">Open (no password)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm sm:pt-7">
            <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} />
            Hidden network
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Scanning joins the network on iOS and Android without typing the password.
          </p>
        </div>
      )}

      {type === "vcard" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["firstName", "First name"],
            ["lastName", "Last name"],
            ["organization", "Company"],
            ["title", "Job title"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["website", "Website"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{label}</span>
              <input value={card[key]} onChange={(e) => setCard({ ...card, [key]: e.target.value })} className={inputClass} />
            </label>
          ))}
        </div>
      )}

      {type === "email" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">To</span>
            <input value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} inputMode="email" className={inputClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Subject</span>
            <input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} className={inputClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Message</span>
            <textarea value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} rows={3} className={inputClass} />
          </label>
        </div>
      )}

      {type === "sms" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Phone number</span>
            <input value={sms.number} onChange={(e) => setSms({ ...sms, number: e.target.value })} inputMode="tel" placeholder="+1 555 000 1234" className={inputClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Message</span>
            <textarea value={sms.message} onChange={(e) => setSms({ ...sms, message: e.target.value })} rows={2} className={inputClass} />
          </label>
        </div>
      )}

      {type === "phone" && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Phone number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+1 555 000 1234" className={inputClass} />
        </label>
      )}

      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Design &amp; quality options</summary>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Size (px)</span>
            <input
              type="number"
              min={MIN_SIZE}
              max={MAX_SIZE}
              value={Number.isFinite(size) ? size : ""}
              onChange={(e) => setSize(e.target.value === "" ? Number.NaN : Number(e.target.value))}
              aria-invalid={sizeClamped}
              className={`w-28 ${inputClass}`}
            />
            {sizeClamped && (
              <span className="text-xs text-muted-foreground">
                Limited to {MIN_SIZE}–{MAX_SIZE}px; {effectiveSize}px will be used.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Foreground</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-lg border border-border" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Background</span>
            <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="h-10 w-16 rounded-lg border border-border" />
          </label>
        </div>

        {(lowContrast || inverted) && (
          <p role="alert" className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {inverted
              ? "The foreground is lighter than the background. Many phone scanners can't read inverted codes; make the code darker than its background."
              : `Low contrast (${contrast?.toFixed(1)}:1). Scanners work best at ${MIN_CONTRAST}:1 or higher; darken the foreground or lighten the background.`}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-medium">Error correction</span>
          <div className="flex flex-wrap gap-2">
            {ERROR_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setErrorCorrection(level.id)}
                title={level.hint}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  errorCorrection === level.id ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{ERROR_LEVELS.find((l) => l.id === errorCorrection)?.hint}</span>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Keep a light background behind dark modules — inverted or low-contrast codes often fail to scan.
        </p>
      </details>

      {hasContent && error && <p className="text-destructive">{error}</p>}

      {!hasContent && <p className="text-sm text-muted-foreground">Enter content above and the QR code appears here automatically.</p>}
      {pending && <p className="text-sm text-muted-foreground" aria-live="polite">Generating…</p>}

      <p className="text-sm text-muted-foreground">
        Need to read a code instead?{" "}
        <Link href="/tools/qr-scanner" className="text-primary underline underline-offset-2">
          Scan a QR code
        </Link>{" "}
        with your camera or from an image.
      </p>

      {showPng && png && previewUrl && (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-border p-5">
          {contrast !== null && <div className="text-xs text-muted-foreground">Contrast {contrast.toFixed(1)}:1</div>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Generated QR code" className="h-48 w-48" style={{ backgroundColor: background }} />
          <div className="flex flex-wrap gap-3">
            <DownloadButton blob={png} filename="qr-code.png" label="Download PNG" />
            {svg && <DownloadButton blob={svg} filename="qr-code.svg" label="Download SVG" />}
            <CopyButton value={payload} label="Copy encoded data" />
          </div>
          <p className="text-xs text-muted-foreground">
            This is a static QR code: the data lives in the pattern itself, so it never expires and needs no
            account or tracking redirect. SVG stays sharp at any print size.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}
