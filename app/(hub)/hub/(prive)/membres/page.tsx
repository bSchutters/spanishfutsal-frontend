import type { Metadata } from "next";

import TableauMembres from "@/components/hub/membres/tableau-membres";
import { EnTetePage } from "@/components/hub/mise-en-page";
import { listerFlux, listerMembres } from "@/hub/membres/donnees";
import { exigerAdmin } from "@/hub/session";

export const metadata: Metadata = { title: "Membres" };

/**
 * Qui a acces a quoi dans le Hub. Reserve aux administrateurs : un manager
 * qui tenterait l'adresse repart vers l'accueil. La collection Users ne lui
 * laisserait de toute facon voir que sa propre fiche.
 */
export default async function PageMembres() {
  const { user } = await exigerAdmin();
  const [membres, flux] = await Promise.all([listerMembres(user), listerFlux(user)]);

  return (
    <>
      <EnTetePage titre="Membres" description="Qui entre dans le Hub, sur quels modules et quels flux." />
      <TableauMembres membres={membres} flux={flux} />
    </>
  );
}
