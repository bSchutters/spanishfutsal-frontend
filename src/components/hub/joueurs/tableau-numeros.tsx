"use client";

import { Check, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Etiquette, Panneau, Vide } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { enregistrerNumeros } from "@/hub/actions/joueurs";
import type { JoueurFeuille } from "@/hub/joueurs/donnees";
import { joueursParNumero, MESSAGE_PLAGE, numeroDeMaillot, refusNumero, trierJoueurs, type ChampNumero } from "@/hub/joueurs/schema";
import { cn } from "@/lib/utils";

const NUMERO_CLASSE = "font-mono text-xl font-semibold tabular-nums";

/**
 * Une case de numero en edition : un champ qui se valide en quittant la
 * case ou avec Entree, et qui revient a sa valeur avec Echap. Vide, le
 * numero s'efface.
 */
function CelluleNumero({
  valeur,
  libelle,
  enCours,
  onCommit,
}: {
  valeur: number | null;
  libelle: string;
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
    if (nouveau !== null && !numeroDeMaillot(nouveau)) {
      toast.error(MESSAGE_PLAGE);
      return;
    }
    onCommit(nouveau);
  };

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
        "h-11 w-14 rounded-md border border-input bg-background text-center outline-none transition-colors placeholder:text-muted-foreground/40",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:opacity-50",
      )}
    />
  );
}

/** Une case de numero en affichage : grande, lisible de loin. Un numero hors des maillots ressort en rouge. */
function NumeroAffiche({ valeur }: { valeur: number | null }) {
  return (
    <span
      className={cn(NUMERO_CLASSE, valeur === null && "text-muted-foreground/40", valeur !== null && !numeroDeMaillot(valeur) && "text-destructive")}
      title={valeur !== null && !numeroDeMaillot(valeur) ? "Hors des maillots, du 2 au 14" : undefined}
    >
      {valeur ?? "·"}
    </span>
  );
}

/** Un groupe de l'effectif, gardiens ou joueurs de champ, en trois colonnes : les deux numeros, puis le nom. */
function Groupe({
  titre,
  liste,
  edition,
  enCours,
  onEnregistrer,
}: {
  titre: string;
  liste: JoueurFeuille[];
  edition: boolean;
  enCours: ReadonlySet<number>;
  onEnregistrer: (joueur: JoueurFeuille, champ: ChampNumero, valeur: number | null) => void;
}) {
  if (liste.length === 0) return null;
  const colonnes = "grid grid-cols-[3.5rem_3.5rem_minmax(0,1fr)] items-center gap-x-3";
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className={cn(colonnes, "border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground")}>
        <span className="text-center">N° 1</span>
        <span className="text-center">N° 2</span>
        <span>{titre}</span>
      </div>
      <ul className="divide-y divide-border">
        {liste.map((j) => (
          <li key={j.id} className={cn(colonnes, "px-4", edition ? "py-1.5" : "py-2.5")}>
            {(["numeroFeuille1", "numeroFeuille2"] as const).map((champ, index) => (
              <div key={champ} className="flex justify-center">
                {edition ? (
                  <CelluleNumero
                    valeur={j[champ]}
                    libelle={`Numéro ${index + 1} de ${j.prenom} ${j.nom}`}
                    enCours={enCours.has(j.id)}
                    onCommit={(v) => onEnregistrer(j, champ, v)}
                  />
                ) : (
                  <NumeroAffiche valeur={j[champ]} />
                )}
              </div>
            ))}
            <div className="flex min-w-0 items-center gap-2">
              {/* Le nom passe a la ligne plutot que d'etre coupe : c'est lui qu'on cherche. */}
              <span className="text-sm leading-tight">
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
 * par joueur, sans rapport avec les numeros du site. En affichage, la liste
 * se lit de loin ; le bouton Modifier ouvre la saisie. Un numero se porte
 * au plus par deux joueurs, l'un en principal, l'autre en secondaire, pour
 * tourner sans se retrouver a trois sur le meme maillot. La vue par numero
 * dit qui peut porter lequel.
 */
export default function TableauNumeros({ joueurs: initiaux, peutEditer }: { joueurs: JoueurFeuille[]; peutEditer: boolean }) {
  const [joueurs, setJoueurs] = useState(initiaux);
  const [edition, setEdition] = useState(false);
  const [enCours, setEnCours] = useState<Set<number>>(new Set());
  const parNumero = useMemo(() => joueursParNumero(joueurs), [joueurs]);
  const placesLibres = parNumero.filter((p) => p.maillot).reduce((total, p) => total + p.placesLibres, 0);

  if (joueurs.length === 0) return <Vide>Aucun joueur actif. L&apos;effectif se gère dans l&apos;admin, collection Joueurs.</Vide>;

  const enregistrer = async (joueur: JoueurFeuille, champ: ChampNumero, valeur: number | null) => {
    // La regle se verifie ici pour repondre tout de suite, et sur le serveur pour compter.
    const refus = refusNumero(joueurs, joueur.id, champ, valeur);
    if (refus) return void toast.error(refus);

    const avant = joueur;
    const apres = { ...joueur, [champ]: valeur };
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
  const commun = { edition, enCours, onEnregistrer: enregistrer };

  return (
    <>
      {peutEditer ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {edition
              ? "Touchez un numéro pour le changer, videz la case pour l'effacer. Du 2 au 14, deux joueurs au plus par numéro."
              : "Treize maillots, du 2 au 14. Un numéro se donne à deux joueurs au plus, l'un en principal, l'autre en secondaire."}
          </p>
          <Button
            type="button"
            variant={edition ? "hub" : "hubSecondary"}
            size="sm"
            // En edition les lignes restent en place ; le classement par numero se refait a la fermeture.
            onClick={() => {
              if (edition) setJoueurs((liste) => trierJoueurs(liste));
              setEdition((e) => !e);
            }}
            disabled={enCours.size > 0}
            aria-pressed={edition}
          >
            {edition ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
            {edition ? "Terminer" : "Modifier"}
          </Button>
        </div>
      ) : null}

      <Groupe titre="Gardiens" liste={gardiens} {...commun} />
      <Groupe titre="Joueurs de champ" liste={champ} {...commun} />

      <Panneau
        titre="Par numéro"
        description={`Qui peut porter quel maillot, et les places qui restent : ${placesLibres} sur ${parNumero.filter((p) => p.maillot).length * 2}.`}
      >
        <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {parNumero.map(({ numero, joueurs: porteurs, placesLibres: libres, maillot }) => (
            <li key={numero} className="flex items-baseline gap-3 px-4 py-2.5 sm:border-b sm:border-border">
              <span className={cn(NUMERO_CLASSE, "w-8 shrink-0 text-right", maillot ? "text-primary" : "text-destructive")}>{numero}</span>
              <span className="min-w-0 text-sm">
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
    </>
  );
}
