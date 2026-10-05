"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import DownloadButton from "@/components/DownloadButton";
import { CopyButton } from "@/components/copy-button";
import { renderMarkdown } from "@/lib/markdown";

const DEFAULT_MD = `# Hello\n\nWrite some **Markdown** on the left and see it rendered here.\n\n- supports lists\n- \`inline code\`\n- [links](https://example.com)\n\n1. and numbered lists\n2. too\n\n| Feature | Supported |\n| --- | --- |\n| Tables | yes |\n| Images | yes |\n\n> blockquotes too`;

const STANDALONE_CSS = `body{max-width:760px;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,-apple-system,sans-serif;color:#171717}
h1,h2,h3{line-height:1.25}a{color:#2563eb}code{background:#f3f4f6;border-radius:4px;padding:0 4px;font-size:.9em}
pre{background:#f3f4f6;border-radius:8px;padding:12px;overflow-x:auto}pre code{background:none;padding:0}
blockquote{border-left:3px solid #d4d4d4;margin:0;padding-left:12px;color:#525252}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #d4d4d4;padding:4px 8px;text-align:left}th{background:#f5f5f5}
img{max-width:100%}hr{border:0;border-top:1px solid #d4d4d4;margin:16px 0}`;

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function MarkdownPreviewerPage() {
  const [text, setText] = useState(DEFAULT_MD);
  const html = useMemo(() => renderMarkdown(text), [text]);

  const mdBlob = useMemo(() => new Blob([text], { type: "text/markdown;charset=utf-8" }), [text]);
  const htmlDocument = useMemo(
    () =>
      `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Document</title>\n<style>${STANDALONE_CSS}</style>\n</head>\n<body>\n${html}\n</body>\n</html>\n`,
    [html]
  );
  const htmlBlob = useMemo(() => new Blob([htmlDocument], { type: "text/html;charset=utf-8" }), [htmlDocument]);

  return (
    <ToolLayout title="Markdown Previewer" description="Write Markdown and see the rendered HTML preview live.">
      <div className="grid gap-4 sm:grid-cols-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          aria-label="Markdown source"
          className="rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
        <div
          className="markdown-preview overflow-y-auto rounded-lg border border-border px-4 py-3 text-sm [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-accent/50 [&_code]:px-1 [&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-accent/40 [&_pre]:p-3 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-accent/40 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_hr]:my-4 [&_hr]:border-border [&_img]:max-w-full [&_ol]:my-2 [&_ol_li]:list-decimal"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {countWords(text).toLocaleString()} words · {text.length.toLocaleString()} characters
      </p>

      <div className="flex flex-wrap gap-2">
        <CopyButton value={html} label="Copy HTML" />
        <CopyButton value={text} label="Copy Markdown" />
      </div>

      <div className="flex flex-wrap gap-3">
        <DownloadButton blob={mdBlob} filename="document.md" label="Download .md" />
        <DownloadButton blob={htmlBlob} filename="document.html" label="Download .html" />
      </div>
    </ToolLayout>
  );
}
