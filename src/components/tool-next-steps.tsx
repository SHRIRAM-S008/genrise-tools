import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categoryTileClass } from "@/lib/categoryStyles";
import { nextSteps } from "@/lib/nextSteps";
import { tools, type ToolMeta } from "@/lib/tools";

interface ToolNextStepsProps {
  slug: string;
}

export function ToolNextSteps({ slug }: ToolNextStepsProps) {
  const current = tools.find((t) => t.slug === slug);
  if (!current) return null;

  const mapped = (nextSteps[slug] ?? [])
    .map((s) => tools.find((t) => t.slug === s))
    .filter((t): t is ToolMeta => Boolean(t));

  // Fall back to same-category tools so every page still points somewhere useful.
  const suggestions =
    mapped.length > 0
      ? mapped
      : tools.filter((t) => t.category === current.category && t.slug !== slug).slice(0, 3);

  if (suggestions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5" aria-labelledby="next-steps-heading">
      <h2 id="next-steps-heading" className="text-sm font-semibold">
        Next step
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Keep going with what you just made.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {suggestions.map((t) => (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
          >
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${categoryTileClass[t.category]}`}>
              <t.icon className="size-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.title}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{t.description}</p>
            </div>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
