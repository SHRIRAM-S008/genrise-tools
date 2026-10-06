import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, Landmark, Plane } from "lucide-react";
import { formCategories, formSpecs, photoSpecLine } from "@/lib/formSpecs";
import { siteName, siteUrl } from "@/lib/toolSeo";

const title = "Application Form Photo & Signature Requirements";
const description =
  "Exact photo and signature sizes for Indian exam forms (SSC, UPSC, NEET, JEE, IBPS), passports, PAN, OCI and visas — plus free tools that make files to spec, right in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteUrl}/forms` },
  openGraph: {
    title: `${title} | ${siteName}`,
    description,
    url: `${siteUrl}/forms`,
    type: "website",
  },
};

const categoryIcons = { exam: FileCheck2, document: Landmark, visa: Plane } as const;

export default function FormsIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-14">
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Photo &amp; signature specs for every application form
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Each guide lists the exact file size and dimensions the portal asks for, and links
          straight into a free tool that&apos;s already set to those numbers. Everything runs in
          your browser — your documents are never uploaded.
        </p>
      </div>

      {formCategories.map((cat) => {
        const specs = formSpecs.filter((s) => s.category === cat.id);
        if (!specs.length) return null;
        const Icon = categoryIcons[cat.id];
        return (
          <section key={cat.id} className="mt-12">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold tracking-tight">{cat.label}</h2>
                <p className="text-sm text-muted-foreground">{cat.blurb}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {specs.map((spec) => (
                <Link
                  key={spec.slug}
                  href={`/forms/${spec.slug}`}
                  className="group flex flex-col gap-2 bg-card p-5 transition-colors hover:bg-accent/40"
                >
                  <h3 className="font-heading text-sm font-semibold leading-tight">{spec.name}</h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {photoSpecLine(spec.photo) || "Document upload requirements"}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary">
                    View requirements
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <p className="mt-10 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        Requirements are compiled from official notifications and marked with the cycle they were
        verified for — always confirm against the current notice for your application. Spotted a
        change? <Link href="/contact" className="text-primary underline">Tell us</Link>.
      </p>
    </main>
  );
}
