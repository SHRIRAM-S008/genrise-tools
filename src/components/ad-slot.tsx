"use client";

import { useEffect, useRef } from "react";

interface AdSlotProps {
  label?: string;
  className?: string;
  /** Reserve the layout space without rendering a visible placeholder box. */
  visible?: boolean;
  /** AdSense slot ID for this unit (from the AdSense dashboard). */
  adSlot?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Sidebar ad rail. Renders a real AdSense unit when NEXT_PUBLIC_ADSENSE_ID and
 * a slot ID are configured; otherwise collapses to an invisible spacer so the
 * layout is ready for ads without showing empty boxes.
 */
export function AdSlot({ label = "Advertisement", className = "", visible = false, adSlot }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const client = process.env.NEXT_PUBLIC_ADSENSE_ID || "ca-pub-7586690529424741";
  const slot = adSlot || process.env.NEXT_PUBLIC_ADSENSE_SLOT;
  const enabled = Boolean(client && slot);

  useEffect(() => {
    if (!enabled || !insRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Ad blockers or a failed push shouldn't break the page.
    }
  }, [enabled]);

  return (
    <div
      className={`hidden xl:sticky xl:top-24 xl:flex xl:h-[600px] xl:w-[160px] xl:shrink-0 xl:flex-col xl:items-center xl:justify-center xl:text-center ${
        visible ? "xl:rounded-2xl xl:border xl:border-dashed xl:border-border xl:bg-muted/30" : ""
      } ${className}`}
      aria-hidden={!enabled}
    >
      {enabled ? (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block", width: 160, height: 600 }}
          data-ad-client={client}
          data-ad-slot={slot}
        />
      ) : visible ? (
        <>
          <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
          <span className="mt-1 text-[10px] text-muted-foreground/70">160 × 600</span>
        </>
      ) : null}
    </div>
  );
}
