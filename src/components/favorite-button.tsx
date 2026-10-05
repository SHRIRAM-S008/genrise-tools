"use client";

import { Star } from "lucide-react";
import { toggleFavorite, useFavoriteTools } from "@/lib/toolUsage";

export function FavoriteButton({ slug }: { slug: string }) {
  const favorites = useFavoriteTools();
  const isFavorite = favorites.includes(slug);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(slug)}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary active:bg-muted"
    >
      <Star
        className={`size-3.5 ${isFavorite ? "fill-primary text-primary" : ""}`}
        strokeWidth={2}
      />
      {isFavorite ? "Favorited" : "Favorite"}
    </button>
  );
}
