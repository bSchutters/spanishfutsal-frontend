"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SensVote } from "@/hub/idees/schema";
import { cn } from "@/lib/utils";

export type Membre = { id: number; nom: string };

/**
 * Le vote d'une idee, presente comme un sondage : combien de membres sont
 * pour, combien contre, sur combien, et qui. Deux boutons, l'un excluant
 * l'autre, pour donner ou retirer sa voix.
 */
export default function Sondage({
  pourIds,
  contreIds,
  aVotePour,
  aVoteContre,
  membres,
  enCours,
  onVoter,
  compact = false,
}: {
  pourIds: number[];
  contreIds: number[];
  aVotePour: boolean;
  aVoteContre: boolean;
  membres: Membre[];
  enCours?: boolean;
  onVoter: (sens: SensVote) => void;
  compact?: boolean;
}) {
  const total = Math.max(membres.length, pourIds.length + contreIds.length, 1);
  const nomsDe = (liste: number[]) => liste.map((id) => membres.find((m) => m.id === id)?.nom ?? "Membre");
  const partPour = (pourIds.length / total) * 100;
  const partContre = (contreIds.length / total) * 100;

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "text-xs" : "text-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {pourIds.length} pour · {contreIds.length} contre · sur {total}
        </span>
        <span className="flex gap-1">
          <Button
            type="button"
            variant={aVotePour ? "hub" : "hubSecondary"}
            size="sm"
            className={compact ? "h-7 px-2 text-xs" : undefined}
            disabled={enCours}
            onClick={() => onVoter("pour")}
            aria-pressed={aVotePour}
            aria-label={aVotePour ? "Retirer mon vote pour" : "Voter pour"}
          >
            <ThumbsUp aria-hidden="true" />
            Pour
          </Button>
          <Button
            type="button"
            variant={aVoteContre ? "destructive" : "hubSecondary"}
            size="sm"
            className={compact ? "h-7 px-2 text-xs" : undefined}
            disabled={enCours}
            onClick={() => onVoter("contre")}
            aria-pressed={aVoteContre}
            aria-label={aVoteContre ? "Retirer mon vote contre" : "Voter contre"}
          >
            <ThumbsDown aria-hidden="true" />
            Contre
          </Button>
        </span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="presentation">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${partPour}%` }} />
        <div className="h-full bg-destructive transition-[width]" style={{ width: `${partContre}%` }} />
      </div>
      {pourIds.length > 0 || contreIds.length > 0 ? (
        <p className="truncate text-muted-foreground">
          {pourIds.length > 0 ? `Pour : ${nomsDe(pourIds).join(", ")}` : ""}
          {pourIds.length > 0 && contreIds.length > 0 ? " · " : ""}
          {contreIds.length > 0 ? `Contre : ${nomsDe(contreIds).join(", ")}` : ""}
        </p>
      ) : null}
    </div>
  );
}
