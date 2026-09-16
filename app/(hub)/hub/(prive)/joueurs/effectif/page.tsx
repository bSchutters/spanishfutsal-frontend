import type { Metadata } from "next";

import Effectif from "@/components/hub/joueurs/effectif";
import { EnTetePage } from "@/components/hub/mise-en-page";
import { peutEditer } from "@/hub/droits";
import { listerEffectif } from "@/hub/joueurs/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Effectif" };

/** L'effectif du club, la collection Joueurs vue du Hub : fiches, photos, numeros de feuille de match. */
export default async function PageEffectif() {
  const { user } = await exigerModule("players");
  const joueurs = await listerEffectif();

  return (
    <>
      <EnTetePage titre="Effectif" description="Gardiens, joueurs et staff, avec leurs fiches et leurs numéros de feuille de match." />
      <Effectif joueurs={joueurs} peutEditer={peutEditer(user, "players")} />
    </>
  );
}
