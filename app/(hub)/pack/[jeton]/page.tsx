import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import EntreePack from "@/components/hub/pack/entree-pack";
import FormulaireCommande from "@/components/hub/pack/formulaire-commande";
import { formaterDateSansAnnee, versChampDate } from "@/hub/dates";
import { accesValide, COOKIE_ACCES_PACK, jetonBienForme } from "@/hub/pack/acces";
import { dateLimitePassee } from "@/hub/pack/calculs";
import { chargerReglagesPack, listerArticles, listerEffectifActif } from "@/hub/pack/donnees";

// Le titre sans le suffixe du Hub : cette page est celle des joueurs.
export const metadata: Metadata = { title: { absolute: "Pack UD Asturiana" } };
export const dynamic = "force-dynamic";

function Carte({ children }: { children: React.ReactNode }) {
  return <p className="max-w-xl rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">{children}</p>;
}

/**
 * La page de commande des joueurs. Cachee derriere un lien secret, puis un
 * mot de passe, sans compte : la commande arrive dans le Hub, sans paiement.
 * Un lien inconnu ou perime repond 404, comme une page qui n'existe pas.
 */
export default async function PagePack({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  if (!jetonBienForme(jeton)) notFound();
  const reglages = await chargerReglagesPack();
  if (reglages.jeton !== jeton) notFound();

  const cookie = (await cookies()).get(COOKIE_ACCES_PACK)?.value;
  const entre = accesValide(cookie, process.env.PAYLOAD_SECRET ?? "", reglages.jeton, reglages.motDePasse);
  const ferme = !reglages.ouvert || dateLimitePassee(reglages.dateLimite, versChampDate(new Date()));

  let contenu: React.ReactNode;
  if (!reglages.motDePasse) {
    contenu = <Carte>Cette page n&apos;est pas encore prête. Le club vous préviendra quand elle sera ouverte.</Carte>;
  } else if (!entre) {
    contenu = (
      <div className="w-full max-w-md">
        <EntreePack jeton={jeton} />
      </div>
    );
  } else if (ferme) {
    contenu = <Carte>Les commandes sont fermées pour le moment. Le club vous préviendra à la prochaine ouverture.</Carte>;
  } else {
    const [articles, effectif] = await Promise.all([listerArticles({ actifsSeulement: true }), listerEffectifActif()]);
    contenu = <FormulaireCommande jeton={jeton} articles={articles} effectif={effectif} flocage={reglages.flocage} />;
  }

  return (
    <main className="flex min-h-dvh w-full flex-col gap-6 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
      <header className="flex items-center gap-3">
        <Image src="/assets/images/svg/logo-asturiana.svg" alt="" width={48} height={48} className="size-12" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pack UD Asturiana</h1>
          <p className="text-sm text-muted-foreground">
            {entre && !ferme && reglages.dateLimite
              ? `Commandes ouvertes jusqu'au ${formaterDateSansAnnee(`${reglages.dateLimite}T12:00:00Z`)} inclus.`
              : "Les articles Joma du club."}
          </p>
        </div>
      </header>
      {contenu}
    </main>
  );
}
