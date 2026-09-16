"use client";

import { Check, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StatutIdee } from "@/hub/idees/schema";
import { cn } from "@/lib/utils";

/** Des teintes pastel, une par sens : vert pour retenir, rose pour ecarter, bleu pour rouvrir. */
// Les `!` passent devant les couleurs propres a la variante du bouton.
const TEINTES: Record<StatutIdee, string> = {
  kept: "border-[#7bd389]/40! bg-[#7bd389]/15! text-[#a6e6b0]! hover:bg-[#7bd389]/25! hover:text-[#c2f0c9]!",
  discarded: "border-[#f28cb1]/40! bg-[#f28cb1]/15! text-[#f5b3cc]! hover:bg-[#f28cb1]/25! hover:text-[#f9cddf]!",
  new: "border-[#a2d6f8]/40! bg-[#a2d6f8]/15! text-[#bfe3fa]! hover:bg-[#a2d6f8]/25! hover:text-[#d6eefc]!",
};

/** Les deux autres statuts possibles d'une idee, en boutons : Retenir, Ecarter, Rouvrir. */
export default function BoutonsStatut({
  statut,
  enCours,
  onChanger,
  compact = false,
}: {
  statut: StatutIdee;
  enCours?: boolean;
  onChanger: (statut: StatutIdee) => void;
  compact?: boolean;
}) {
  const boutons: Array<{ statut: StatutIdee; libelle: string; icone: typeof Check }> = [
    { statut: "kept", libelle: "Retenir", icone: Check },
    { statut: "discarded", libelle: "Écarter", icone: X },
    { statut: "new", libelle: "Rouvrir", icone: RotateCcw },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {boutons
        .filter((b) => b.statut !== statut)
        .map(({ statut: cible, libelle, icone: Icone }) => (
          <Button
            key={cible}
            type="button"
            variant="outline"
            size="sm"
            className={cn(TEINTES[cible], compact && "h-7 px-2 text-xs")}
            disabled={enCours}
            onClick={() => onChanger(cible)}
          >
            <Icone aria-hidden="true" />
            {libelle}
          </Button>
        ))}
    </div>
  );
}
