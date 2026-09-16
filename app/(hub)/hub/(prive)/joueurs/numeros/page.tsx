import type { Metadata } from "next";

import TableauNumeros from "@/components/hub/joueurs/tableau-numeros";
import { EnTetePage } from "@/components/hub/mise-en-page";
import { peutEditer } from "@/hub/droits";
import { listerJoueurs } from "@/hub/joueurs/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Numéros" };

/** Les numeros de maillot de l'effectif, pour remplir la feuille de match. */
export default async function PageNumeros() {
  const { user } = await exigerModule("players");
  const joueurs = await listerJoueurs();

  return (
    <>
      <EnTetePage
        titre="Numéros"
        description="Les deux maillots que chaque joueur peut porter, pour remplir la feuille de match. Rien à voir avec les numéros du site."
      />
      <TableauNumeros joueurs={joueurs} peutEditer={peutEditer(user, "players")} />
    </>
  );
}
