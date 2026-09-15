import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import BoutonDeconnexion from "@/components/hub/bouton-deconnexion";
import { aAccesHub } from "@/hub/droits";
import { lireSession, nomAffiche } from "@/hub/session";
import FormulaireConnexion from "./formulaire";

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
    <main className="flex min-h-dvh flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[22.5rem]">
          <div className="mb-6 flex items-center gap-3">
            <Image
              src="/assets/images/svg/logo-asturiana.svg"
              alt=""
              width={36}
              height={36}
              className="size-9"
              priority
            />
            <div className="leading-tight">
              <p className="text-base font-semibold">Hub UDA</p>
              <p className="text-xs text-muted-foreground">Espace privé du club</p>
            </div>
          </div>

          {session ? (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm">
                {nomAffiche(session.user)}, ce compte n&apos;a pas accès au Hub. Demandez à un administrateur de
                l&apos;ouvrir.
              </p>
              <div className="mt-4">
                <BoutonDeconnexion libelle="Changer de compte" />
              </div>
            </div>
          ) : (
            <FormulaireConnexion />
          )}
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">UD Asturiana</p>
    </main>
  );
}
