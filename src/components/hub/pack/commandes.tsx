"use client";

import { FileDown, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Panneau, PastilleStatut } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { passerCommandeesChezJoma } from "@/hub/actions/pack";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import { avancementJoma, enNomsJoma, formaterPrix, MINIMUM_JOMA, recapJoma, taillesSelonNomJoma, totalDes } from "@/hub/pack/calculs";
import {
  COULEURS_STATUT_COMMANDE,
  LIBELLES_STATUT_COMMANDE,
  type Article,
  type Commande,
  type PrixFlocage,
} from "@/hub/pack/schema";
import { cn } from "@/lib/utils";
import FicheCommande from "./fiche-commande";

const pieces = (c: Pick<Commande, "lignes">) => c.lignes.reduce((n, l) => n + l.quantite, 0);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Une barre qui se remplit jusqu'au minimum Joma, verte une fois atteint. */
function BarreMinimum({ montant, libelle }: { montant: number; libelle: string }) {
  const { atteint, part } = avancementJoma(montant);
  return (
    <div
      role="progressbar"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={MINIMUM_JOMA}
      aria-valuenow={Math.min(montant, MINIMUM_JOMA)}
      aria-valuetext={`${formaterPrix(montant)} sur ${formaterPrix(MINIMUM_JOMA)}`}
      className="h-2 overflow-hidden rounded-full bg-secondary"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${part * 100}%`, backgroundColor: atteint ? COULEURS_STATUT_COMMANDE.delivered : "var(--primary)" }}
      />
    </div>
  );
}

/**
 * Le minimum de commande chez Joma : le montant des commandes recues, qui
 * attendent d'etre passees, face aux 150 euros demandes.
 */
function MinimumJoma({ montant }: { montant: number }) {
  const { atteint, reste } = avancementJoma(montant);
  return (
    <section aria-labelledby="minimum-joma" className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="minimum-joma" className="text-sm font-semibold">
          Minimum de commande Joma
        </h2>
        <p className="text-sm tabular-nums">
          <span className="font-semibold">{formaterPrix(montant)}</span>
          <span className="text-muted-foreground"> sur {formaterPrix(MINIMUM_JOMA)}</span>
        </p>
      </div>
      <div className="mt-2">
        <BarreMinimum montant={montant} libelle="Montant des commandes reçues" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {atteint
          ? "Minimum atteint : les commandes reçues peuvent partir chez Joma."
          : `Encore ${formaterPrix(reste)} de commandes reçues avant de pouvoir commander chez Joma.`}
      </p>
    </section>
  );
}

/**
 * La preparation de la commande Joma : les articles des commandes cochees,
 * a garder ou a ecarter, le PDF a envoyer, puis le passage des commandes en
 * « commandee chez Joma ».
 */
function PreparationJoma({
  commandes,
  catalogue,
  ouvert,
  onFermer,
  onPassees,
}: {
  commandes: Commande[];
  catalogue: Article[];
  ouvert: boolean;
  onFermer: () => void;
  onPassees: (ids: number[]) => void;
}) {
  const [ecartes, setEcartes] = useState<Set<string>>(new Set());
  const [telechargement, setTelechargement] = useState(false);
  const [enCours, lancer] = useTransition();

  const articles = useMemo(() => {
    const compte = new Map<string, number>();
    for (const c of commandes) for (const l of c.lignes) compte.set(l.article, (compte.get(l.article) ?? 0) + l.quantite);
    return [...compte.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [commandes]);

  // L'apercu du PDF, comme lui : sous les noms Joma ; les cases a cocher gardent les noms affiches.
  const recap = recapJoma(enNomsJoma(commandes, catalogue, ecartes), new Set(), taillesSelonNomJoma(catalogue));
  const ids = commandes.map((c) => c.id);
  // Ce qui part vraiment chez Joma : les lignes des commandes cochees, sans les articles ecartes.
  const montant = totalDes(commandes.flatMap((c) => c.lignes).filter((l) => !ecartes.has(l.article)));
  const minimum = avancementJoma(montant);

  const telecharger = async () => {
    setTelechargement(true);
    try {
      const reponse = await fetch("/api/hub/pack/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, ecartes: [...ecartes] }),
        credentials: "include",
      });
      if (!reponse.ok) {
        const json = (await reponse.json().catch(() => ({}))) as { erreur?: string };
        throw new Error(json.erreur ?? `${reponse.status}`);
      }
      const fichier = await reponse.blob();
      const nom = /filename="([^"]+)"/.exec(reponse.headers.get("Content-Disposition") ?? "")?.[1] ?? "commande-joma.pdf";
      const url = URL.createObjectURL(fichier);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = nom;
      lien.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (erreur) {
      toast.error(erreur instanceof Error && erreur.message ? erreur.message : "Le PDF n'a pas pu être créé.");
    } finally {
      setTelechargement(false);
    }
  };

  const passer = () =>
    lancer(async () => {
      const r = await passerCommandeesChezJoma(ids);
      if (!r.ok) return void toast.error(r.erreur);
      toast.success(`${pluriel(ids.length, "commande")} passée${ids.length > 1 ? "s" : ""} en « commandée chez Joma ».`);
      onPassees(ids);
    });

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      {/* Une seule colonne qui ne s'elargit jamais au contenu : les longs noms Joma passent a la ligne. */}
      <DialogContent className="max-h-[90dvh] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Commande Joma</DialogTitle>
          <DialogDescription>
            {pluriel(commandes.length, "commande")} cochée{commandes.length > 1 ? "s" : ""}. Décochez un article pour le laisser hors du PDF.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {articles.map(([nom, quantite]) => (
            <li key={nom}>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox
                  checked={!ecartes.has(nom)}
                  onCheckedChange={(c) =>
                    setEcartes((x) => {
                      const suivant = new Set(x);
                      if (c === true) suivant.delete(nom);
                      else suivant.add(nom);
                      return suivant;
                    })
                  }
                />
                <span className="flex-1">{nom}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{pluriel(quantite, "pièce")}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="rounded-md border border-border">
          <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
            Dans le PDF : {pluriel(recap.pieces, "pièce")} sur {pluriel(recap.totaux.length, "ligne")}, sans les flocages.
          </p>
          <div className="flex flex-col gap-2 border-b border-border px-3 py-2">
            <p className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Montant de la commande</span>
              <span className="tabular-nums">
                <span className="font-semibold">{formaterPrix(montant)}</span>
                <span className="text-muted-foreground"> sur {formaterPrix(MINIMUM_JOMA)} minimum</span>
              </span>
            </p>
            <BarreMinimum montant={montant} libelle="Montant de la commande Joma" />
            {minimum.atteint ? null : (
              <p className="text-xs" style={{ color: COULEURS_STATUT_COMMANDE.received }}>
                Il manque {formaterPrix(minimum.reste)} pour atteindre le minimum Joma.
              </p>
            )}
          </div>
          <ul className="max-h-48 divide-y divide-border overflow-y-auto text-xs">
            {recap.totaux.map((t) => (
              <li key={[t.reference, t.article, t.couleur, t.taille].join("|")} className="flex items-center gap-2 px-3 py-1.5">
                <span className="w-24 shrink-0 truncate font-mono text-muted-foreground">{t.reference || "sans réf."}</span>
                <span className="min-w-0 flex-1 break-words">{[t.article, t.couleur].filter(Boolean).join(" ")}</span>
                <span className="shrink-0">{t.taille}</span>
                <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{t.quantite}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="hubSecondary" disabled={enCours || recap.pieces === 0} onClick={passer}>
            <PackageCheck aria-hidden="true" />
            Marquer commandées
          </Button>
          <Button type="button" variant="hub" disabled={telechargement || recap.pieces === 0} onClick={() => void telecharger()}>
            <FileDown aria-hidden="true" />
            {telechargement ? "Création…" : "Télécharger le PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Les commandes du Pack, les plus recentes en tete. Un clic ouvre la
 * commande ; en edition, les cases a cocher preparent la commande Joma.
 */
export default function Commandes({
  montantRecues,
  commandes,
  catalogue,
  flocage,
  peutEditer,
}: {
  /** Le montant des commandes recues, pour le minimum Joma, calcule par la page quel que soit le filtre. */
  montantRecues: number;
  commandes: Commande[];
  catalogue: Article[];
  flocage: PrixFlocage;
  peutEditer: boolean;
}) {
  const [liste, setListe] = useState(commandes);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [ouverture, setOuverture] = useState<{ ouvert: boolean; id: number | null; cle: number }>({ ouvert: false, id: null, cle: 0 });
  const [joma, setJoma] = useState(false);
  // Le minimum Joma se recalcule au serveur quand une commande change de statut ou de contenu.
  const router = useRouter();

  const ouverte = liste.find((c) => c.id === ouverture.id) ?? null;
  const cochees = liste.filter((c) => selection.has(c.id));
  const actives = liste.filter((c) => c.statut !== "cancelled");
  const toutesCochees = liste.length > 0 && selection.size === liste.length;

  const basculer = (id: number, coche: boolean) =>
    setSelection((x) => {
      const suivant = new Set(x);
      if (coche) suivant.add(id);
      else suivant.delete(id);
      return suivant;
    });

  const enregistree = (commande: Commande) => {
    setListe((x) => x.map((c) => (c.id === commande.id ? commande : c)));
    setOuverture((o) => ({ ...o, ouvert: false }));
    router.refresh();
  };

  const supprimee = (id: number) => {
    setListe((x) => x.filter((c) => c.id !== id));
    setSelection((x) => {
      const suivant = new Set(x);
      suivant.delete(id);
      return suivant;
    });
    setOuverture((o) => ({ ...o, ouvert: false }));
    router.refresh();
  };

  const passees = (ids: number[]) => {
    const aujourdHui = new Date().toISOString();
    setListe((x) =>
      x.map((c) => (ids.includes(c.id) ? { ...c, statut: "ordered", commandeeLe: c.commandeeLe ?? aujourdHui.slice(0, 10) } : c)),
    );
    setSelection(new Set());
    setJoma(false);
    router.refresh();
  };

  return (
    <>
      <MinimumJoma montant={montantRecues} />
      <Panneau
        titre="Commandes"
        description={`${pluriel(liste.length, "commande")} · ${pluriel(actives.reduce((n, c) => n + pieces(c), 0), "pièce")} · ${formaterPrix(totalDes(actives.flatMap((c) => c.lignes)))} hors annulées`}
        actions={
          peutEditer && liste.length > 0 ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={toutesCochees}
                onCheckedChange={(c) => setSelection(c === true ? new Set(liste.map((x) => x.id)) : new Set())}
                aria-label="Tout cocher"
              />
              Tout cocher
            </label>
          ) : null
        }
      >
        {liste.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Aucune commande ici.</p>
        ) : (
          <ul className="divide-y divide-border">
            {liste.map((c) => (
              <li key={c.id} className={cn("flex items-center gap-3 px-4", c.statut === "cancelled" && "opacity-50")}>
                {peutEditer ? (
                  <Checkbox
                    checked={selection.has(c.id)}
                    onCheckedChange={(coche) => basculer(c.id, coche === true)}
                    aria-label={`Cocher la commande de ${c.personne}`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setOuverture((o) => ({ ouvert: true, id: c.id, cle: o.cle + 1 }))}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left focus-visible:outline-none"
                >
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">
                    <span className="block">{formaterDateCourte(c.creeLe)}</span>
                    <span className="block">{formaterHeure(c.creeLe)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.personne}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {pluriel(pieces(c), "pièce")} · {c.lignes.map((l) => l.article).filter((v, i, t) => t.indexOf(v) === i).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">{formaterPrix(c.total)}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      <PastilleStatut couleur={COULEURS_STATUT_COMMANDE[c.statut]} libelle={LIBELLES_STATUT_COMMANDE[c.statut]} />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {peutEditer && selection.size > 0 ? (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
            <span className="text-sm">
              {pluriel(selection.size, "commande")} cochée{selection.size > 1 ? "s" : ""}
            </span>
            <Button type="button" variant="hub" size="sm" onClick={() => setJoma(true)}>
              <FileDown aria-hidden="true" />
              Préparer la commande Joma
            </Button>
          </div>
        ) : null}

        <PreparationJoma
          key={[...selection].sort().join(",")}
          commandes={cochees}
          catalogue={catalogue}
          ouvert={joma}
          onFermer={() => setJoma(false)}
          onPassees={passees}
        />

        <Sheet open={ouverture.ouvert} onOpenChange={(o) => !o && setOuverture((x) => ({ ...x, ouvert: false }))}>
          <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
              <SheetTitle>{ouverte ? ouverte.personne : "Commande"}</SheetTitle>
              <SheetDescription>
                {ouverte ? `Commande n° ${ouverte.id} · ${LIBELLES_STATUT_COMMANDE[ouverte.statut]}` : ""}
              </SheetDescription>
            </SheetHeader>
            {ouverte ? (
              <FicheCommande
                key={ouverture.cle}
                commande={ouverte}
                catalogue={catalogue}
                flocage={flocage}
                peutEditer={peutEditer}
                onFermer={() => setOuverture((x) => ({ ...x, ouvert: false }))}
                onEnregistree={enregistree}
              onSupprimee={supprimee}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      </Panneau>
    </>
  );
}
