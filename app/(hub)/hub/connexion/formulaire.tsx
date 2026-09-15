"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { seConnecter, type EtatConnexion } from "@/hub/actions/session";

const ETAT_INITIAL: EtatConnexion = {};

export default function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(seConnecter, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          required
          defaultValue={etat.email ?? ""}
          className="h-10"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" />
      </div>

      {etat.erreur ? (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      ) : null}

      <Button type="submit" variant="hub" disabled={enCours} className="mt-1 h-10 w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
