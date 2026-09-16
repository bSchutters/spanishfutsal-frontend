"use client";

import { ArrowLeft, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Etiquette, PastilleStatut, Vide } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { enregistrerFeuilleStats } from "@/hub/actions/joueurs";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import type { FeuilleStats, JoueurFeuille } from "@/hub/joueurs/donnees";
import {
  butsSaisis,
  COULEURS_ETAT_SAISIE,
  ecartAvecLeScore,
  LIBELLES_ETAT_SAISIE,
  type LigneStats,
} from "@/hub/joueurs/schema";
import { cn } from "@/lib/utils";

const LIGNE_VIDE = { buts: 0, assists: 0, jaunes: 0, rouges: 0, cleanSheet: false } as const;

/** Un compteur a deux boutons : assez gros pour un pouce, la valeur en cyan des qu'elle compte. */
function Compteur({
  libelle,
  valeur,
  max,
  disabled,
  onChange,
}: {
  libelle: string;
  valeur: number;
  max: number;
  disabled?: boolean;
  onChange: (valeur: number) => void;
}) {
  const bouton =
    "flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{libelle}</span>
      <div className="flex w-full items-center overflow-hidden rounded-md border border-border bg-background">
        <button
          type="button"
          className={cn(bouton, "rounded-l-md")}
          aria-label={`Retirer, ${libelle}`}
          disabled={disabled || valeur <= 0}
          onClick={() => onChange(valeur - 1)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span
          className={cn("min-w-4 flex-1 text-center text-sm font-semibold tabular-nums", valeur > 0 && "text-primary")}
          aria-live="polite"
          aria-label={`${libelle} : ${valeur}`}
        >
          {valeur}
        </span>
        <button
          type="button"
          className={cn(bouton, "rounded-r-md")}
          aria-label={`Ajouter, ${libelle}`}
          disabled={disabled || valeur >= max}
          onClick={() => onChange(valeur + 1)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Les numeros de feuille de match du joueur, ceux de la feuille officielle qu'on recopie. */
function Numero({ joueur }: { joueur: JoueurFeuille }) {
  const numeros = [joueur.numeroFeuille1, joueur.numeroFeuille2].filter((n): n is number => n !== null);
  return (
    <span className="w-12 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground">
      {numeros.length > 0 ? numeros.join(" · ") : "·"}
    </span>
  );
}

function NomJoueur({ joueur }: { joueur: JoueurFeuille }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate text-sm font-medium">
        {joueur.prenom} {joueur.nom}
      </span>
      {joueur.capitaine ? <Etiquette>C</Etiquette> : null}
    </span>
  );
}

/** Ce qu'une ligne dit, en une phrase : « 2 buts, 1 assist, 1 jaune ». */
function resumeLigne(ligne: LigneStats): string {
  const parts = [
    ligne.buts > 0 ? `${ligne.buts} but${ligne.buts > 1 ? "s" : ""}` : null,
    ligne.assists > 0 ? `${ligne.assists} assist${ligne.assists > 1 ? "s" : ""}` : null,
    ligne.jaunes > 0 ? `${ligne.jaunes} jaune${ligne.jaunes > 1 ? "s" : ""}` : null,
    ligne.rouges > 0 ? "1 rouge" : null,
    ligne.cleanSheet ? "clean sheet" : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(", ") : "a joué";
}

type Commun = {
  lignes: ReadonlyMap<number, LigneStats>;
  enCours: boolean;
  onBasculer: (joueur: JoueurFeuille, present: boolean) => void;
  onChanger: (joueurId: number, champs: Partial<LigneStats>) => void;
};

/** Un joueur de la feuille : l'interrupteur « a joue », puis ses compteurs une fois coche. */
function LigneJoueur({ joueur, lignes, enCours, onBasculer, onChanger }: Commun & { joueur: JoueurFeuille }) {
  const ligne = lignes.get(joueur.id);
  const present = ligne !== undefined;
  return (
    <li className={cn("px-4 py-3 transition-colors", present && "bg-primary/[0.04]")}>
      <label className="flex cursor-pointer items-center gap-3">
        <Switch
          checked={present}
          onCheckedChange={(coche) => onBasculer(joueur, coche)}
          disabled={enCours}
          aria-label={`${joueur.prenom} ${joueur.nom} a joué`}
        />
        <Numero joueur={joueur} />
        <NomJoueur joueur={joueur} />
      </label>
      {ligne ? (
        <div className="mt-3 flex flex-col gap-2 sm:pl-11">
          <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-4">
            <Compteur libelle="Buts" valeur={ligne.buts} max={30} disabled={enCours} onChange={(v) => onChanger(joueur.id, { buts: v })} />
            <Compteur libelle="Assists" valeur={ligne.assists} max={30} disabled={enCours} onChange={(v) => onChanger(joueur.id, { assists: v })} />
            <Compteur libelle="Jaunes" valeur={ligne.jaunes} max={2} disabled={enCours} onChange={(v) => onChanger(joueur.id, { jaunes: v })} />
            <Compteur libelle="Rouge" valeur={ligne.rouges} max={1} disabled={enCours} onChange={(v) => onChanger(joueur.id, { rouges: v })} />
          </div>
          {joueur.gardien ? (
            <label className="flex w-fit cursor-pointer items-center gap-2 py-1 text-sm">
              <Checkbox
                checked={ligne.cleanSheet}
                onCheckedChange={(coche) => onChanger(joueur.id, { cleanSheet: coche === true })}
                disabled={enCours}
              />
              Clean sheet
            </label>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** Gardiens ou joueurs de champ, avec le compte de ceux qui ont joue. */
function Groupe({ titre, liste, ...commun }: Commun & { titre: string; liste: JoueurFeuille[] }) {
  if (liste.length === 0) return null;
  const combien = liste.filter((j) => commun.lignes.has(j.id)).length;
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{titre}</h2>
        <span className="text-xs text-muted-foreground">
          {combien} sur {liste.length}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {liste.map((j) => (
          <LigneJoueur key={j.id} joueur={j} {...commun} />
        ))}
      </ul>
    </section>
  );
}

const cle = (lignes: ReadonlyMap<number, LigneStats>) =>
  JSON.stringify([...lignes.values()].sort((a, b) => a.joueurId - b.joueurId));

/**
 * La feuille de stats d'un match. On coche qui a joue, puis on ajuste buts,
 * assists et cartons au bouton ; le gardien a sa clean sheet. Le total des
 * buts est compare au score du club, sans bloquer. Tout s'enregistre d'un
 * coup, la barre du bas reste sous le pouce.
 */
export default function FeuilleStatsMatch({ feuille: initiale, peutEditer }: { feuille: FeuilleStats; peutEditer: boolean }) {
  const router = useRouter();
  const [feuille, setFeuille] = useState(initiale);
  const [lignes, setLignes] = useState<Map<number, LigneStats>>(() => new Map(initiale.lignes.map((l) => [l.joueurId, l])));
  const [enregistre, setEnregistre] = useState(() => cle(new Map(initiale.lignes.map((l) => [l.joueurId, l]))));
  const [enCours, lancer] = useTransition();

  const { match, joueurs } = feuille;
  const modifie = cle(lignes) !== enregistre;
  const presentes = useMemo(() => [...lignes.values()], [lignes]);
  const ecart = ecartAvecLeScore(presentes, match.butsClub);

  // Une feuille modifiee ne se perd pas sur un rechargement par megarde.
  useEffect(() => {
    if (!modifie) return;
    const garde = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", garde);
    return () => window.removeEventListener("beforeunload", garde);
  }, [modifie]);

  const gardiens = joueurs.filter((j) => j.gardien);
  const champ = joueurs.filter((j) => !j.gardien);

  const basculer = (joueur: JoueurFeuille, present: boolean) => {
    setLignes((avant) => {
      const apres = new Map(avant);
      if (present) apres.set(joueur.id, { joueurId: joueur.id, ...LIGNE_VIDE });
      else apres.delete(joueur.id);
      return apres;
    });
  };

  const changer = (joueurId: number, champs: Partial<LigneStats>) => {
    setLignes((avant) => {
      const ligne = avant.get(joueurId);
      if (!ligne) return avant;
      const apres = new Map(avant);
      apres.set(joueurId, { ...ligne, ...champs });
      return apres;
    });
  };

  const toutLEffectif = () => {
    setLignes((avant) => {
      const apres = new Map(avant);
      for (const j of joueurs) if (!apres.has(j.id)) apres.set(j.id, { joueurId: j.id, ...LIGNE_VIDE });
      return apres;
    });
  };

  const commun = { lignes, enCours, onBasculer: basculer, onChanger: changer };

  const enregistrer = () => {
    lancer(async () => {
      const r = await enregistrerFeuilleStats({ matchId: match.id, lignes: presentes });
      if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
      setFeuille(r.donnees);
      const relues = new Map(r.donnees.lignes.map((l) => [l.joueurId, l]));
      setLignes(relues);
      setEnregistre(cle(relues));
      toast.success("Feuille enregistrée.");
      router.refresh();
    });
  };

  const enTete = (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <Link href="/hub/joueurs/stats" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Tous les matchs
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {match.domicile ? "UDA" : match.adversaire} vs {match.domicile ? match.adversaire : "UDA"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {match.debut ? `${formaterDateCourte(match.debut)}${match.sansHeure ? "" : ` à ${formaterHeure(match.debut)}`}` : "Date à venir"}
          {match.competition ? ` · ${match.competition}` : ""}
          {` · ${match.domicile ? "Domicile" : "Extérieur"}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {match.score ? <span className="text-2xl font-semibold tabular-nums">{match.score}</span> : null}
        <Etiquette>
          <PastilleStatut couleur={COULEURS_ETAT_SAISIE[match.etat]} libelle={LIBELLES_ETAT_SAISIE[match.etat]} />
        </Etiquette>
      </div>
    </div>
  );

  if (!peutEditer) {
    const parJoueur = new Map(joueurs.map((j) => [j.id, j]));
    return (
      <>
        {enTete}
        {presentes.length === 0 ? (
          <Vide>Aucune statistique saisie pour ce match.</Vide>
        ) : (
          <section className="rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {presentes.map((ligne) => {
                const joueur = parJoueur.get(ligne.joueurId);
                if (!joueur) return null;
                return (
                  <li key={ligne.joueurId} className="flex items-center gap-3 px-4 py-3">
                    <Numero joueur={joueur} />
                    <NomJoueur joueur={joueur} />
                    <span className="shrink-0 text-xs text-muted-foreground">{resumeLigne(ligne)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      {enTete}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Cochez qui a joué, puis comptez les buts, assists et cartons.</p>
        <div className="flex gap-2">
          <Button type="button" variant="hubSecondary" size="sm" onClick={toutLEffectif} disabled={enCours || lignes.size === joueurs.length}>
            Tout l&apos;effectif a joué
          </Button>
          <Button type="button" variant="hubSecondary" size="sm" onClick={() => setLignes(new Map())} disabled={enCours || lignes.size === 0}>
            Vider
          </Button>
        </div>
      </div>

      <Groupe titre="Gardiens" liste={gardiens} {...commun} />
      <Groupe titre="Joueurs de champ" liste={champ} {...commun} />

      {/* Collee au bas de la zone qui defile, au-dessus de la barre d'onglets du telephone. */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 mt-auto border-t border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6 md:bottom-0 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            <span className="font-medium">
              {lignes.size} joueur{lignes.size > 1 ? "s" : ""} · {butsSaisis(presentes)} but{butsSaisis(presentes) > 1 ? "s" : ""}
            </span>
            {ecart ? <span className="block text-xs text-[#f2c14e]">{ecart}</span> : null}
            {modifie && !ecart ? <span className="block text-xs text-muted-foreground">Modifications non enregistrées.</span> : null}
          </div>
          <Button type="button" variant="hub" onClick={enregistrer} disabled={enCours || !modifie}>
            {enCours ? "Enregistrement…" : "Enregistrer la feuille"}
          </Button>
        </div>
      </div>
    </>
  );
}
