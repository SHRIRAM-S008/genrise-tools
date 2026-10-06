import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { alternatives } from "@/lib/alternatives";
import { siteName, siteUrl } from "@/lib/toolSeo";

const title = "Private Alternatives to Popular Online Tools";
const description =
  "GenRise does what iLovePDF, TinyPNG, remove.bg and similar tools do — without uploading your files, without sign-up, and without daily limits.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteUrl}/alternatives` },
  openGraph: { title: `${title} | ${siteName}`, description, url: `${siteUrl}/alternatives`, type: "website" },
};

export default function AlternativesIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-14">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="size-3.5" />
          On-device processing
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Same tools, minus the upload
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Popular online tools work by sending your files to their servers. GenRise runs the same
          jobs inside your browser — so there&apos;s nothing to upload, no account to create, and
          no daily limit to hit.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {alternatives.map((alt) => (
          <Link
            key={alt.slug}
            href={`/alternatives/${alt.slug}`}
            className="group flex flex-col gap-2 bg-card p-5 transition-colors hover:bg-accent/40"
          >
            <h2 className="font-heading text-sm font-semibold leading-tight">
              {alt.competitor} alternative
            </h2>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {alt.knownFor} — private, free, no uploads
            </p>
            <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary">
              Compare
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
