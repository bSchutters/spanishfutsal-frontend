"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrerPack, type EtatMotDePassePack } from "@/hub/actions/pack-joueurs";

const ETAT_INITIAL: EtatMotDePassePack = {};

/** Le mot de passe de la page des joueurs, donne par le club avec le lien. */
export default function EntreePack({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState(entrerPack.bind(null, jeton), ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pack-mot-de-passe">Mot de passe</Label>
        <Input id="pack-mot-de-passe" name="motDePasse" type="password" autoComplete="off" required className="h-10" />
        <p className="text-xs text-muted-foreground">Le club l&apos;a donné avec le lien de cette page.</p>
      </div>
      {etat.erreur ? (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      ) : null}
      <Button type="submit" variant="hub" disabled={enCours} className="h-10 w-full">
        {enCours ? "Vérification…" : "Entrer"}
      </Button>
    </form>
  );
}
