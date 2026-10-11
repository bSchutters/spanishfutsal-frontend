import type { Metadata } from "next";

import { Avis, EnTetePage } from "@/components/hub/mise-en-page";
import Catalogue from "@/components/hub/pack/catalogue";
import PersonnesPackForm from "@/components/hub/pack/personnes-pack";
import ReglagesPackForm from "@/components/hub/pack/reglages-pack";
import { peutEditer } from "@/hub/droits";
import { baseUrlHub } from "@/hub/flux/base-url";
import { chargerPersonnesPack, chargerReglagesPack, listerArticles } from "@/hub/pack/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Catalogue du pack" };

/**
 * Le catalogue du Pack et, pour qui peut l'editer, les reglages de la page
 * des joueurs et la liste de qui peut commander. Le mot de passe, le lien et
 * la liste ne sont pas montres en lecture.
 */
export default async function PageCatalogue() {
  const { user } = await exigerModule("pack");
  const edition = peutEditer(user, "pack");
  const [articles, reglages, personnes] = await Promise.all([
    listerArticles({ actifsSeulement: false }),
    chargerReglagesPack(),
    edition ? chargerPersonnesPack() : null,
  ]);

  return (
    <>
      <EnTetePage titre="Catalogue" description="Les articles Joma et la page de commande des joueurs." />
      {edition ? (
        <>
          <ReglagesPackForm reglages={reglages} baseUrl={baseUrlHub()} />
          {personnes ? <PersonnesPackForm personnes={personnes} /> : null}
        </>
      ) : (
        <Avis>{reglages.ouvert ? "Les commandes sont ouvertes." : "Les commandes sont fermées."}</Avis>
      )}
      <Catalogue articles={articles} peutEditer={edition} remiseGenerale={reglages.remise} />
    </>
  );
}
