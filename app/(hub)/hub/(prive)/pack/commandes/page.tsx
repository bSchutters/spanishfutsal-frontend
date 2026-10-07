import type { Metadata } from "next";
import Link from "next/link";

import { EnTetePage } from "@/components/hub/mise-en-page";
import Commandes from "@/components/hub/pack/commandes";
import { peutEditer } from "@/hub/droits";
import { chargerReglagesPack, listerArticles, listerCommandes, listerCommandesJoma, montantDesCommandes } from "@/hub/pack/donnees";
import { LIBELLES_STATUT_COMMANDE, STATUTS_COMMANDE, type StatutCommande } from "@/hub/pack/schema";
import { exigerModule } from "@/hub/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Commandes du pack" };

const FILTRES: Array<{ cle: StatutCommande | "toutes"; libelle: string }> = [
  { cle: "received", libelle: "Reçues" },
  { cle: "ordered", libelle: "Commandées" },
  { cle: "delivered", libelle: "Livrées" },
  { cle: "cancelled", libelle: "Annulées" },
  { cle: "toutes", libelle: "Toutes" },
];

/**
 * Les commandes du Pack, filtrees par statut. Par defaut, celles qui
 * attendent d'etre passees chez Joma.
 */
export default async function PageCommandes({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { user } = await exigerModule("pack");
  const { statut } = await searchParams;
  const filtre: StatutCommande | "toutes" =
    statut === "toutes" || STATUTS_COMMANDE.includes(statut as StatutCommande) ? (statut as StatutCommande | "toutes") : "received";

  const edition = peutEditer(user, "pack");

  const [commandes, catalogue, reglages, montantRecues, commandesJoma] = await Promise.all([
    listerCommandes(filtre === "toutes" ? null : filtre),
    listerArticles({ actifsSeulement: false }),
    chargerReglagesPack(),
    // Les commandes qui attendent Joma comptent pour le minimum, meme sous un autre filtre : leurs totaux suffisent.
    montantDesCommandes("received"),
    // La copie de leur PDF, pour qui peut editer seulement.
    edition ? listerCommandesJoma() : [],
  ]);

  return (
    <>
      <EnTetePage titre="Commandes" description="Les commandes des joueurs, à passer chez Joma." />

      <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
        {FILTRES.map((f) => (
          <Link
            key={f.cle}
            href={f.cle === "received" ? "/hub/pack/commandes" : `/hub/pack/commandes?statut=${f.cle}`}
            aria-current={filtre === f.cle ? "page" : undefined}
            title={f.cle === "toutes" ? undefined : LIBELLES_STATUT_COMMANDE[f.cle]}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs",
              filtre === f.cle ? "border-primary bg-secondary font-medium" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.libelle}
          </Link>
        ))}
      </nav>

      <Commandes
        key={filtre}
        montantRecues={montantRecues}
        commandes={commandes}
        catalogue={catalogue}
        flocage={reglages.flocage}
        commandesJoma={commandesJoma}
        peutEditer={edition}
      />
    </>
  );
}
