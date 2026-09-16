"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Etiquette, Panneau, Vide } from "@/components/hub/mise-en-page";
import { enregistrerNumeros } from "@/hub/actions/joueurs";
import type { JoueurFeuille } from "@/hub/joueurs/donnees";
import { joueursParNumero } from "@/hub/joueurs/schema";
import { cn } from "@/lib/utils";

const NUMERO_CLASSE = "font-mono text-xl font-semibold tabular-nums";

/**
 * Une case de numero : un champ qui se valide en quittant la case ou avec
 * Entree, et qui revient a sa valeur avec Echap. Vide, le numero s'efface.
 */
function CelluleNumero({
  valeur,
  libelle,
  editable,
  enCours,
  onCommit,
}: {
  valeur: number | null;
  libelle: string;
  editable: boolean;
  enCours: boolean;
  onCommit: (valeur: number | null) => void;
}) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? (valeur === null ? "" : String(valeur));

  const valider = () => {
    if (brouillon === null) return;
    const texte = brouillon.trim();
    setBrouillon(null);
    const nouveau = texte === "" ? null : Number(texte);
    if (nouveau === valeur) return;
    if (nouveau !== null && (!Number.isInteger(nouveau) || nouveau < 1 || nouveau > 99)) {
      toast.error("Un numéro de 1 à 99.");
      return;
    }
    onCommit(nouveau);
  };

  if (!editable) {
    return <span className={cn(NUMERO_CLASSE, valeur === null && "text-muted-foreground/40")}>{valeur ?? "·"}</span>;
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={affiche}
      placeholder="·"
      aria-label={libelle}
      disabled={enCours}
      onChange={(e) => setBrouillon(e.target.value.replace(/\D/g, ""))}
      onFocus={(e) => e.target.select()}
      onBlur={valider}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setBrouillon(null);
          e.currentTarget.blur();
        }
      }}
      className={cn(
        NUMERO_CLASSE,
        "h-11 w-14 rounded-md border border-transparent bg-transparent text-center outline-none transition-colors placeholder:text-muted-foreground/40",
        "hover:border-border focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:opacity-50",
      )}
    />
  );
}

/** Un groupe de l'effectif, gardiens ou joueurs de champ, en trois colonnes : les deux numeros, puis le nom. */
function Groupe({
  titre,
  liste,
  peutEditer,
  enCours,
  onEnregistrer,
}: {
  titre: string;
  liste: JoueurFeuille[];
  peutEditer: boolean;
  enCours: ReadonlySet<number>;
  onEnregistrer: (joueur: JoueurFeuille, champs: Partial<Pick<JoueurFeuille, "numeroFeuille1" | "numeroFeuille2">>) => void;
}) {
  if (liste.length === 0) return null;
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="grid grid-cols-[3.5rem_3.5rem_minmax(0,1fr)] items-center gap-x-3 border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-center">N° 1</span>
        <span className="text-center">N° 2</span>
        <span>{titre}</span>
      </div>
      <ul className="divide-y divide-border">
        {liste.map((j) => (
          <li key={j.id} className="grid grid-cols-[3.5rem_3.5rem_minmax(0,1fr)] items-center gap-x-3 px-4 py-1.5">
            <div className="flex justify-center">
              <CelluleNumero
                valeur={j.numeroFeuille1}
                libelle={`Numéro 1 de ${j.prenom} ${j.nom}`}
                editable={peutEditer}
                enCours={enCours.has(j.id)}
                onCommit={(v) => onEnregistrer(j, { numeroFeuille1: v })}
              />
            </div>
            <div className="flex justify-center">
              <CelluleNumero
                valeur={j.numeroFeuille2}
                libelle={`Numéro 2 de ${j.prenom} ${j.nom}`}
                editable={peutEditer}
                enCours={enCours.has(j.id)}
                onCommit={(v) => onEnregistrer(j, { numeroFeuille2: v })}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm">
                <span className="font-medium">{j.nom.toUpperCase()}</span> {j.prenom}
              </span>
              {j.capitaine ? <Etiquette>C</Etiquette> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Les numeros de feuille de match de l'effectif : deux maillots possibles
 * par joueur, sans rapport avec les numeros du site. Le club n'a que treize
 * numeros, ils se partagent : la vue par numero dit qui peut porter lequel,
 * pour ne pas donner deux fois le meme maillot le meme soir.
 */
export default function TableauNumeros({ joueurs: initiaux, peutEditer }: { joueurs: JoueurFeuille[]; peutEditer: boolean }) {
  const [joueurs, setJoueurs] = useState(initiaux);
  const [enCours, setEnCours] = useState<Set<number>>(new Set());
  const parNumero = useMemo(() => joueursParNumero(joueurs), [joueurs]);

  if (joueurs.length === 0) return <Vide>Aucun joueur actif. L&apos;effectif se gère dans l&apos;admin, collection Joueurs.</Vide>;

  const enregistrer = async (joueur: JoueurFeuille, champs: Partial<Pick<JoueurFeuille, "numeroFeuille1" | "numeroFeuille2">>) => {
    const avant = joueur;
    const apres = { ...joueur, ...champs };
    setJoueurs((liste) => liste.map((j) => (j.id === joueur.id ? apres : j)));
    setEnCours((s) => new Set(s).add(joueur.id));
    const r = await enregistrerNumeros({ joueurId: joueur.id, numero: apres.numeroFeuille1, numero2: apres.numeroFeuille2 });
    setEnCours((s) => {
      const suite = new Set(s);
      suite.delete(joueur.id);
      return suite;
    });
    if (!r.ok) {
      setJoueurs((liste) => liste.map((j) => (j.id === joueur.id ? avant : j)));
      toast.error(r.erreur);
      return;
    }
    if (r.donnees) {
      const relu = r.donnees;
      setJoueurs((liste) => liste.map((j) => (j.id === joueur.id ? relu : j)));
    }
    toast.success(`${apres.prenom} : numéros enregistrés.`);
  };

  const gardiens = joueurs.filter((j) => j.gardien);
  const champ = joueurs.filter((j) => !j.gardien);
  const commun = { peutEditer, enCours, onEnregistrer: enregistrer };

  return (
    <>
      <Groupe titre="Gardiens" liste={gardiens} {...commun} />
      <Groupe titre="Joueurs de champ" liste={champ} {...commun} />
      {peutEditer ? (
        <p className="text-xs text-muted-foreground">Touchez un numéro pour le changer, videz la case pour l&apos;effacer.</p>
      ) : null}

      <Panneau titre="Par numéro" description="Qui peut porter quel maillot. Un numéro se partage, mais pas le même soir.">
        {parNumero.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Aucun numéro renseigné.</p>
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
            {parNumero.map(({ numero, joueurs: porteurs }) => (
              <li key={numero} className="flex items-baseline gap-3 px-4 py-2.5 sm:border-b sm:border-border">
                <span className={cn(NUMERO_CLASSE, "w-8 shrink-0 text-right text-primary")}>{numero}</span>
                <span className="min-w-0 text-sm">
                  {porteurs.map((j, i) => (
                    <span key={j.id}>
                      {i > 0 ? ", " : ""}
                      <span className="font-medium">{j.nom.toUpperCase()}</span> {j.prenom}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panneau>
    </>
  );
}
