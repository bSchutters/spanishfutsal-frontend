"use client";

import { COULEURS_STATUT, LIBELLES_STATUT, STATUTS, type Statut } from "@/hub/calendrier/schema";
import { cn } from "@/lib/utils";

/**
 * Le statut d'un post, en <select> natif : sur un telephone, c'est la roue
 * du systeme qui s'ouvre, ce qu'aucune liste maison ne fait aussi bien.
 * La pastille est un voisin du select, pas dedans : iOS ne respecte pas le
 * retrait interieur d'un select et la superposait au texte.
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
    <label
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-input bg-secondary pl-2.5 pr-2 text-sm",
        disabled && "opacity-50",
        className,
      )}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COULEURS_STATUT[valeur] }} aria-hidden="true" />
      <select
        value={valeur}
        disabled={disabled}
        aria-label="Statut"
        onChange={(e) => onChange(e.target.value as Statut)}
        className="appearance-none bg-transparent pr-5 text-sm text-foreground outline-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239fb3c9' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right center",
          backgroundSize: "14px",
        }}
      >
        {STATUTS.map((s) => (
          <option key={s} value={s}>
            {LIBELLES_STATUT[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
