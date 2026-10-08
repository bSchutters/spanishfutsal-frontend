"use client";

import { Check, FileDown, PackageCheck } from "lucide-react";
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
import { Fenetre, FenetreContenu, FenetreDescription, FenetreEntete, FenetreTitre } from "@/components/hub/fenetre";
import { enregistrerPaiement, passerCommandeesChezJoma } from "@/hub/actions/pack";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import {
  aCommanderChezJoma,
  avancementJoma,
  bilanPaiements,
  enPartieCommandee,
  formaterPrix,
  MINIMUM_JOMA,
  montantPourJoma,
  recapPourJoma,
  resteACommander,
  totalDes,
  type CommandeJoma,
} from "@/hub/pack/calculs";
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

/** Un PDF de la route des commandes Joma, enregistre sous le nom qu'elle donne. */
async function telechargerPdf(corps: Record<string, unknown>): Promise<void> {
  const reponse = await fetch("/api/hub/pack/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
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
}

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
 * « commandee chez Joma », qui garde ce qui part pour en retelecharger une
 * copie a l'identique.
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
  onPassees: (commandes: Commande[]) => void;
}) {
  const [ecartes, setEcartes] = useState<Set<string>>(new Set());
  const [telechargement, setTelechargement] = useState(false);
  const [enCours, lancer] = useTransition();

  // Les articles qui restent a commander : une ligne deja partie chez Joma n'y revient pas.
  const articles = useMemo(() => {
    const compte = new Map<string, number>();
    for (const c of resteACommander(commandes)) for (const l of c.lignes) compte.set(l.article, (compte.get(l.article) ?? 0) + l.quantite);
    return [...compte.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [commandes]);

  // L'apercu du PDF, comme lui et comme la copie gardee : sous les noms Joma ; les cases a cocher gardent les noms affiches.
  const recap = recapPourJoma(commandes, catalogue, ecartes);
  const ids = commandes.map((c) => c.id);
  // Ce qui part vraiment chez Joma : les lignes des commandes cochees, sans les articles ecartes.
  const montant = montantPourJoma(commandes, ecartes);
  const minimum = avancementJoma(montant);

  const telecharger = async () => {
    setTelechargement(true);
    try {
      await telechargerPdf({ ids, ecartes: [...ecartes] });
    } catch (erreur) {
      toast.error(erreur instanceof Error && erreur.message ? erreur.message : "Le PDF n'a pas pu être créé.");
    } finally {
      setTelechargement(false);
    }
  };

  const passer = () =>
    lancer(async () => {
      const r = await passerCommandeesChezJoma(ids, [...ecartes]);
      if (!r.ok) return void toast.error(r.erreur);
      const touchees = r.donnees ?? [];
      const enPartie = touchees.filter((x) => x.statut === "received").length;
      const completes = touchees.length - enPartie;
      toast.success(
        [
          completes > 0 ? `${pluriel(completes, "commande")} passée${completes > 1 ? "s" : ""} en « commandée chez Joma »` : "",
          enPartie > 0
            ? `${pluriel(enPartie, "commande")} en partie : ${enPartie > 1 ? "elles restent « Reçues »" : "elle reste « Reçue »"} pour le reste`
            : "",
        ]
          .filter(Boolean)
          .join(" ; ") + ".",
      );
      onPassees(touchees);
    });

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      {/* Une seule colonne qui ne s'elargit jamais au contenu : les longs noms Joma passent a la ligne. */}
      <DialogContent className="max-h-[90dvh] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Commande Joma</DialogTitle>
          <DialogDescription>
            {pluriel(commandes.length, "commande")} cochée{commandes.length > 1 ? "s" : ""}. Décochez un article pour le laisser hors du PDF ;
            une commande dont tout est écarté reste « Reçue ».
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
 * Le paiement d'une commande dans la liste. Celui qui verifie le compte du
 * club la marque payee d'un toucher, ou la remet a payer en cas d'erreur.
 * Une commande annulee et jamais payee n'a rien a payer.
 */
function Paiement({ commande, peutEditer, onChange }: { commande: Commande; peutEditer: boolean; onChange: (commande: Commande) => void }) {
  const [enCours, setEnCours] = useState(false);
  const payee = commande.payeeLe !== null;
  if (!payee && commande.statut === "cancelled") return <span className="w-[5.5rem] shrink-0" aria-hidden="true" />;

  // Les couleurs des statuts : vert comme une commande livree, orange comme une commande qui attend.
  const couleur = payee ? COULEURS_STATUT_COMMANDE.delivered : COULEURS_STATUT_COMMANDE.received;
  const style = { color: couleur, borderColor: `${couleur}66`, backgroundColor: payee ? `${couleur}1f` : "transparent" };
  const classe = "inline-flex w-[5.5rem] shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium";
  const contenu = (
    <>
      {payee ? <Check className="size-3" aria-hidden="true" /> : null}
      {payee ? "Payée" : "À payer"}
    </>
  );
  if (!peutEditer) {
    return (
      <span className={classe} style={style} title={payee ? `Payée le ${formaterDateCourte(commande.payeeLe as string)}` : undefined}>
        {contenu}
      </span>
    );
  }

  const changer = async () => {
    setEnCours(true);
    const r = await enregistrerPaiement(commande.id, !payee).catch(() => ({ ok: false as const, erreur: "Le paiement n'a pas pu être enregistré." }));
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(payee ? `La commande de ${commande.personne} est de nouveau à payer.` : `La commande de ${commande.personne} est payée.`);
    onChange(r.donnees);
  };

  return (
    <button
      type="button"
      aria-pressed={payee}
      aria-label={payee ? `Payée le ${formaterDateCourte(commande.payeeLe as string)} : remettre la commande de ${commande.personne} à payer` : `Marquer payée la commande de ${commande.personne}`}
      title={payee ? `Payée le ${formaterDateCourte(commande.payeeLe as string)}. Toucher pour la remettre à payer.` : "Toucher quand le virement est arrivé sur le compte."}
      disabled={enCours}
      onClick={() => void changer()}
      className={cn(classe, "transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50")}
      style={style}
    >
      {contenu}
    </button>
  );
}

/**
 * Les commandes passees chez Joma, gardees telles quelles : la copie du PDF
 * se refait depuis ce qui a ete garde, a l'identique.
 */
function CommandesJoma({ commandesJoma }: { commandesJoma: CommandeJoma[] }) {
  const [enCours, setEnCours] = useState<number | null>(null);

  const copier = async (id: number) => {
    setEnCours(id);
    try {
      await telechargerPdf({ copieDe: id });
    } catch (erreur) {
      toast.error(erreur instanceof Error && erreur.message ? erreur.message : "La copie n'a pas pu être créée.");
    } finally {
      setEnCours(null);
    }
  };

  return (
    <Panneau titre="Commandes Joma passées" description="La copie du PDF de chaque commande, telle qu'elle est partie. Rien ne change dans les commandes.">
      <ul className="divide-y divide-border">
        {commandesJoma.map((cj) => (
          <li key={cj.id} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium first-letter:uppercase">
                {cj.passeeLe ? formaterDateCourte(cj.passeeLe) : formaterDateCourte(cj.creeLe)} à {formaterHeure(cj.creeLe)}
              </span>
              <span className="block text-xs text-muted-foreground tabular-nums">
                {pluriel(cj.recap.commandes, "commande")} · {pluriel(cj.recap.pieces, "pièce")} · {formaterPrix(cj.montant)}
              </span>
              {cj.ecartes.length > 0 ? (
                <span className="block truncate text-xs text-muted-foreground">Sans : {cj.ecartes.join(", ")}</span>
              ) : null}
            </span>
            <Button type="button" variant="hubSecondary" size="sm" disabled={enCours !== null} onClick={() => void copier(cj.id)}>
              <FileDown aria-hidden="true" />
              {enCours === cj.id ? "Création…" : "PDF"}
            </Button>
          </li>
        ))}
      </ul>
    </Panneau>
  );
}

/**
 * Les commandes du Pack, les plus recentes en tete. Un clic ouvre la
 * commande ; en edition, les cases des commandes recues preparent la
 * commande Joma : une commande deja passee ne se coche plus.
 */
export default function Commandes({
  montantRecues,
  commandes,
  commandesJoma,
  catalogue,
  flocage,
  peutEditer,
}: {
  /** Le montant des commandes recues, pour le minimum Joma, calcule par la page quel que soit le filtre. */
  montantRecues: number;
  commandes: Commande[];
  /** Les commandes passees chez Joma, gardees telles quelles, quel que soit le filtre. */
  commandesJoma: CommandeJoma[];
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
  // Une commande qui change de statut sort d'elle-meme de la selection.
  const aCommander = aCommanderChezJoma(liste);
  const cochees = aCommander.filter((c) => selection.has(c.id));
  const actives = liste.filter((c) => c.statut !== "cancelled");
  const toutesCochees = aCommander.length > 0 && cochees.length === aCommander.length;
  const paiements = bilanPaiements(liste);

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

  // Un paiement change d'un toucher : la ligne se met a jour, la page reste ouverte.
  const paiementChange = (commande: Commande) => {
    setListe((x) => x.map((c) => (c.id === commande.id ? commande : c)));
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

  // Les commandes relues apres la commande Joma : statut et lignes deja parties.
  const passees = (touchees: Commande[]) => {
    setListe((x) => x.map((c) => touchees.find((t) => t.id === c.id) ?? c));
    setSelection(new Set());
    setJoma(false);
    router.refresh();
  };

  return (
    <>
      <MinimumJoma montant={montantRecues} />
      <Panneau
        titre="Commandes"
        description={`${pluriel(liste.length, "commande")} · ${pluriel(actives.reduce((n, c) => n + pieces(c), 0), "pièce")} · ${formaterPrix(totalDes(actives.flatMap((c) => c.lignes)))} hors annulées, dont ${formaterPrix(paiements.paye)} payés`}
        actions={
          peutEditer && aCommander.length > 0 ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={toutesCochees}
                onCheckedChange={(c) => setSelection(c === true ? new Set(aCommander.map((x) => x.id)) : new Set())}
              />
              Cocher les reçues
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
                  c.statut === "received" ? (
                    <Checkbox
                      checked={selection.has(c.id)}
                      onCheckedChange={(coche) => basculer(c.id, coche === true)}
                      aria-label={`Cocher la commande de ${c.personne}`}
                    />
                  ) : (
                    // Deja passee, livree ou annulee : rien a commander, la place reste pour l'alignement.
                    <span className="size-4 shrink-0" aria-hidden="true" />
                  )
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
                      <PastilleStatut
                        couleur={COULEURS_STATUT_COMMANDE[c.statut]}
                        libelle={enPartieCommandee(c) ? `${LIBELLES_STATUT_COMMANDE[c.statut]}, en partie chez Joma` : LIBELLES_STATUT_COMMANDE[c.statut]}
                      />
                    </span>
                  </span>
                </button>
                <Paiement commande={c} peutEditer={peutEditer} onChange={paiementChange} />
              </li>
            ))}
          </ul>
        )}

        {peutEditer && cochees.length > 0 ? (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
            <span className="text-sm">
              {pluriel(cochees.length, "commande")} cochée{cochees.length > 1 ? "s" : ""}
            </span>
            <Button type="button" variant="hub" size="sm" onClick={() => setJoma(true)}>
              <FileDown aria-hidden="true" />
              Préparer la commande Joma
            </Button>
          </div>
        ) : null}

        <PreparationJoma
          key={cochees.map((c) => c.id).join(",")}
          commandes={cochees}
          catalogue={catalogue}
          ouvert={joma}
          onFermer={() => setJoma(false)}
          onPassees={passees}
        />

        <Fenetre open={ouverture.ouvert} onOpenChange={(o) => !o && setOuverture((x) => ({ ...x, ouvert: false }))}>
          <FenetreContenu>
            <FenetreEntete>
              <FenetreTitre>{ouverte ? ouverte.personne : "Commande"}</FenetreTitre>
              <FenetreDescription>
                {ouverte ? `Commande n° ${ouverte.id} · ${LIBELLES_STATUT_COMMANDE[ouverte.statut]}` : ""}
              </FenetreDescription>
            </FenetreEntete>
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
                onPaiement={paiementChange}
              />
            ) : null}
          </FenetreContenu>
        </Fenetre>
      </Panneau>

      {peutEditer && commandesJoma.length > 0 ? <CommandesJoma commandesJoma={commandesJoma} /> : null}
    </>
  );
}
