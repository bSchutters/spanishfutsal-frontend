"use client";

import { Plus, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Etiquette } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import type { JoueurFiche } from "@/hub/joueurs/donnees";
import { numerosEnDoublon, trierJoueurs } from "@/hub/joueurs/schema";
import { libellePoste, rangPoste } from "@/lib/postes";
import { cn } from "@/lib/utils";
import FormulaireJoueur, { type EtatFormulaireJoueur } from "./formulaire-joueur";

const NUMERO_CLASSE = "font-mono text-xl font-semibold tabular-nums";

/** Le numero du joueur en grand. En rouge quand une autre personne de l'effectif le porte aussi. */
function Numero({ valeur, doublon }: { valeur: number | null; doublon: boolean }) {
  return (
    <span
      className={cn(NUMERO_CLASSE, valeur === null && "text-muted-foreground/40", doublon && "text-destructive")}
      title={doublon ? "Ce numéro est porté par une autre personne" : undefined}
    >
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

/** Une categorie de l'effectif : le numero, puis la personne. Les inactifs en fin, estompes. */
function Groupe({
  titre,
  liste,
  avecNumeros,
  doublons,
  peutEditer,
  onOuvrir,
}: {
  titre: string;
  liste: JoueurFiche[];
  avecNumeros: boolean;
  doublons: ReadonlySet<number>;
  peutEditer: boolean;
  onOuvrir: (joueur: JoueurFiche) => void;
}) {
  if (liste.length === 0) return null;
  const colonnes = "grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3";
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className={cn(colonnes, "border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground")}>
        <span className="text-center">{avecNumeros ? "N°" : ""}</span>
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
              <span className="flex justify-center">{avecNumeros ? <Numero valeur={j.numero} doublon={j.numero !== null && j.actif && doublons.has(j.numero)} /> : null}</span>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar photo={j.photo} />
                <span className="min-w-0 text-sm leading-tight">
                  <span className="font-medium">{j.nom.toUpperCase()}</span> {j.prenom}
                </span>
                {j.capitaine ? <Etiquette>C</Etiquette> : null}
                {/* Le staff n'a pas de numero : son role tient la place. */}
                {!j.surFeuille && j.poste ? <Etiquette>{libellePoste(j.poste)}</Etiquette> : null}
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
 * joueurs, staff, chacun avec son numero. Un clic sur une ligne ouvre la
 * fiche.
 */
export default function Effectif({ joueurs: initiaux, peutEditer }: { joueurs: JoueurFiche[]; peutEditer: boolean }) {
  const [joueurs, setJoueurs] = useState(initiaux);
  const [formulaire, setFormulaire] = useState<EtatFormulaireJoueur | null>(null);
  // Le panneau garde sa derniere fiche le temps de se refermer ; le compteur
  // fait repartir le formulaire des valeurs a jour a chaque ouverture.
  const [ouverture, setOuverture] = useState({ ouvert: false, cle: 0 });

  // Les inactifs en fin de chaque categorie. Le staff suit la hierarchie du
  // club, du coach au reste, les joueurs leur ordre de numeros.
  const parCategorie = useMemo(() => {
    const actifsDAbord = (liste: JoueurFiche[]) => [...liste.filter((j) => j.actif), ...liste.filter((j) => !j.actif)];
    const parRang = (liste: JoueurFiche[]) =>
      [...liste].sort((a, b) => rangPoste(a.poste) - rangPoste(b.poste) || `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"));
    return {
      gardiens: actifsDAbord(joueurs.filter((j) => j.surFeuille && j.gardien)),
      champ: actifsDAbord(joueurs.filter((j) => j.surFeuille && !j.gardien)),
      staff: actifsDAbord(parRang(joueurs.filter((j) => !j.surFeuille))),
    };
  }, [joueurs]);

  const enregistre = (fiche: JoueurFiche) => {
    setJoueurs((liste) => trierJoueurs(liste.some((j) => j.id === fiche.id) ? liste.map((j) => (j.id === fiche.id ? fiche : j)) : [...liste, fiche]));
    setOuverture((o) => ({ ...o, ouvert: false }));
  };

  const ouvrirPanneau = (etat: EtatFormulaireJoueur) => {
    setFormulaire(etat);
    setOuverture((o) => ({ ouvert: true, cle: o.cle + 1 }));
  };

  // Les doublons se jugent sur les seules personnes de l'effectif actuel.
  const doublons = useMemo(() => numerosEnDoublon(joueurs.filter((j) => j.actif)), [joueurs]);

  const ouvrir = (joueur: JoueurFiche) => ouvrirPanneau({ mode: "modifier", joueur });
  const commun = { doublons, peutEditer, onOuvrir: ouvrir };

  return (
    <>
      {peutEditer ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Touchez une personne pour ouvrir sa fiche.
            {doublons.size > 0
              ? ` En rouge, un numéro porté par plusieurs personnes : ${[...doublons].sort((a, b) => a - b).join(", ")}.`
              : ""}
          </p>
          <Button type="button" variant="hub" size="sm" onClick={() => ouvrirPanneau({ mode: "creer" })}>
            <Plus aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      ) : null}

      <Groupe titre="Gardiens" liste={parCategorie.gardiens} avecNumeros {...commun} />
      <Groupe titre="Joueurs" liste={parCategorie.champ} avecNumeros {...commun} />
      <Groupe titre="Staff" liste={parCategorie.staff} avecNumeros={false} {...commun} />

      <FormulaireJoueur
        etat={formulaire}
        ouvert={ouverture.ouvert}
        cle={ouverture.cle}
        onFermer={() => setOuverture((o) => ({ ...o, ouvert: false }))}
        onEnregistre={enregistre}
      />
    </>
  );
}
