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
    <form action={action} className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-2">
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
          placeholder="prenom@exemple.be"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {etat.erreur ? (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      ) : null}

      <Button type="submit" disabled={enCours} className="w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
