import type { Metadata } from "next";

import { Avis, EnTetePage } from "@/components/hub/mise-en-page";
import Catalogue from "@/components/hub/pack/catalogue";
import OngletsPack from "@/components/hub/pack/onglets-pack";
import ReglagesPackForm from "@/components/hub/pack/reglages-pack";
import { peutEditer } from "@/hub/droits";
import { baseUrlHub } from "@/hub/flux/base-url";
import { chargerReglagesPack, listerArticles } from "@/hub/pack/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Catalogue du pack" };

/**
 * Le catalogue du Pack et, pour qui peut l'editer, les reglages de la page
 * des joueurs. Le mot de passe et le lien ne sont pas montres en lecture.
 */
export default async function PageCatalogue() {
  const { user } = await exigerModule("pack");
  const edition = peutEditer(user, "pack");
  const [articles, reglages] = await Promise.all([listerArticles({ actifsSeulement: false }), chargerReglagesPack()]);

  return (
    <>
      <EnTetePage titre="Pack" description="Le catalogue Joma et la page de commande des joueurs." actions={<OngletsPack actif="catalogue" />} />
      {edition ? (
        <ReglagesPackForm reglages={reglages} baseUrl={baseUrlHub()} />
      ) : (
        <Avis>{reglages.ouvert ? "Les commandes sont ouvertes." : "Les commandes sont fermées."}</Avis>
      )}
      <Catalogue articles={articles} peutEditer={edition} remiseGenerale={reglages.remise} />
    </>
  );
}
