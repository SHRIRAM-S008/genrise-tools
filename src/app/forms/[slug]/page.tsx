import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CircleAlert, FileSignature, IdCard, Paperclip } from "lucide-react";
import { formSpecs, getFormSpec, photoSpecLine, toolHref } from "@/lib/formSpecs";
import { siteName, siteUrl } from "@/lib/toolSeo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return formSpecs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const spec = getFormSpec((await params).slug);
  if (!spec) return {};
  const url = `${siteUrl}/forms/${spec.slug}`;
  const title = `${spec.name} Photo & Signature Size — Requirements and Free Tools`;
  const description = `${spec.name} upload requirements: ${[photoSpecLine(spec.photo), spec.signature && `Signature ${photoSpecLine(spec.signature)}`].filter(Boolean).join(". ")}. Prepare exact-size files free in your browser — no uploads, no sign-up.`;
  return {
    title,
    description,
    keywords: [...spec.keywords, `${spec.shortName.toLowerCase()} photo requirements`, `${spec.shortName.toLowerCase()} application form`],
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${siteName}`, description, url, type: "article" },
    twitter: { card: "summary_large_image", title: `${title} | ${siteName}`, description },
  };
}

function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function FormSpecPage({ params }: PageProps) {
  const spec = getFormSpec((await params).slug);
  if (!spec) notFound();

  const url = `${siteUrl}/forms/${spec.slug}`;
  const photoHref = spec.photo
    ? spec.photo.widthMm
      ? toolHref("passport-photo", spec.photo)
      : toolHref("target-kb", spec.photo)
    : null;
  const signatureHref = spec.signature ? toolHref("signature-optimizer", spec.signature) : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Form requirements", item: `${siteUrl}/forms` },
        { "@type": "ListItem", position: 3, name: spec.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to prepare photo and signature for ${spec.name}`,
      description: `Meet the ${spec.name} upload requirements using free browser-based tools.`,
      url,
      step: spec.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: spec.faqs.map((f) => ({
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
        <Link href="/forms" className="hover:text-foreground">Form requirements</Link>
        <span>/</span>
        <span className="text-foreground">{spec.shortName}</span>
      </nav>

      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        {spec.name} photo &amp; signature size
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        The upload requirements for the {spec.name} application — and free tools that produce
        exact-size files without uploading anything to a server.
      </p>

      {/* Spec tables */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {spec.photo && (
          <section className="rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2">
              <IdCard className="size-4 text-primary" />
              <h2 className="font-heading text-base font-semibold">Photo</h2>
            </div>
            <dl className="mt-3 divide-y divide-border/60">
              <SpecRow label="File size" value={spec.photo.minKb ? `${spec.photo.minKb}–${spec.photo.maxKb} KB` : spec.photo.maxKb ? `up to ${spec.photo.maxKb} KB` : undefined} />
              <SpecRow label="Pixels" value={spec.photo.widthPx && spec.photo.heightPx ? `${spec.photo.widthPx} × ${spec.photo.heightPx} px` : undefined} />
              <SpecRow label="Dimensions" value={spec.photo.widthMm && spec.photo.heightMm ? `${spec.photo.widthMm} × ${spec.photo.heightMm} mm` : undefined} />
              <SpecRow label="Format" value={spec.photo.format} />
              <SpecRow label="Background" value={spec.photo.background} />
            </dl>
            {spec.photo.notes && <p className="mt-3 text-xs text-muted-foreground">{spec.photo.notes}</p>}
            {photoHref && (
              <Link
                href={photoHref}
                className="group mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Make this photo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </section>
        )}

        {spec.signature && (
          <section className="rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2">
              <FileSignature className="size-4 text-primary" />
              <h2 className="font-heading text-base font-semibold">Signature</h2>
            </div>
            <dl className="mt-3 divide-y divide-border/60">
              <SpecRow label="File size" value={spec.signature.minKb ? `${spec.signature.minKb}–${spec.signature.maxKb} KB` : spec.signature.maxKb ? `up to ${spec.signature.maxKb} KB` : undefined} />
              <SpecRow label="Pixels" value={spec.signature.widthPx && spec.signature.heightPx ? `${spec.signature.widthPx} × ${spec.signature.heightPx} px` : undefined} />
              <SpecRow label="Dimensions" value={spec.signature.widthMm && spec.signature.heightMm ? `${spec.signature.widthMm} × ${spec.signature.heightMm} mm` : undefined} />
              <SpecRow label="Format" value={spec.signature.format} />
            </dl>
            {spec.signature.notes && <p className="mt-3 text-xs text-muted-foreground">{spec.signature.notes}</p>}
            {signatureHref && (
              <Link
                href={signatureHref}
                className="group mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground"
              >
                Make this signature
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </section>
        )}
      </div>

      {spec.otherUploads && spec.otherUploads.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2">
            <Paperclip className="size-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">Other uploads</h2>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {spec.otherUploads.map((u) => (
              <li key={u.label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{u.label}</span>
                <span className="text-right font-medium">{u.spec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Steps */}
      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold tracking-tight">
          How to prepare your files for {spec.shortName}
        </h2>
        <ol className="mt-4 flex flex-col gap-3">
          {spec.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Verify notice */}
      <div className="mt-8 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-muted-foreground">
          Specs reflect the {spec.sourceNote}, verified for the {spec.verifiedFor}. Requirements can
          change with each notification — always confirm against the current official notice before
          submitting. <Link href="/contact" className="text-primary underline">Report a change</Link>.
        </p>
      </div>

      {/* FAQs */}
      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold tracking-tight">Frequently asked</h2>
        <div className="mt-4 flex flex-col divide-y divide-border">
          {spec.faqs.map((f) => (
            <details key={f.question} className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                {f.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related forms */}
      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold tracking-tight">More requirements</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {formSpecs
            .filter((s) => s.category === spec.category && s.slug !== spec.slug)
            .slice(0, 8)
            .map((s) => (
              <Link
                key={s.slug}
                href={`/forms/${s.slug}`}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s.shortName}
              </Link>
            ))}
          <Link
            href="/forms"
            className="rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary"
          >
            All form specs →
          </Link>
        </div>
      </section>
    </main>
  );
}
