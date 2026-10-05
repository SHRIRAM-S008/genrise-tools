"use client";

import { useEffect, useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CopyButton } from "@/components/copy-button";

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

const copyBtnClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/40";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}

export default function JwtDecoderPage() {
  const [token, setToken] = useState("");

  const decoded = useMemo(() => {
    const parts = token.trim().split(".");
    if (parts.length < 2) return null;
    try {
      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      return { header, payload };
    } catch {
      return "error" as const;
    }
  }, [token]);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // Keep "Expired / Valid" honest while the tab stays open.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ok = decoded && decoded !== "error" ? decoded : null;
  const payload = ok?.payload;
  const exp = typeof payload?.exp === "number" ? payload.exp : undefined;
  const nbf = typeof payload?.nbf === "number" ? payload.nbf : undefined;
  const iat = typeof payload?.iat === "number" ? payload.iat : undefined;
  const iss = typeof payload?.iss === "string" ? payload.iss : undefined;
  const aud =
    typeof payload?.aud === "string"
      ? payload.aud
      : Array.isArray(payload?.aud)
        ? payload.aud.map(String).join(", ")
        : undefined;

  const expired = exp !== undefined && exp < now;
  const notYetValid = nbf !== undefined && nbf > now;
  const status = expired
    ? { label: "Expired", cls: "text-destructive" }
    : notYetValid
      ? { label: "Not yet valid", cls: "text-amber-600 dark:text-amber-400" }
      : exp !== undefined || nbf !== undefined
        ? { label: "Valid", cls: "text-emerald-600 dark:text-emerald-400" }
        : null;

  const headerJson = ok ? JSON.stringify(ok.header, null, 2) : "";
  const payloadJson = ok ? JSON.stringify(ok.payload, null, 2) : "";

  return (
    <ToolLayout title="JWT Decoder" description="Decode a JSON Web Token's header and payload instantly.">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">JWT</span>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={5}
          placeholder="eyJhbGciOi..."
          className="rounded-lg border border-border px-3 py-2 font-mono text-xs break-all"
        />
      </label>

      <p className="text-xs text-muted-foreground">
        This only decodes the token — it does not verify the signature. Never paste a token you don&apos;t trust into an
        untrusted site.
      </p>

      {decoded === "error" && <p className="text-destructive">Couldn&apos;t decode this token — check it&apos;s a valid JWT.</p>}

      {ok && (
        <>
          {status && (
            <p className={`text-sm font-semibold ${status.cls}`} role="status">
              {status.label}
              {notYetValid && nbf !== undefined && (
                <span className="ml-2 font-normal text-muted-foreground">starts {new Date(nbf * 1000).toLocaleString()}</span>
              )}
              {expired && exp !== undefined && (
                <span className="ml-2 font-normal text-muted-foreground">expired {new Date(exp * 1000).toLocaleString()}</span>
              )}
              {!expired && !notYetValid && exp !== undefined && (
                <span className="ml-2 font-normal text-muted-foreground">expires {new Date(exp * 1000).toLocaleString()}</span>
              )}
            </p>
          )}

          {(iat !== undefined || nbf !== undefined || exp !== undefined || iss || aud) && (
            <dl className="flex flex-col gap-2 rounded-2xl border border-border p-5">
              {iss && <Row label="iss" value={iss} />}
              {aud && <Row label="aud" value={aud} />}
              {iat !== undefined && <Row label="iat" value={new Date(iat * 1000).toLocaleString()} />}
              {nbf !== undefined && <Row label="nbf" value={new Date(nbf * 1000).toLocaleString()} />}
              {exp !== undefined && <Row label="exp" value={new Date(exp * 1000).toLocaleString()} />}
            </dl>
          )}

          <div className="rounded-2xl border border-border p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Header</p>
              <CopyButton value={headerJson} label="Copy header" className={copyBtnClass} />
            </div>
            <pre className="overflow-x-auto rounded-lg bg-accent/40 p-3 text-xs">{headerJson}</pre>
          </div>

          <div className="rounded-2xl border border-border p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Payload</p>
              <CopyButton value={payloadJson} label="Copy payload" className={copyBtnClass} />
            </div>
            <pre className="overflow-x-auto rounded-lg bg-accent/40 p-3 text-xs">{payloadJson}</pre>
          </div>
        </>
      )}
    </ToolLayout>
  );
}
