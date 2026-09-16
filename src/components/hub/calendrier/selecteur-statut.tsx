"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COULEURS_STATUT, LIBELLES_STATUT, STATUTS, type Statut } from "@/hub/calendrier/schema";
import { cn } from "@/lib/utils";

/** Le statut d'un post, dans le meme composant de liste que le reste du Hub, avec sa pastille de couleur. */
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
    <Select value={valeur} onValueChange={(v) => onChange(v as Statut)} disabled={disabled}>
      <SelectTrigger size="sm" aria-label="Statut" className={cn("bg-secondary", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUTS.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COULEURS_STATUT[s] }} aria-hidden="true" />
            {LIBELLES_STATUT[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
