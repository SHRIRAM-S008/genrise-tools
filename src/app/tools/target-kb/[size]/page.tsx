import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TargetKbTool } from "../tool-client";
import { siteName, siteUrl } from "@/lib/toolSeo";
import { tools } from "@/lib/tools";

/** Supported size slugs: "20kb", "50kb" … or "1mb". */
const SIZES = ["10kb", "15kb", "20kb", "25kb", "30kb", "50kb", "100kb", "150kb", "200kb", "250kb", "300kb", "500kb", "1mb", "2mb"];

function parseSize(slug: string): number | null {
  const kb = /^(\d+)kb$/.exec(slug);
  if (kb) return Number(kb[1]);
  const mb = /^(\d+)mb$/.exec(slug);
  if (mb) return Number(mb[1]) * 1024;
  return null;
}

function sizeLabel(slug: string): string {
  return slug.toUpperCase().replace("KB", " KB").replace("MB", " MB");
}

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function generateMetadata({ params }: { params: Promise<{ size: string }> }): Promise<Metadata> {
  const { size } = await params;
  const kb = parseSize(size);
  if (!kb) return {};
  const label = sizeLabel(size);
  const url = `${siteUrl}/tools/target-kb/${size}`;
  const title = `Compress Photo to ${label} — Exact File Size, Free`;
  const description = `Compress a JPG, PNG or WebP photo to exactly ${label} for exam forms, job applications and portal uploads. Runs in your browser — nothing is uploaded, no sign-up, no watermark.`;
  return {
    title,
    description,
    keywords: [
      `compress image to ${size}`,
      `compress photo to ${size}`,
      `image ${size} converter`,
      `reduce photo size to ${size}`,
      `compress jpeg to ${size}`,
      `photo size ${size} for online form`,
      `${size} photo for application form`,
    ],
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${siteName}`, description, url, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} | ${siteName}`, description },
  };
}

export default async function TargetKbSizePage({ params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const kb = parseSize(size);
  if (!kb) notFound();
  const label = sizeLabel(size);

  const tool = tools.find((t) => t.slug === "target-kb")!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${siteUrl}/tools` },
      { "@type": "ListItem", position: 3, name: tool.title, item: `${siteUrl}/tools/${tool.slug}` },
      { "@type": "ListItem", position: 4, name: `${label}`, item: `${siteUrl}/tools/target-kb/${size}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={null}>
        <TargetKbTool
          defaultKb={kb}
          title={`Compress a photo to ${label}`}
          description={`Set to ${label} and ready — drop a photo and we'll compress it to exactly this size, entirely in your browser.`}
        />
      </Suspense>
      <section className="mx-auto w-full max-w-2xl px-4 pb-10">
        <h2 className="text-lg font-semibold">Why exact-size?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Exam and job portals reject photos over their limit — SSC and IBPS forms commonly ask for
          {" "}20–50 KB, visa portals for 240 KB or less. This page starts UploadReady already set to
          {" "}{label}, so there&apos;s nothing to configure. Need a different limit?{" "}
          <Link href="/tools/target-kb" className="text-primary underline">Use the main tool</Link>,
          or check the{" "}
          <Link href="/forms" className="text-primary underline">form requirements guides</Link>{" "}
          for the exact spec your portal asks for.
        </p>
      </section>
    </>
  );
}
