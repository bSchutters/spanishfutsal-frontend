"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changerMotDePasse, type EtatMotDePasse } from "@/hub/actions/mot-de-passe";

const ETAT_INITIAL: EtatMotDePasse = {};

/**
 * Le formulaire du profil qui remplace le mot de passe. Le champ d'adresse
 * cache sert aux gestionnaires de mots de passe : il leur dit pour quel
 * compte enregistrer le nouveau.
 */
export default function MotDePasseProfil({ email }: { email: string }) {
  const [etat, action, enCours] = useActionState(changerMotDePasse, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4 px-4 py-4">
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mdp-actuel">Mot de passe actuel</Label>
        <Input id="mdp-actuel" name="actuel" type="password" autoComplete="current-password" required className="h-10" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mdp-nouveau">Nouveau mot de passe</Label>
        <Input id="mdp-nouveau" name="nouveau" type="password" autoComplete="new-password" required className="h-10" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mdp-confirmation">Confirmer le nouveau mot de passe</Label>
        <Input
          id="mdp-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          className="h-10"
        />
      </div>

      {etat.erreur ? (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      ) : null}
      {etat.change ? (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Mot de passe changé. Il sert dès votre prochaine connexion.
        </p>
      ) : null}

      <Button type="submit" variant="hub" disabled={enCours} className="h-10 self-start">
        {enCours ? "Enregistrement…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
