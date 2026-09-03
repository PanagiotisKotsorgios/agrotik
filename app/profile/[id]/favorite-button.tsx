"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { toggleFavorite } from "@/lib/actions/favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  targetId,
  initialFavorited,
}: {
  targetId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          const prev = favorited;
          setFavorited(!prev);
          const res = await toggleFavorite(targetId);
          if (!res.ok) setFavorited(prev);
        })
      }
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
        favorited
          ? "border-brand-earth bg-brand-earth text-white hover:bg-brand-earth/90"
          : "border-brand-border bg-brand-surface text-brand-ink/70 hover:border-brand-earth hover:text-brand-earth",
      )}
      aria-pressed={favorited}
    >
      <Icon name="heart" />
      {favorited ? "Στα αγαπημένα" : "Παρακολούθηση"}
    </button>
  );
}
