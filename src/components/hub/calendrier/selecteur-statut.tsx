"use client";

import { COULEURS_STATUT, LIBELLES_STATUT, STATUTS, type Statut } from "@/hub/calendrier/schema";
import { cn } from "@/lib/utils";

/**
 * Le statut d'un post, en <select> natif : sur un telephone, c'est la roue
 * du systeme qui s'ouvre, ce qu'aucune liste maison ne fait aussi bien.
 * La pastille devant reprend la couleur du statut courant.
 */
export default function SelecteurStatut({
  valeur,
  onChange,
  disabled,
  className,
}: {
  valeur: Statut;
  onChange: (statut: Statut) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span
        className="pointer-events-none absolute left-2.5 size-2 rounded-full"
        style={{ backgroundColor: COULEURS_STATUT[valeur] }}
        aria-hidden="true"
      />
      <select
        value={valeur}
        disabled={disabled}
        aria-label="Statut"
        onChange={(e) => onChange(e.target.value as Statut)}
        className="h-8 appearance-none rounded-md border border-input bg-secondary pl-7 pr-8 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {STATUTS.map((s) => (
          <option key={s} value={s}>
            {LIBELLES_STATUT[s]}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
