"use client";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a GA4 custom event. No-ops when GA isn't configured
 * (NEXT_PUBLIC_GA_ID unset) so the site works identically without analytics.
 * Never send file names, file contents, or personal data in params —
 * the privacy promise is about files, and we keep it.
 */
export function trackEvent(event: string, params?: EventParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}

/** Current tool slug derived from the path, e.g. /tools/merge-pdf → "merge-pdf". */
export function slugFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}
