"use client";

import { Check, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StatutIdee } from "@/hub/idees/schema";

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
            variant={cible === "kept" ? "hub" : "hubSecondary"}
            size="sm"
            className={compact ? "h-7 px-2 text-xs" : undefined}
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
