import type { Metadata } from "next";
import Link from "next/link";

import { EnTetePage } from "@/components/hub/mise-en-page";
import Commandes from "@/components/hub/pack/commandes";
import { peutEditer } from "@/hub/droits";
import { chargerReglagesPack, listerArticles, listerCommandes, listerCommandesJoma, montantACommander } from "@/hub/pack/donnees";
import {
  FILTRES_PAIEMENT,
  LIBELLES_STATUT_COMMANDE,
  STATUTS_COMMANDE,
  type FiltrePaiement,
  type StatutCommande,
} from "@/hub/pack/schema";
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

const FILTRES_DE_PAIEMENT: Array<{ cle: FiltrePaiement | null; libelle: string }> = [
  { cle: null, libelle: "Tous les paiements" },
  { cle: "a-payer", libelle: "À payer" },
  { cle: "payees", libelle: "Payées" },
];

/** L'adresse de la page avec ses deux filtres, sans ce qui vaut par defaut. */
function adresse(statut: StatutCommande | "toutes", paiement: FiltrePaiement | null): string {
  const params = new URLSearchParams();
  if (statut !== "received") params.set("statut", statut);
  if (paiement) params.set("paiement", paiement);
  const requete = params.toString();
  return requete ? `/hub/pack/commandes?${requete}` : "/hub/pack/commandes";
}

const classeFiltre = (actif: boolean) =>
  cn("rounded-md border px-2.5 py-1 text-xs", actif ? "border-primary bg-secondary font-medium" : "border-border text-muted-foreground hover:text-foreground");

/**
 * Les commandes du Pack, filtrees par statut et par paiement. Par defaut,
 * celles qui attendent d'etre passees chez Joma, payees ou non.
 */
export default async function PageCommandes({ searchParams }: { searchParams: Promise<{ statut?: string; paiement?: string }> }) {
  const { user } = await exigerModule("pack");
  const { statut, paiement } = await searchParams;
  const filtre: StatutCommande | "toutes" =
    statut === "toutes" || STATUTS_COMMANDE.includes(statut as StatutCommande) ? (statut as StatutCommande | "toutes") : "received";
  const filtrePaiement = FILTRES_PAIEMENT.includes(paiement as FiltrePaiement) ? (paiement as FiltrePaiement) : null;

  const edition = peutEditer(user, "pack");

  const [commandes, catalogue, reglages, montantRecues, commandesJoma] = await Promise.all([
    listerCommandes(filtre === "toutes" ? null : filtre, undefined, { paiement: filtrePaiement }),
    listerArticles({ actifsSeulement: false }),
    chargerReglagesPack(),
    // Ce qui attend Joma compte pour le minimum, meme sous un autre filtre : les lignes qui restent a commander.
    montantACommander(),
    // La copie de leur PDF, pour qui peut editer seulement.
    edition ? listerCommandesJoma() : [],
  ]);

  return (
    <>
      <EnTetePage titre="Commandes" description="Les commandes des joueurs, à passer chez Joma." />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
          {FILTRES.map((f) => (
            <Link
              key={f.cle}
              href={adresse(f.cle, filtrePaiement)}
              aria-current={filtre === f.cle ? "page" : undefined}
              title={f.cle === "toutes" ? undefined : LIBELLES_STATUT_COMMANDE[f.cle]}
              className={classeFiltre(filtre === f.cle)}
            >
              {f.libelle}
            </Link>
          ))}
        </nav>
        <nav aria-label="Filtrer par paiement" className="flex flex-wrap gap-1.5">
          {FILTRES_DE_PAIEMENT.map((f) => (
            <Link
              key={f.cle ?? "tous"}
              href={adresse(filtre, f.cle)}
              aria-current={filtrePaiement === f.cle ? "page" : undefined}
              className={classeFiltre(filtrePaiement === f.cle)}
            >
              {f.libelle}
            </Link>
          ))}
        </nav>
      </div>

      <Commandes
        key={`${filtre}-${filtrePaiement ?? "tous"}`}
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
