"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { slugFromPath, trackEvent } from "@/lib/analytics";

interface DownloadButtonProps {
  blob: Blob;
  filename: string;
  label?: string;
}

export default function DownloadButton({ blob, filename, label = "Download" }: DownloadButtonProps) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  const pathname = usePathname();

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="inline-block"
      onClick={() => trackEvent("result_download", { tool_slug: slugFromPath(pathname) })}
    >
      <Button size="lg" className="rounded-full" nativeButton={false} render={<a href={url} download={filename} />}>
        <Download className="size-4" />
        {label}
      </Button>
    </motion.div>
  );
}
