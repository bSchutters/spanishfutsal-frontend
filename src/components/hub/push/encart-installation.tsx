"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { proposerInstallation, type EtatPush } from "./etat-push";

/**
 * L'encart d'installation sur l'ecran d'accueil. Sur iPhone, la marche a
 * suivre, puisque Safari ne propose rien ; ailleurs, le bouton natif quand
 * le navigateur le permet. Rien une fois installe.
 */
export default function EncartInstallation({ etat, onFermer }: { etat: EtatPush; onFermer?: () => void }) {
  const [enCours, lancer] = useTransition();
  // Sur un ordinateur, l'installation n'a pas d'interet : rien a proposer.
  if (!etat.pret || etat.installe || !etat.mobile) return null;
  if (!etat.ios && !etat.installable) return null;

  return (
    <div className="flex flex-col gap-2 border-l-2 border-primary/60 bg-primary/5 px-4 py-3 text-sm">
      <p className="font-medium">Installer le Hub sur l&apos;écran d&apos;accueil</p>
      {etat.ios ? (
        <ol className="flex flex-col gap-1 text-muted-foreground">
          <li className="flex items-center gap-2">
            <Share className="size-4 shrink-0" aria-hidden="true" />
            Touchez « Partager » en bas de Safari.
          </li>
          <li className="flex items-center gap-2">
            <SquarePlus className="size-4 shrink-0" aria-hidden="true" />
            Puis « Sur l&apos;écran d&apos;accueil ».
          </li>
        </ol>
      ) : (
        <p className="text-muted-foreground">Le Hub s&apos;ouvrira comme une application, avec ses notifications.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Les notifications ne fonctionnent qu&apos;une fois le Hub installé et ouvert depuis l&apos;écran d&apos;accueil.
      </p>
      <div className="flex flex-wrap gap-2">
        {etat.installable ? (
          <Button type="button" variant="hub" size="sm" disabled={enCours} onClick={() => lancer(() => proposerInstallation())}>
            <Download aria-hidden="true" />
            Installer
          </Button>
        ) : null}
        {onFermer ? (
          <Button type="button" variant="ghost" size="sm" onClick={onFermer}>
            Plus tard
          </Button>
        ) : null}
      </div>
    </div>
  );
}
