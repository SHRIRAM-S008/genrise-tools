"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { slugFromPath, trackEvent } from "@/lib/analytics";

interface FileDropzoneProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
}

export default function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  label = "Click or drop a file here",
  hint,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const [isDragging, setIsDragging] = useState(false);
  const [hasFile, setHasFile] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setHasFile(true);
      trackEvent("file_dropped", { tool_slug: slugFromPath(pathname), file_count: fileList.length });
      onFiles(Array.from(fileList));
    },
    [onFiles, pathname]
  );

  return (
    <motion.div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
        isDragging
          ? "border-primary bg-accent"
          : hasFile
            ? "border-primary/40 bg-accent/40"
            : "border-border hover:border-primary/40 hover:bg-accent/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {hasFile ? <FileCheck2 className="size-5" /> : <UploadCloud className="size-5" />}
      </div>
      <p className="mt-3 font-medium">{label}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}
