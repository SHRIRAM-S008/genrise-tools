import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { formSpecs } from "@/lib/formSpecs";

const featured = ["ssc-cgl", "neet-ug", "ibps-po", "upsc-cse", "indian-passport-photo", "pan-card-photo"];

/** Homepage section pointing searchers at the exam/document spec guides. */
export function FormsStrip() {
  const specs = featured
    .map((slug) => formSpecs.find((s) => s.slug === slug))
    .filter((s): s is (typeof formSpecs)[number] => Boolean(s));

  return (
    <section className="py-10">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileCheck2 className="size-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight sm:text-xl">
              Applying for an exam or government form?
            </h2>
            <p className="text-sm text-muted-foreground">
              Exact photo &amp; signature sizes — with tools already set to the right numbers.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {specs.map((spec) => (
            <Link
              key={spec.slug}
              href={`/forms/${spec.slug}`}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              {spec.shortName}
            </Link>
          ))}
          <Link
            href="/forms"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            All requirements
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
