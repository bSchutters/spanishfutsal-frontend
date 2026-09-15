import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { seDeconnecter } from "@/hub/actions/session";

/** Les initiales d'une personne, ou la premiere lettre de son adresse. */
export function initiales({
  first_name,
  last_name,
  email,
}: {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}): string {
  const prenom = first_name?.trim();
  const nom = last_name?.trim();
  if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
  if (prenom) return prenom.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

/**
 * Le pied de la barre laterale : qui est connecte, et la sortie. La
 * deconnexion est une action serveur, d'ou le formulaire.
 */
export default function BlocUtilisateur({
  nom,
  email,
  lettres,
}: {
  nom: string;
  email: string;
  lettres: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
        aria-hidden="true"
      >
        {lettres}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{nom}</span>
        <span className="truncate text-[11px] text-muted-foreground">{email}</span>
      </span>
      <form action={seDeconnecter}>
        <Button type="submit" variant="ghost" size="icon" className="size-8" aria-label="Se déconnecter">
          <LogOut aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
