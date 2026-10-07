import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import EntreePack from "@/components/hub/pack/entree-pack";
import FormulaireCommande from "@/components/hub/pack/formulaire-commande";
import { tanker } from "@/components/hub/pack/police-tanker";
import { formaterDateSansAnnee, versChampDate } from "@/hub/dates";
import { accesValide, COOKIE_ACCES_PACK, jetonBienForme } from "@/hub/pack/acces";
import { dateLimitePassee } from "@/hub/pack/calculs";
import { chargerReglagesPack, listerArticles, listerEffectifActif, montantDesCommandes } from "@/hub/pack/donnees";
import { cn } from "@/lib/utils";

// Le titre sans le suffixe du Hub : cette page est celle des joueurs.
export const metadata: Metadata = { title: { absolute: "Pack UD Asturiana" } };
export const dynamic = "force-dynamic";

function Carte({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{children}</p>;
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
      <div className="mx-auto w-full max-w-md">
        <EntreePack jeton={jeton} />
      </div>
    );
  } else if (ferme) {
    contenu = <Carte>Les commandes sont fermées pour le moment. Le club vous préviendra à la prochaine ouverture.</Carte>;
  } else {
    // Le total des commandes qui attendent Joma, sans rien dire de qui a commande quoi : leurs totaux seuls.
    const [articles, effectif, montantGroupe] = await Promise.all([
      listerArticles({ actifsSeulement: true }),
      listerEffectifActif(),
      montantDesCommandes("received"),
    ]);
    contenu = <FormulaireCommande jeton={jeton} articles={articles} effectif={effectif} flocage={reglages.flocage} montantGroupe={montantGroupe} />;
  }

  const sousTitre =
    entre && !ferme && reglages.dateLimite
      ? `Commandes ouvertes jusqu'au ${formaterDateSansAnnee(`${reglages.dateLimite}T12:00:00Z`)} inclus.`
      : "Les articles Joma du club, logo compris.";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Un bandeau aux couleurs du club : le navy, l'or en fines rayures comme sur les epaules du maillot, le titre dans la police du flocage. */}
      <header className="relative isolate overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_140%_at_0%_0%,var(--spanish-bg)_0%,var(--spanish-bg-dark)_55%,var(--spanish-bg-dark-minus)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 end-0 -z-10 w-3/4 bg-[repeating-linear-gradient(135deg,var(--spanish-accent-2)_0_2px,transparent_2px_16px)] opacity-[0.09] [mask-image:linear-gradient(to_left,black,transparent)]"
        />
        <div className="mx-auto flex w-full max-w-[90rem] items-center gap-4 px-4 pt-[calc(1.75rem+env(safe-area-inset-top))] pb-7 sm:gap-6 sm:px-6 sm:py-10 lg:px-8">
          <Image src="/assets/images/svg/logo-asturiana.svg" alt="" width={80} height={80} priority className="size-14 shrink-0 sm:size-20" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-spanish-accent-2 uppercase sm:text-xs">UD Asturiana × Joma</p>
            <h1 className={cn(tanker.className, "mt-1 text-4xl leading-[0.95] uppercase sm:text-6xl")}>Le pack du club</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{sousTitre}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-10">{contenu}</main>
    </div>
  );
}
