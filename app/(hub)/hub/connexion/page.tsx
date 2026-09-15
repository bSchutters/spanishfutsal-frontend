import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { aAccesHub } from "@/hub/droits";
import { lireSession, nomAffiche } from "@/hub/session";
import FormulaireConnexion from "./formulaire";
import BoutonDeconnexion from "@/components/hub/bouton-deconnexion";

export const metadata: Metadata = { title: "Connexion" };

/**
 * La porte du Hub. Deja connecte avec acces : direction l'accueil. Connecte
 * sans acces : le compte existe mais n'a pas ete ouvert, on le dit plutot que
 * de laisser croire a un mot de passe faux.
 */
export default async function PageConnexion() {
  const session = await lireSession();
  if (session && aAccesHub(session.user)) redirect("/hub");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/assets/images/svg/logo-asturiana.svg"
            alt=""
            width={72}
            height={72}
            className="h-18 w-18"
            priority
          />
          <h1 className="font-marjorie text-3xl font-black uppercase italic text-spanish-accent-2">Hub UDA</h1>
          <p className="text-sm text-muted-foreground">L&apos;espace privé du club.</p>
        </div>

        {session ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-balance">
              Bonjour {nomAffiche(session.user)}. Votre compte n&apos;a pas encore accès au Hub. Demandez à un
              administrateur de l&apos;ouvrir.
            </p>
            <div className="mt-5">
              <BoutonDeconnexion libelle="Changer de compte" />
            </div>
          </div>
        ) : (
          <FormulaireConnexion />
        )}
      </div>
    </main>
  );
}
