"use client";

import { Ban, Check, ChevronUp, Mail, Pencil, Phone, Plus, RotateCcw, Shirt, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PastilleStatut } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerCommande, enregistrerPaiement, supprimerCommande } from "@/hub/actions/pack";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import { construireLignes, enPartieCommandee, formaterPrix, statutRetabli, totalDes } from "@/hub/pack/calculs";
import {
  COULEURS_STATUT_COMMANDE,
  LIBELLES_STATUT_COMMANDE,
  STATUTS_COMMANDE,
  type Article,
  type Commande,
  type LigneCommande,
  type LigneSaisie,
  type Photo,
  type PrixFlocage,
  type StatutCommande,
} from "@/hub/pack/schema";
import { cn } from "@/lib/utils";
import { tanker } from "./police-tanker";

type LigneEdition = LigneSaisie & { cle: string };

let compteur = 0;
const nouvelleCle = () => `l${++compteur}`;

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Ce qui s'enregistre d'une fiche : sert a voir si elle a change depuis son ouverture. */
const empreinte = (statut: StatutCommande, remarque: string, lignes: readonly LigneEdition[]) =>
  JSON.stringify([statut, remarque.trim(), lignes.map((l) => [l.id, l.articleId, l.varianteId, l.taille, l.quantite, l.numero, l.nom])]);

/** La photo d'une ligne : celle de sa couleur, sinon la premiere de l'article, sinon rien. */
function photoDe(article: Article | undefined, varianteId: string): Photo | null {
  if (!article) return null;
  const variante = article.variantes.find((v) => v.id === varianteId);
  return variante?.photos[0] ?? article.variantes.find((v) => v.photos.length > 0)?.photos[0] ?? null;
}

function Vignette({ photo }: { photo: Photo | null }) {
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt="" draggable={false} className="size-full object-contain" />
      ) : (
        <Shirt className="size-6 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}

/** Une petite etiquette dans une carte de ligne. */
function Mention({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary px-1.5 py-px text-[10px] text-muted-foreground">{children}</span>;
}

/**
 * Une commande ouverte dans le Hub : elle se lit d'abord, comme un bon de
 * commande, articles en photo. Le club corrige une ligne en la depliant, a
 * la demande du joueur, et suit le statut et le paiement. Le total se
 * recalcule avec les memes regles que le serveur.
 */
export default function FicheCommande({
  commande,
  catalogue,
  flocage,
  peutEditer,
  onFermer,
  onEnregistree,
  onSupprimee,
  onPaiement,
}: {
  commande: Commande;
  catalogue: Article[];
  flocage: PrixFlocage;
  peutEditer: boolean;
  onFermer: () => void;
  onEnregistree: (commande: Commande) => void;
  onSupprimee: (id: number) => void;
  /** Le paiement change sans fermer la fiche. */
  onPaiement: (commande: Commande) => void;
}) {
  const [statut, setStatut] = useState<StatutCommande>(commande.statut);
  const [remarque, setRemarque] = useState(commande.remarque);
  const [lignes, setLignes] = useState<LigneEdition[]>(() =>
    commande.lignes.map((l) => ({
      cle: nouvelleCle(),
      id: l.id,
      articleId: l.articleId,
      varianteId: l.varianteId ?? "",
      taille: l.taille,
      quantite: l.quantite,
      numero: l.numero,
      nom: l.nom,
    })),
  );
  // Ce que la fiche montrait a l'ouverture : la comparaison dit s'il reste quelque chose a enregistrer.
  const [depart] = useState(() => empreinte(statut, remarque, lignes));
  // Les lignes depliees pour etre corrigees.
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const [ajout, setAjout] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  const apercu = useMemo(
    () => construireLignes(lignes, catalogue, flocage, { inactifsAdmis: true, anciennes: commande.lignes }),
    [lignes, catalogue, flocage, commande.lignes],
  );
  const modifiee = empreinte(statut, remarque, lignes) !== depart;
  const pieces = lignes.reduce((n, l) => n + l.quantite, 0);

  const changer = (cle: string, partiel: Partial<LigneEdition>) =>
    setLignes((liste) => liste.map((l) => (l.cle === cle ? { ...l, ...partiel } : l)));

  const basculer = (cle: string) =>
    setOuvertes((x) => {
      const suivant = new Set(x);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });

  const retirer = (cle: string) => setLignes((x) => x.filter((y) => y.cle !== cle));

  const ajouterArticle = (id: number) => {
    const article = catalogue.find((a) => a.id === id);
    if (!article) return;
    const cle = nouvelleCle();
    setLignes((liste) => [
      ...liste,
      {
        cle,
        id: null,
        articleId: article.id,
        varianteId: article.variantes[0]?.id ?? "",
        taille: article.tailles[0] ?? "",
        quantite: 1,
        numero: "",
        nom: "",
      },
    ]);
    // Une ligne ajoutee s'ouvre : il reste a choisir sa couleur et sa taille.
    setOuvertes((x) => new Set(x).add(cle));
    setAjout("");
  };

  // Annuler ou retablir enregistre aussitot, avec ce que la fiche montre.
  const enregistrer = async (nouveauStatut: StatutCommande = statut) => {
    setEnCours(true);
    const r = await enregistrerCommande({
      id: commande.id,
      statut: nouveauStatut,
      // Plus demandes aux joueurs depuis le 06/10/2026 : ceux d'une ancienne commande restent tels quels.
      telephone: commande.telephone,
      email: commande.email,
      remarque,
      lignes: lignes.map((l) => ({ id: l.id, articleId: l.articleId, varianteId: l.varianteId, taille: l.taille, quantite: l.quantite, numero: l.numero, nom: l.nom })),
    });
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistrée, mais impossible à relire." : r.erreur);
    toast.success(
      nouveauStatut === statut ? "Commande enregistrée." : nouveauStatut === "cancelled" ? "Commande annulée." : "Commande rétablie.",
    );
    onEnregistree(r.donnees);
  };

  // Le paiement s'enregistre a part, aussitot : il ne touche ni aux lignes ni au statut.
  const changerPaiement = async (payee: boolean) => {
    setEnCours(true);
    const r = await enregistrerPaiement(commande.id, payee).catch(() => ({ ok: false as const, erreur: "Le paiement n'a pas pu être enregistré." }));
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(payee ? "Commande payée." : "Commande de nouveau à payer.");
    onPaiement(r.donnees);
  };

  const supprimer = async () => {
    setEnCours(true);
    const r = await supprimerCommande(commande.id).catch(() => ({ ok: false as const, erreur: "La commande n'a pas pu être supprimée." }));
    setEnCours(false);
    setConfirmation(false);
    if (!r.ok) return void toast.error(r.erreur);
    toast.success(`La commande de ${commande.personne} est supprimée.`);
    onSupprimee(commande.id);
  };

  const payee = commande.payeeLe !== null;
  const couleurPaiement = payee ? COULEURS_STATUT_COMMANDE.delivered : COULEURS_STATUT_COMMANDE.received;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        {/* Le bon de commande en un coup d'oeil : combien, ou elle en est, si elle est payee.
            Sans shrink-0, une longue commande l'ecraserait : le corps defile, il ne retrecit pas. */}
        <section aria-label="Résumé" className="shrink-0 overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-4 pt-4 pb-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{formaterPrix(apercu.ok ? apercu.total : commande.total)}</p>
              <p className="text-xs text-muted-foreground">
                {pluriel(pieces, "pièce")} · reçue le {formaterDateCourte(commande.creeLe)} à {formaterHeure(commande.creeLe)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              <PastilleStatut
                couleur={COULEURS_STATUT_COMMANDE[commande.statut]}
                libelle={enPartieCommandee(commande) ? `${LIBELLES_STATUT_COMMANDE[commande.statut]}, en partie chez Joma` : LIBELLES_STATUT_COMMANDE[commande.statut]}
              />
              {commande.commandeeLe ? <span className="text-muted-foreground">chez Joma le {formaterDateCourte(commande.commandeeLe)}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: commande.statut === "cancelled" && !payee ? undefined : couleurPaiement }}>
                {payee ? <Check className="size-4" aria-hidden="true" /> : null}
                {payee ? `Payée le ${formaterDateCourte(commande.payeeLe as string)}` : commande.statut === "cancelled" ? "Rien à payer" : "À payer"}
              </p>
              <p className="text-xs text-muted-foreground">Virement, communication « Pack n° {commande.id} ».</p>
            </div>
            {peutEditer && (payee || commande.statut !== "cancelled") ? (
              <Button type="button" variant="hubSecondary" size="sm" disabled={enCours} onClick={() => void changerPaiement(!payee)}>
                {payee ? "Remettre à payer" : "Marquer payée"}
              </Button>
            ) : null}
          </div>
          {commande.telephone || commande.email ? (
            // Les coordonnees ne sont plus demandees : elles n'apparaissent que sur une ancienne commande.
            <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
              {commande.telephone ? (
                <Button asChild variant="hubSecondary" size="sm">
                  <a href={`tel:${commande.telephone.replace(/\s+/g, "")}`}>
                    <Phone aria-hidden="true" />
                    {commande.telephone}
                  </a>
                </Button>
              ) : null}
              {commande.email ? (
                <Button asChild variant="hubSecondary" size="sm">
                  <a href={`mailto:${commande.email}`}>
                    <Mail aria-hidden="true" />
                    {commande.email}
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>

        <section aria-labelledby="commande-articles" className="flex shrink-0 flex-col gap-2">
          <h3 id="commande-articles" className="text-sm font-medium">
            Articles
          </h3>
          <ul className="flex flex-col gap-2">
            {lignes.map((l, rang) => {
              const article = catalogue.find((a) => a.id === l.articleId);
              const figee = commande.lignes.find((x) => x.id === l.id);
              // La ligne telle qu'elle s'enregistrerait ; sinon telle qu'elle est rangee.
              const affichee: LigneCommande | undefined = (apercu.ok ? apercu.lignes[rang] : undefined) ?? figee;
              const ouverte = peutEditer && article !== undefined && ouvertes.has(l.cle);
              const flocageTexte = [l.numero ? `N° ${l.numero}` : "", l.nom.trim().toUpperCase()].filter(Boolean).join(" ");
              return (
                <li key={l.cle} className={cn("rounded-lg border bg-card", ouverte ? "border-primary/60" : "border-border")}>
                  <div className="flex items-start gap-3 p-3">
                    <Vignette photo={photoDe(article, l.varianteId)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-medium">{affichee?.article ?? article?.nom ?? "Article disparu"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[affichee?.couleur, l.taille ? `Taille ${l.taille}` : ""].filter(Boolean).join(" · ") || "Sans couleur ni taille"}
                      </p>
                      {flocageTexte ? (
                        <p className="mt-0.5 text-xs">
                          <span className="text-muted-foreground">Flocage </span>
                          <span className={cn(tanker.className, "tracking-wide text-spanish-accent-2")}>{flocageTexte}</span>
                        </p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {figee?.commandeJoma ? <Mention>Déjà partie chez Joma</Mention> : null}
                        {!article ? <Mention>Retiré du catalogue</Mention> : !article.actif ? <Mention>Plus proposé</Mention> : null}
                        {l.id === null ? <Mention>Ajoutée</Mention> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-sm font-semibold tabular-nums">{affichee ? formaterPrix(totalDes([{ prixUnitaire: affichee.prixUnitaire, quantite: l.quantite }])) : "?"}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {l.quantite} × {affichee ? formaterPrix(affichee.prixUnitaire) : "?"}
                      </p>
                      {peutEditer ? (
                        <div className="mt-1 flex gap-1">
                          {article ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              aria-expanded={ouverte}
                              aria-label={ouverte ? `Replier ${article.nom}` : `Corriger ${article.nom}`}
                              title={ouverte ? "Replier" : "Corriger la couleur, la taille, la quantité ou le flocage"}
                              onClick={() => basculer(l.cle)}
                            >
                              {ouverte ? <ChevronUp aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            aria-label={`Retirer ${affichee?.article ?? "la ligne"}`}
                            title="Retirer la ligne"
                            onClick={() => retirer(l.cle)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {ouverte && article ? (
                    <div className="flex flex-col gap-2 border-t border-border p-3">
                      <div className={cn("grid gap-2", article.tailles.length > 0 ? "grid-cols-[1fr_1fr_4.5rem]" : "grid-cols-[1fr_4.5rem]")}>
                        <Select
                          value={l.varianteId}
                          onValueChange={(varianteId) => changer(l.cle, { varianteId })}
                          disabled={article.variantes.length < 2 && article.variantes.some((v) => v.id === l.varianteId)}
                        >
                          <SelectTrigger aria-label="Couleur" className="w-full">
                            <SelectValue placeholder="Couleur" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Une couleur retiree du catalogue depuis la commande reste choisie, sous son nom d'alors. */}
                            {l.varianteId && !article.variantes.some((v) => v.id === l.varianteId) ? (
                              <SelectItem value={l.varianteId}>{figee?.couleur || "Couleur retirée"}</SelectItem>
                            ) : null}
                            {article.variantes.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.couleur || "Couleur unique"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {article.tailles.length > 0 ? (
                          <Select value={l.taille} onValueChange={(taille) => changer(l.cle, { taille })}>
                            <SelectTrigger aria-label="Taille" className="w-full">
                              <SelectValue placeholder="Taille" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Une taille retiree du catalogue depuis la commande reste choisie. */}
                              {l.taille && !article.tailles.includes(l.taille) ? <SelectItem value={l.taille}>{l.taille}</SelectItem> : null}
                              {article.tailles.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <Input
                          aria-label="Quantité"
                          type="number"
                          min={1}
                          max={20}
                          value={l.quantite}
                          onChange={(e) => changer(l.cle, { quantite: Math.min(20, Math.max(1, Math.trunc(Number(e.target.value) || 1))) })}
                        />
                      </div>
                      {article.floquable ? (
                        <div className="grid grid-cols-[5rem_1fr] gap-2">
                          <Input
                            aria-label="Numéro floqué"
                            inputMode="numeric"
                            placeholder="N°"
                            maxLength={2}
                            value={l.numero}
                            onChange={(e) => changer(l.cle, { numero: e.target.value.replace(/\D/g, "") })}
                          />
                          <Input aria-label="Nom floqué" placeholder="Nom au dos" maxLength={15} value={l.nom} onChange={(e) => changer(l.cle, { nom: e.target.value.toUpperCase() })} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {peutEditer ? (
            <Select value={ajout} onValueChange={(id) => ajouterArticle(Number(id))}>
              <SelectTrigger aria-label="Ajouter un article" className="w-full border-dashed">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Plus className="size-4" aria-hidden="true" />
                  <SelectValue placeholder="Ajouter un article" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {catalogue.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.actif ? a.nom : `${a.nom} (retiré)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {apercu.ok ? null : <p className="text-xs text-destructive">{apercu.erreur}</p>}
        </section>

        {peutEditer ? (
          <section aria-label="Suivi" className="flex shrink-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commande-remarque">Remarque</Label>
              <Textarea id="commande-remarque" value={remarque} onChange={(e) => setRemarque(e.target.value)} rows={2} placeholder="Aucune remarque du joueur." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commande-statut">Statut</Label>
              <Select value={statut} onValueChange={(s) => setStatut(s as StatutCommande)}>
                <SelectTrigger id="commande-statut" className="w-full data-[size=default]:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS_COMMANDE.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LIBELLES_STATUT_COMMANDE[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4">
              {commande.statut === "cancelled" ? (
                <Button
                  type="button"
                  variant="hubSecondary"
                  size="sm"
                  disabled={enCours || !apercu.ok}
                  // Ce qui est deja parti chez Joma n'y repart pas : « Commandee » si tout est parti, « Recue » sinon.
                  onClick={() => void enregistrer(statutRetabli(commande))}
                >
                  <RotateCcw aria-hidden="true" />
                  Rétablir la commande
                </Button>
              ) : (
                <Button type="button" variant="hubSecondary" size="sm" disabled={enCours || !apercu.ok} onClick={() => void enregistrer("cancelled")}>
                  <Ban aria-hidden="true" />
                  Annuler la commande
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={enCours} onClick={() => setConfirmation(true)}>
                <Trash2 aria-hidden="true" />
                Supprimer
              </Button>
              <p className="basis-full text-xs text-muted-foreground">
                Annulée, la commande reste dans la liste, estompée, hors des totaux ; elle se rétablit, en « Commandée » si tout est déjà parti chez
                Joma, en « Reçue » sinon. Supprimée, elle disparaît pour de bon.
              </p>
            </div>
          </section>
        ) : commande.remarque ? (
          <section aria-label="Remarque" className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Remarque</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{commande.remarque}</p>
          </section>
        ) : null}
      </div>

      {peutEditer ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {modifiee ? <span className="me-auto text-xs text-muted-foreground">Modifications non enregistrées</span> : null}
          <Button type="button" variant="hubSecondary" onClick={onFermer} disabled={enCours}>
            Fermer
          </Button>
          <Button type="button" variant="hub" onClick={() => void enregistrer()} disabled={enCours || !apercu.ok || !modifiee}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      ) : null}

      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la commande de {commande.personne} ?</DialogTitle>
            <DialogDescription>
              Commande n° {commande.id}, {formaterPrix(commande.total)}. Elle disparaît pour de bon, du Hub comme de la commande groupée. Pour la garder
              hors des totaux, annulez-la plutôt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="hubSecondary" onClick={() => setConfirmation(false)}>
              Garder
            </Button>
            <Button type="button" variant="hub" className="bg-destructive text-white hover:bg-destructive/90" disabled={enCours} onClick={() => void supprimer()}>
              Supprimer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
