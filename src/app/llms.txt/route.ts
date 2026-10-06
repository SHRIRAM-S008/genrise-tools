import { kits, tools } from "@/lib/tools";
import { siteName, siteUrl } from "@/lib/toolSeo";

export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [
    `# ${siteName}`,
    "",
    `> ${siteName} is a collection of free, browser-based tools for files, images, and PDFs. Every tool runs entirely on-device — no sign-up, no server uploads, no watermarks.`,
    "",
  ];

  const byCategory = new Map<string, typeof tools>();
  for (const tool of tools) {
    const list = byCategory.get(tool.category) ?? [];
    list.push(tool);
    byCategory.set(tool.category, list);
  }

  for (const [category, list] of byCategory) {
    lines.push(`## ${category}`, "");
    for (const tool of list) {
      lines.push(`- [${tool.title}](${siteUrl}/tools/${tool.slug}): ${tool.description}`);
    }
    lines.push("");
  }

  lines.push(
    "## Toolkits",
    "",
    ...kits.map(
      (k) => `- [${k.title}](${siteUrl}/${k.slug}): ${k.description}`
    ),
    "",
    "## Optional",
    "",
    `- [All tools](${siteUrl}/tools): searchable index of every tool`,
    `- [Form requirements](${siteUrl}/forms): exact photo/signature specs for Indian exam forms, passports and visas`,
    `- [Alternatives](${siteUrl}/alternatives): private, no-upload alternatives to popular online tools`,
    `- [About](${siteUrl}/about)`,
    `- [Sitemap](${siteUrl}/sitemap.xml)`,
    ""
  );

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
