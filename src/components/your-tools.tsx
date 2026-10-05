"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Clock, Star } from "lucide-react";
import { categoryTileClass } from "@/lib/categoryStyles";
import { tools, type ToolMeta } from "@/lib/tools";
import { useFavoriteTools, useRecentTools } from "@/lib/toolUsage";

/** Shows the visitor's favorites and recently opened tools. Renders nothing until they have some. */
export function YourTools() {
  const favorites = useFavoriteTools();
  const recent = useRecentTools();

  const favoriteTools = favorites
    .map((s) => tools.find((t) => t.slug === s))
    .filter((t): t is ToolMeta => Boolean(t));
  const recentTools = recent
    .filter((s) => !favorites.includes(s))
    .map((s) => tools.find((t) => t.slug === s))
    .filter((t): t is ToolMeta => Boolean(t))
    .slice(0, 4);

  if (favoriteTools.length === 0 && recentTools.length === 0) return null;

  return (
    <section className="py-10">
      {favoriteTools.length > 0 && (
        <ToolRow title="Your favorites" icon={<Star className="size-4" />} items={favoriteTools} />
      )}
      {recentTools.length > 0 && (
        <div className={favoriteTools.length > 0 ? "mt-8" : ""}>
          <ToolRow title="Jump back in" icon={<Clock className="size-4" />} items={recentTools} />
        </div>
      )}
    </section>
  );
}

function ToolRow({ title, icon, items }: { title: string; icon: ReactNode; items: ToolMeta[] }) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold tracking-tight sm:text-xl">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
          >
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${categoryTileClass[tool.category]}`}>
              <tool.icon className="size-4" strokeWidth={2} />
            </div>
            <span className="truncate text-sm font-medium">{tool.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
