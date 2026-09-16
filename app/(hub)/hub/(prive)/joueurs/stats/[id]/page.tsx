import type { Metadata } from "next";
import Link from "next/link";

import FeuilleStatsMatch from "@/components/hub/joueurs/feuille-stats";
import { Avis, EnTetePage } from "@/components/hub/mise-en-page";
import { peutEditer } from "@/hub/droits";
import { chargerFeuilleStats } from "@/hub/joueurs/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Feuille de stats" };

/** La feuille d'un match : lecture pour tous, saisie en edition. */
export default async function PageFeuilleStats({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await exigerModule("players");
  const { id } = await params;
  const matchId = Number(id);
  const feuille = Number.isInteger(matchId) && matchId > 0 ? await chargerFeuilleStats(matchId) : null;

  if (!feuille) {
    return (
      <>
        <EnTetePage titre="Feuille de stats" />
        <Avis>
          Ce match n&apos;est pas dans la saison en cours.{" "}
          <Link href="/hub/joueurs/stats" className="underline underline-offset-2">
            Retour aux matchs
          </Link>
        </Avis>
      </>
    );
  }

  return <FeuilleStatsMatch feuille={feuille} peutEditer={peutEditer(user, "players")} />;
}
