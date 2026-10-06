import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { alternatives, getAlternative } from "@/lib/alternatives";
import { tools } from "@/lib/tools";
import { categoryTileClass } from "@/lib/categoryStyles";
import { siteName, siteUrl } from "@/lib/toolSeo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return alternatives.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const alt = getAlternative((await params).slug);
  if (!alt) return {};
  const url = `${siteUrl}/alternatives/${alt.slug}`;
  const title = `Free ${alt.competitor} Alternative — No Uploads, No Sign-Up`;
  const description = `${alt.intro}`;
  return {
    title,
    description,
    keywords: [
      `${alt.competitor.toLowerCase()} alternative`,
      `${alt.competitor.toLowerCase()} alternative free`,
      `${alt.competitor.toLowerCase()} alternative no upload`,
      `private ${alt.competitor.toLowerCase()} alternative`,
      `${alt.knownFor.toLowerCase()} without uploading`,
    ],
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${siteName}`, description: alt.knownFor, url, type: "article" },
    twitter: { card: "summary_large_image", title: `${title} | ${siteName}`, description: alt.knownFor },
  };
}

export default async function AlternativePage({ params }: PageProps) {
  const alt = getAlternative((await params).slug);
  if (!alt) notFound();

  const url = `${siteUrl}/alternatives/${alt.slug}`;
  const equivTools = alt.equivalentTools
    .map((s) => tools.find((t) => t.slug === s))
    .filter((t): t is (typeof tools)[number] => Boolean(t));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Alternatives", item: `${siteUrl}/alternatives` },
        { "@type": "ListItem", position: 3, name: `${alt.competitor} alternative`, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: alt.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:py-14">
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href="/alternatives" className="hover:text-foreground">Alternatives</Link>
        <span>/</span>
        <span className="text-foreground">{alt.competitor}</span>
      </nav>

      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        A private {alt.competitor} alternative
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{alt.knownFor}</p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{alt.intro}</p>

      {/* Comparison table */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground"></th>
              <th className="px-4 py-3 font-semibold">{alt.competitor}</th>
              <th className="px-4 py-3 font-semibold text-primary">GenRise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alt.rows.map(([label, theirs, ours]) => (
              <tr key={label}>
                <td className="px-4 py-3 text-muted-foreground">{label}</td>
                <td className="px-4 py-3">
                  <span className="flex items-start gap-1.5">
                    <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                    {theirs}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  <span className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {ours}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Equivalent tools */}
      {equivTools.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            The GenRise equivalents — try them now
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {equivTools.map((tool) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${categoryTileClass[tool.category]}`}>
                  <tool.icon className="size-4" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tool.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{tool.description}</p>
                </div>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold tracking-tight">Frequently asked</h2>
        <div className="mt-4 flex flex-col divide-y divide-border">
          {alt.faqs.map((f) => (
            <details key={f.question} className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium">{f.question}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Comparisons reflect each service&apos;s publicly documented free tier at time of writing —
        features and limits change. {alt.competitor} is a trademark of its owner; GenRise is not
        affiliated with or endorsed by them.
      </p>
    </main>
  );
}
