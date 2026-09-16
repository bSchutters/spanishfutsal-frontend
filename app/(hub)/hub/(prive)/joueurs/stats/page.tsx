import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { EnTetePage, Etiquette, Panneau, PastilleStatut, Vide } from "@/components/hub/mise-en-page";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import { listerMatchsSaison, type MatchDate } from "@/hub/joueurs/donnees";
import { COULEURS_ETAT_SAISIE, LIBELLES_ETAT_SAISIE, type EtatSaisie } from "@/hub/joueurs/schema";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Stats" };

function ListeMatchs({ matchs }: { matchs: MatchDate[] }) {
  return (
    <ul className="divide-y divide-border">
      {matchs.map((m) => (
        <li key={m.id}>
          <Link
            href={`/hub/joueurs/stats/${m.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
          >
            <span className="w-24 shrink-0 text-xs text-muted-foreground">
              <span className="block">{formaterDateCourte(m.debut)}</span>
              {m.sansHeure ? null : <span className="block">{formaterHeure(m.debut)}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {m.domicile ? "UDA" : m.adversaire} vs {m.domicile ? m.adversaire : "UDA"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {m.domicile ? "Domicile" : "Extérieur"}
                {m.competition ? ` · ${m.competition}` : ""}
                {m.nbLignes > 0 ? ` · ${m.nbLignes} joueur${m.nbLignes > 1 ? "s" : ""}` : ""}
              </span>
            </span>
            {m.score ? <span className="shrink-0 text-sm font-semibold tabular-nums">{m.score}</span> : null}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const ORDRE: EtatSaisie[] = ["a_saisir", "saisie", "a_venir"];

const DESCRIPTIONS: Record<EtatSaisie, string> = {
  a_saisir: "Le score est là, la feuille pas encore.",
  saisie: "Les feuilles remplies, à corriger au besoin.",
  a_venir: "Sans score pour le moment.",
};

/** Les matchs de la saison, ceux qui attendent leur feuille en premier. */
export default async function PageStats() {
  await exigerModule("players");
  const { matchs, saisonActive } = await listerMatchsSaison();

  return (
    <>
      <EnTetePage titre="Stats" description="Une feuille par match : qui a joué, buts, assists, cartons." />
      {!saisonActive ? (
        <Vide>Aucune saison active. Elle se choisit dans l&apos;admin, collection Saisons.</Vide>
      ) : matchs.length === 0 ? (
        <Vide>Aucun match dans la saison active.</Vide>
      ) : (
        ORDRE.map((etat) => {
          const liste = matchs.filter((m) => m.etat === etat);
          if (liste.length === 0) return null;
          return (
            <Panneau
              key={etat}
              titre={LIBELLES_ETAT_SAISIE[etat]}
              description={DESCRIPTIONS[etat]}
              actions={
                <Etiquette>
                  <PastilleStatut couleur={COULEURS_ETAT_SAISIE[etat]} libelle={String(liste.length)} />
                </Etiquette>
              }
            >
              {/* Les matchs a venir, du prochain au plus lointain ; les autres, du plus recent au plus ancien. */}
              <ListeMatchs matchs={etat === "a_venir" ? [...liste].reverse() : liste} />
            </Panneau>
          );
        })
      )}
    </>
  );
}
