import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PassportPhotoTool } from "../tool-client";
import { siteName, siteUrl } from "@/lib/toolSeo";
import { tools } from "@/lib/tools";

interface Preset {
  sizeId: string;
  kb?: string;
  wmm?: string;
  hmm?: string;
  title: string;
  dims: string;
  blurb: string;
  keywords: string[];
}

const PRESETS: Record<string, Preset> = {
  "india-passport": {
    sizeId: "passport-us",
    title: "Indian Passport Photo — 51×51 mm",
    dims: "51×51 mm (2×2 inch)",
    blurb: "Official Indian passport photos are 2×2 inches (51×51 mm) on a white background — not the 35×45 mm 'passport size' most studios use.",
    keywords: ["indian passport photo size", "passport photo size india", "51x51 photo maker", "passport seva photo"],
  },
  "us-passport": {
    sizeId: "passport-us",
    title: "US Passport Photo — 2×2 inch",
    dims: "51×51 mm (2×2 inch)",
    blurb: "US passport photos are 2×2 inches with a plain white background and a full-face view.",
    keywords: ["us passport photo size", "2x2 photo maker", "us passport photo online free"],
  },
  "us-visa": {
    sizeId: "passport-us",
    kb: "240",
    title: "US Visa (DS-160) Photo — 2×2 inch, under 240 KB",
    dims: "51×51 mm (2×2 inch), JPEG ≤ 240 KB",
    blurb: "The DS-160 asks for a 2×2 inch JPEG, at least 600×600 px and under 240 KB — this preset has the size limit loaded already.",
    keywords: ["us visa photo size", "ds-160 photo", "us visa photo 240kb", "ds 160 photo requirements"],
  },
  "schengen-visa": {
    sizeId: "passport-eu",
    title: "Schengen Visa Photo — 35×45 mm",
    dims: "35×45 mm",
    blurb: "Schengen visas use the ICAO standard: 35×45 mm on a light background, face covering 70–80% of the height.",
    keywords: ["schengen visa photo size", "35x45 photo", "europe visa photo"],
  },
  "uk-visa": {
    sizeId: "passport-eu",
    title: "UK Visa Photo — 35×45 mm",
    dims: "35×45 mm",
    blurb: "UK visa photos are 35×45 mm on a plain light background — the same dimensions as the Schengen standard.",
    keywords: ["uk visa photo size", "uk visa photo 35x45", "ukvi photo requirements"],
  },
  "pan-card": {
    sizeId: "custom",
    wmm: "25",
    hmm: "35",
    title: "PAN Card Photo — 25×35 mm",
    dims: "25×35 mm",
    blurb: "PAN card applications (NSDL/UTIITSL) use a 25×35 mm photo on white — smaller than a passport photo.",
    keywords: ["pan card photo size", "pan photo 25x35", "pan card photo maker"],
  },
  "standard-35x45": {
    sizeId: "passport-in",
    title: "Passport-Size Photo — 35×45 mm",
    dims: "35×45 mm",
    blurb: "The size most Indian forms mean by 'passport size': 35×45 mm on a light or white background.",
    keywords: ["passport size photo", "passport size photo maker", "35x45 photo online", "passport size photo in mm"],
  },
};

export function generateStaticParams() {
  return Object.keys(PRESETS).map((preset) => ({ preset }));
}

export async function generateMetadata({ params }: { params: Promise<{ preset: string }> }): Promise<Metadata> {
  const { preset } = await params;
  const p = PRESETS[preset];
  if (!p) return {};
  const url = `${siteUrl}/tools/passport-photo/${preset}`;
  const title = `${p.title} — Free Online Maker`;
  const description = `${p.blurb} Make one free in your browser — crop, set the background, download. No uploads, no sign-up.`;
  return {
    title,
    description,
    keywords: p.keywords,
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${siteName}`, description, url, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} | ${siteName}`, description },
  };
}

export default async function PassportPresetPage({ params }: { params: Promise<{ preset: string }> }) {
  const { preset } = await params;
  const p = PRESETS[preset];
  if (!p) notFound();

  const tool = tools.find((t) => t.slug === "passport-photo")!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${siteUrl}/tools` },
      { "@type": "ListItem", position: 3, name: tool.title, item: `${siteUrl}/tools/${tool.slug}` },
      { "@type": "ListItem", position: 4, name: p.title, item: `${siteUrl}/tools/passport-photo/${preset}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={null}>
        <PassportPhotoTool
          defaultSize={p.sizeId}
          defaultKb={p.kb}
          defaultWmm={p.wmm}
          defaultHmm={p.hmm}
          title={p.title}
          description={`${p.blurb} This page loads the maker already set to ${p.dims}.`}
        />
      </Suspense>
      <section className="mx-auto w-full max-w-2xl px-4 pb-10">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Need a different size or a file-size limit too?{" "}
          <Link href="/tools/passport-photo" className="text-primary underline">Use the main maker</Link>,
          or see the{" "}
          <Link href="/forms" className="text-primary underline">form requirements guides</Link>{" "}
          for the exact spec your application asks for.
        </p>
      </section>
    </>
  );
}
