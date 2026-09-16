"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Membre = { id: number; nom: string };

/**
 * Le vote d'une idee, presente comme un sondage : combien de membres sont
 * pour, sur combien, et qui. Un bouton pour donner ou retirer sa voix.
 */
export default function Sondage({
  votantsIds,
  aVote,
  membres,
  enCours,
  onVoter,
  compact = false,
}: {
  votantsIds: number[];
  aVote: boolean;
  membres: Membre[];
  enCours?: boolean;
  onVoter: () => void;
  compact?: boolean;
}) {
  const total = Math.max(membres.length, votantsIds.length, 1);
  const noms = votantsIds.map((id) => membres.find((m) => m.id === id)?.nom ?? "Membre");
  const part = Math.round((votantsIds.length / total) * 100);

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "text-xs" : "text-sm")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {votantsIds.length} sur {total} {votantsIds.length > 1 ? "sont pour" : "est pour"}
        </span>
        <Button
          type="button"
          variant={aVote ? "hub" : "hubSecondary"}
          size="sm"
          className={compact ? "h-7 px-2 text-xs" : undefined}
          disabled={enCours}
          onClick={onVoter}
          aria-pressed={aVote}
        >
          {aVote ? <Check aria-hidden="true" /> : null}
          {aVote ? "Je suis pour" : "Je vote pour"}
        </Button>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="presentation">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${part}%` }} />
      </div>
      {noms.length > 0 ? <p className="truncate text-muted-foreground">{noms.join(", ")}</p> : null}
    </div>
  );
}
