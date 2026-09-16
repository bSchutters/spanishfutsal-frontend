"use client";

import { Plus, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Etiquette, Panneau } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import type { JoueurFiche } from "@/hub/joueurs/donnees";
import { joueursParNumero, numeroDeMaillot, trierJoueurs } from "@/hub/joueurs/schema";
import { cn } from "@/lib/utils";
import FormulaireJoueur, { type EtatFormulaireJoueur } from "./formulaire-joueur";

const NUMERO_CLASSE = "font-mono text-xl font-semibold tabular-nums";

/** Un numero de feuille en grand. Hors des maillots du poste, en rouge. */
function Numero({ valeur, gardien }: { valeur: number | null; gardien: boolean }) {
  const horsMaillots = valeur !== null && !numeroDeMaillot(valeur, gardien);
  return (
    <span className={cn(NUMERO_CLASSE, valeur === null && "text-muted-foreground/40", horsMaillots && "text-destructive")}>
      {valeur ?? "·"}
    </span>
  );
}

/** Les photos du site sont des detoures en hauteur : le cadrage se cale sur le haut, la ou est le visage. */
function Avatar({ photo }: { photo: JoueurFiche["photo"] }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/40">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt="" className="size-full object-cover object-top" loading="lazy" />
      ) : (
        <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}

/** Une categorie de l'effectif : les deux numeros de feuille, puis la personne. Les inactifs en fin, estompes. */
function Groupe({
  titre,
  liste,
  avecNumeros,
  peutEditer,
  onOuvrir,
}: {
  titre: string;
  liste: JoueurFiche[];
  avecNumeros: boolean;
  peutEditer: boolean;
  onOuvrir: (joueur: JoueurFiche) => void;
}) {
  if (liste.length === 0) return null;
  const colonnes = "grid grid-cols-[3.5rem_3.5rem_minmax(0,1fr)] items-center gap-x-3";
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className={cn(colonnes, "border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground")}>
        <span className="text-center">{avecNumeros ? "N° 1" : ""}</span>
        <span className="text-center">{avecNumeros ? "N° 2" : ""}</span>
        <span>
          {titre} <span className="normal-case tracking-normal">· {liste.length}</span>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {liste.map((j) => (
          <li key={j.id}>
            <button
              type="button"
              onClick={() => onOuvrir(j)}
              disabled={!peutEditer}
              className={cn(
                colonnes,
                "w-full px-4 py-2 text-left transition-colors",
                peutEditer && "hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
                !j.actif && "opacity-50",
              )}
            >
              <span className="flex justify-center">{avecNumeros ? <Numero valeur={j.numeroFeuille1} gardien={j.gardien} /> : null}</span>
              <span className="flex justify-center">{avecNumeros ? <Numero valeur={j.numeroFeuille2} gardien={j.gardien} /> : null}</span>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar photo={j.photo} />
                <span className="min-w-0 text-sm leading-tight">
                  <span className="font-medium">{j.nom.toUpperCase()}</span> {j.prenom}
                </span>
                {j.capitaine ? <Etiquette>C</Etiquette> : null}
                {!j.actif ? <Etiquette>Inactif</Etiquette> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * L'effectif du club, la collection Joueurs du site vue du Hub : gardiens,
 * joueurs, staff, chacun avec ses deux numeros de feuille de match. Un clic
 * sur une ligne ouvre la fiche. Le bloc des maillots dit qui peut porter
 * quel numero et ou il reste de la place.
 */
export default function Effectif({ joueurs: initiaux, peutEditer }: { joueurs: JoueurFiche[]; peutEditer: boolean }) {
  const [joueurs, setJoueurs] = useState(initiaux);
  const [formulaire, setFormulaire] = useState<EtatFormulaireJoueur | null>(null);

  // Les inactifs en fin de chaque categorie.
  const parCategorie = useMemo(() => {
    const actifsDAbord = (liste: JoueurFiche[]) => [...liste.filter((j) => j.actif), ...liste.filter((j) => !j.actif)];
    return {
      gardiens: actifsDAbord(joueurs.filter((j) => j.surFeuille && j.gardien)),
      champ: actifsDAbord(joueurs.filter((j) => j.surFeuille && !j.gardien)),
      staff: actifsDAbord(joueurs.filter((j) => !j.surFeuille)),
    };
  }, [joueurs]);

  const actifsSurFeuille = useMemo(() => joueurs.filter((j) => j.actif && j.surFeuille), [joueurs]);
  const parNumero = useMemo(() => joueursParNumero(actifsSurFeuille), [actifsSurFeuille]);
  const placesLibres = parNumero.filter((p) => p.maillot).reduce((total, p) => total + p.placesLibres, 0);

  const enregistre = (fiche: JoueurFiche) => {
    setJoueurs((liste) => trierJoueurs(liste.some((j) => j.id === fiche.id) ? liste.map((j) => (j.id === fiche.id ? fiche : j)) : [...liste, fiche]));
    setFormulaire(null);
  };

  const ouvrir = (joueur: JoueurFiche) => setFormulaire({ mode: "modifier", joueur });
  const commun = { peutEditer, onOuvrir: ouvrir };

  return (
    <>
      {peutEditer ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Touchez une personne pour ouvrir sa fiche.</p>
          <Button type="button" variant="hub" size="sm" onClick={() => setFormulaire({ mode: "creer" })}>
            <Plus aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      ) : null}

      <Groupe titre="Gardiens" liste={parCategorie.gardiens} avecNumeros {...commun} />
      <Groupe titre="Joueurs" liste={parCategorie.champ} avecNumeros {...commun} />
      <Groupe titre="Staff" liste={parCategorie.staff} avecNumeros={false} {...commun} />

      <Panneau
        titre="Maillots"
        description={`Du 2 au 14 pour les joueurs, le 1 et le 21 pour les gardiens, deux porteurs au plus par numéro. Places libres : ${placesLibres} sur ${parNumero.filter((p) => p.maillot).length * 2}.`}
      >
        <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {parNumero.map(({ numero, joueurs: porteurs, placesLibres: libres, maillot, gardien }) => (
            <li key={numero} className="flex items-baseline gap-3 px-4 py-2.5 sm:border-b sm:border-border">
              <span className={cn(NUMERO_CLASSE, "w-8 shrink-0 text-right", maillot ? "text-primary" : "text-destructive")}>{numero}</span>
              <span className="min-w-0 text-sm">
                {gardien ? <Etiquette className="mr-2 align-text-bottom">G</Etiquette> : null}
                {porteurs.map((j, i) => (
                  <span key={j.id}>
                    {i > 0 ? ", " : ""}
                    <span className="font-medium">{j.nom.toUpperCase()}</span> {j.prenom}
                  </span>
                ))}
                {!maillot ? (
                  <span className="text-destructive"> · hors des maillots</span>
                ) : libres === 2 ? (
                  <span className="text-muted-foreground">libre</span>
                ) : libres === 1 ? (
                  <span className="text-muted-foreground"> · une place</span>
                ) : (
                  <span className="text-muted-foreground"> · complet</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Panneau>

      <FormulaireJoueur etat={formulaire} effectif={joueurs} onFermer={() => setFormulaire(null)} onEnregistre={enregistre} />
    </>
  );
}
