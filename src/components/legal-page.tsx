import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteUrl } from "@/lib/toolSeo";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

/** Shared shell for privacy/terms/about/contact — prose-styled, single column. */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-14">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_strong]:text-foreground">
        {children}
      </div>
    </main>
  );
}

export function legalMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}${path}` },
    openGraph: { title, description, url: `${siteUrl}${path}`, type: "website" },
  };
}
