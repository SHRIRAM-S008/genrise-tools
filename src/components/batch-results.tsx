"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert, X } from "lucide-react";
import { slugFromPath, trackEvent } from "@/lib/analytics";
import DownloadButton from "@/components/DownloadButton";
import { formatBytes } from "@/lib/imageCore";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { zipResults, type BatchItem } from "@/lib/batch";

export interface BatchOutput {
  blob: Blob;
  filename: string;
}

interface BatchResultsProps {
  items: BatchItem<BatchOutput>[];
  zipName: string;
  onRemove?: (id: string) => void;
  /** Show a thumbnail of each result (images only). */
  preview?: boolean;
}

export function BatchResults({ items, zipName, onRemove, preview = true }: BatchResultsProps) {
  const [zipping, setZipping] = useState(false);
  const [zip, setZip] = useState<BatchOutput | null>(null);

  const done = items.filter((i) => i.status === "done" && i.result);
  const failed = items.filter((i) => i.status === "error");

  async function buildZip() {
    setZipping(true);
    try {
      setZip(await zipResults(done.map((i) => i.result!), zipName));
    } finally {
      setZipping(false);
    }
  }

  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <BatchRow key={item.id} item={item} onRemove={onRemove} preview={preview} />
        ))}
      </ul>

      {failed.length > 0 && (
        <p className="text-sm text-amber-600">
          {failed.length} file{failed.length === 1 ? "" : "s"} couldn&apos;t be processed — the rest are ready.
        </p>
      )}

      {done.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          {zip ? (
            <DownloadButton blob={zip.blob} filename={zip.filename} label={`Download all (${formatBytes(zip.blob.size)})`} />
          ) : (
            <button
              onClick={buildZip}
              disabled={zipping}
              className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
            >
              {zipping ? "Zipping…" : `Download all ${done.length} as ZIP`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BatchRow({
  item,
  onRemove,
  preview,
}: {
  item: BatchItem<BatchOutput>;
  onRemove?: (id: string) => void;
  preview: boolean;
}) {
  const pathname = usePathname();
  const url = useObjectUrl(item.result?.blob);
  const saved =
    item.result && item.file.size > 0
      ? Math.round(((item.file.size - item.result.blob.size) / item.file.size) * 100)
      : null;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
      {preview && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-10 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-accent/40">
          {item.status === "working" ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : item.status === "error" ? (
            <TriangleAlert className="size-4 text-amber-600" />
          ) : item.status === "done" ? (
            <CheckCircle2 className="size-4 text-primary" />
          ) : null}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{item.file.name}</span>
        <span className="block text-xs text-muted-foreground">
          {item.status === "queued" && "Waiting…"}
          {item.status === "working" && "Processing…"}
          {item.status === "error" && (item.error ?? "Failed")}
          {item.status === "done" && item.result && (
            <>
              {formatBytes(item.file.size)} → {formatBytes(item.result.blob.size)}
              {saved !== null && saved > 0 ? ` (${saved}% smaller)` : ""}
            </>
          )}
        </span>
      </span>

      {item.status === "done" && item.result && url && (
        <a
          href={url}
          download={item.result.filename}
          onClick={() => trackEvent("result_download", { tool_slug: slugFromPath(pathname) })}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/40"
        >
          Download
        </a>
      )}

      {onRemove && (
        <button
          aria-label={`Remove ${item.file.name}`}
          onClick={() => onRemove(item.id)}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      )}
    </li>
  );
}
