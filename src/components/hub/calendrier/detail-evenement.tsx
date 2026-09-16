"use client";

import { Copy, ExternalLink, Lock, MapPin, Pencil, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Etiquette, Pastille, PastilleStatut } from "@/components/hub/mise-en-page";
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
import { Skeleton } from "@/components/ui/skeleton";
import { changerStatut, lireEvenement, regenererPosts, supprimerEvenement } from "@/hub/actions/evenements";
import type { EvenementDetail, References } from "@/hub/calendrier/donnees";
import { COULEURS_STATUT, LIBELLES_STATUT, type Statut } from "@/hub/calendrier/schema";
import { formaterDate, formaterDateCourte, formaterDateHeure, formaterHeure } from "@/hub/dates";
import Commentaires from "./commentaires";
import SelecteurStatut from "./selecteur-statut";

const LIBELLES_CATEGORIE = { post: "Post", match: "Match", training: "Entraînement", other: "Autre" } as const;

function lienCarte(adresse: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3">
      <span className="text-xs font-medium text-muted-foreground sm:pt-0.5 sm:text-sm">{titre}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

/**
 * Le panneau d'un evenement : feuille laterale sur grand ecran, plein
 * ecran sur mobile. Le detail est relu a l'ouverture, avec les droits de
 * la personne, plutot que recopie depuis la grille.
 */
export default function DetailEvenement({
  id,
  references,
  peutEditer,
  utilisateurId,
  estAdmin,
  onFermer,
  onModifier,
  onChange,
}: {
  id: number | null;
  references: References;
  peutEditer: boolean;
  utilisateurId: number;
  estAdmin: boolean;
  onFermer: () => void;
  onModifier: (detail: EvenementDetail) => void;
  onChange: () => void;
}) {
  const [detail, setDetail] = useState<EvenementDetail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [regeneration, setRegeneration] = useState<{ ouverte: boolean; reinitialiser: boolean }>({
    ouverte: false,
    reinitialiser: false,
  });
  const [enCours, lancer] = useTransition();

  const recharger = (cible: number) => {
    lancer(async () => {
      const r = await lireEvenement(cible);
      if (r.ok && r.donnees) {
        setDetail(r.donnees);
        setErreur(null);
      } else if (!r.ok) {
        setErreur(r.erreur);
      }
    });
  };

  // Le composant est remonte a chaque changement d'evenement (cle sur l'id) :
  // l'etat repart de zero, il ne reste qu'a lire le detail.
  useEffect(() => {
    if (id !== null) recharger(id);
  }, [id]);

  const type = detail ? references.types.find((t) => t.id === detail.typeId) : undefined;
  const flux = detail ? references.flux.filter((f) => detail.fluxIds.includes(f.id)) : [];
  const responsables = detail ? references.responsables.filter((r) => detail.responsablesIds.includes(r.id)) : [];
  const reseaux = detail ? references.reseaux.filter((r) => detail.post.reseauxIds.includes(r.id)) : [];
  const formats = detail ? references.formats.filter((f) => detail.post.formatIds.includes(f.id)) : [];

  const copierLegende = async () => {
    if (!detail?.post.legende) return;
    try {
      await navigator.clipboard.writeText(detail.post.legende);
      toast.success("Légende copiée.");
    } catch {
      toast.error("Impossible de copier. Sélectionnez le texte à la main.");
    }
  };

  const changerLeStatut = (statut: Statut) => {
    if (!detail) return;
    lancer(async () => {
      const r = await changerStatut({ id: detail.id, statut });
      if (!r.ok) return void toast.error(r.erreur);
      recharger(detail.id);
      onChange();
    });
  };

  const regenerer = () => {
    if (!detail) return;
    lancer(async () => {
      const r = await regenererPosts({ id: detail.id, reinitialiser: regeneration.reinitialiser });
      if (!r.ok) return void toast.error(r.erreur);
      const { crees, modifies } = r.donnees ?? { crees: 0, modifies: 0 };
      toast.success(
        crees + modifies === 0
          ? "Chaque modèle actif a déjà son post. Cochez l'option pour les remettre à neuf."
          : `${crees} post${crees > 1 ? "s" : ""} créé${crees > 1 ? "s" : ""}, ${modifies} remis à neuf.`,
      );
      setRegeneration({ ouverte: false, reinitialiser: false });
      recharger(detail.id);
      onChange();
    });
  };

  const supprimer = () => {
    if (!detail) return;
    lancer(async () => {
      const r = await supprimerEvenement(detail.id);
      if (!r.ok) return void toast.error(r.erreur);
      toast.success("Événement supprimé.");
      setConfirmation(false);
      onChange();
      onFermer();
    });
  };

  return (
    <Sheet open={id !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {detail ? (
          <>
            {/* Les actions sur l'evenement vivent dans l'en-tete, a cote de la
                croix, comme dans un panneau de tableau de bord. */}
            {peutEditer ? (
              <div className="absolute right-11 top-2.5 flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  aria-label="Modifier"
                  title="Modifier"
                  onClick={() => onModifier(detail)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                {!detail.verrouille ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label="Supprimer"
                    title="Supprimer"
                    onClick={() => setConfirmation(true)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            ) : null}
            <SheetHeader className="border-b border-border px-5 py-4 pr-28">
              <div className="flex flex-wrap items-center gap-2">
                <Pastille couleur={type?.couleur} />
                <span className="text-xs text-muted-foreground">
                  {type?.nom ?? LIBELLES_CATEGORIE[detail.categorie]}
                </span>
                {detail.annule ? <Etiquette className="text-destructive">Annulé</Etiquette> : null}
                {detail.verrouille ? (
                  <Etiquette>
                    <Lock className="mr-1 size-3" aria-hidden="true" />
                    Synchronisé LFFS
                  </Etiquette>
                ) : null}
                {detail.recurrence.frequence !== "none" ? <Etiquette>Récurrent</Etiquette> : null}
              </div>
              <SheetTitle className={detail.annule ? "line-through opacity-70" : undefined}>{detail.titre}</SheetTitle>
              <SheetDescription>
                {detail.journeeEntiere
                  ? formaterDate(detail.debut)
                  : `${formaterDateHeure(detail.debut)}${detail.fin ? ` à ${formaterHeure(detail.fin)}` : ""}`}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-5 py-4">
              {detail.heureRdv ? <Bloc titre="Rendez-vous">{formaterHeure(detail.heureRdv)}</Bloc> : null}

              {detail.lieuNom || detail.lieuAdresse ? (
                <Bloc titre="Lieu">
                  <span>{detail.lieuNom}</span>
                  {detail.lieuAdresse ? (
                    <a
                      href={lienCarte(detail.lieuAdresse)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-primary hover:underline"
                    >
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {detail.lieuAdresse}
                    </a>
                  ) : null}
                </Bloc>
              ) : null}

              <Bloc titre="Flux">
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {flux.map((f) => (
                    <li key={f.id} className="flex items-center gap-1.5">
                      <Pastille couleur={f.couleur} />
                      {f.nom}
                    </li>
                  ))}
                </ul>
              </Bloc>

              {responsables.length > 0 ? (
                <Bloc titre="Responsables">{responsables.map((r) => r.nom).join(", ")}</Bloc>
              ) : null}

              {detail.description ? (
                <Bloc titre="Description">
                  <p className="whitespace-pre-wrap break-words">{detail.description}</p>
                </Bloc>
              ) : null}

              {detail.categorie === "post" ? (
                <>
                  <Bloc titre="Statut">
                    {peutEditer ? (
                      <SelecteurStatut valeur={detail.post.statut} disabled={enCours} onChange={changerLeStatut} />
                    ) : (
                      <PastilleStatut
                        couleur={COULEURS_STATUT[detail.post.statut]}
                        libelle={LIBELLES_STATUT[detail.post.statut]}
                      />
                    )}
                  </Bloc>
                  {formats.length > 0 ? <Bloc titre="Formats">{formats.map((f) => f.nom).join(", ")}</Bloc> : null}
                  {reseaux.length > 0 ? <Bloc titre="Réseaux">{reseaux.map((r) => r.nom).join(", ")}</Bloc> : null}
                  {detail.post.legende ? (
                    <Bloc titre="Légende">
                      <p className="whitespace-pre-wrap break-words rounded-md bg-secondary/60 px-3 py-2">
                        {detail.post.legende}
                      </p>
                      <Button type="button" variant="hubSecondary" size="sm" className="mt-2" onClick={copierLegende}>
                        <Copy aria-hidden="true" />
                        Copier la légende
                      </Button>
                    </Bloc>
                  ) : null}
                  {detail.post.lienVisuels || detail.post.lienPublication ? (
                    <Bloc titre="Liens">
                      <div className="flex flex-col gap-1">
                        {detail.post.lienVisuels ? (
                          <a
                            href={detail.post.lienVisuels}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            Visuels
                          </a>
                        ) : null}
                        {detail.post.lienPublication ? (
                          <a
                            href={detail.post.lienPublication}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            Publication
                          </a>
                        ) : null}
                      </div>
                    </Bloc>
                  ) : null}
                  {detail.post.vues !== null ? <Bloc titre="Vues">{detail.post.vues}</Bloc> : null}
                </>
              ) : null}

              {detail.categorie === "match" ? (
                <>
                  {detail.match.adversaire ? (
                    <Bloc titre="Adversaire">
                      {detail.match.adversaire} · {detail.match.domicile ? "à domicile" : "à l'extérieur"}
                    </Bloc>
                  ) : null}
                  {detail.match.competition ? <Bloc titre="Compétition">{detail.match.competition}</Bloc> : null}
                  {detail.match.score ? <Bloc titre="Score">{detail.match.score}</Bloc> : null}
                  {detail.postsLies.length > 0 || detail.verrouille ? (
                    <Bloc titre="Posts">
                      {detail.postsLies.length > 0 ? (
                        <ul className="flex flex-col gap-1">
                          {detail.postsLies.map((post) => (
                            <li key={post.id} className="flex min-w-0 items-center gap-2">
                              <PastilleStatut couleur={COULEURS_STATUT[post.statut]} libelle={LIBELLES_STATUT[post.statut]} />
                              <Link
                                href={`/hub/calendrier?evenement=${post.id}`}
                                className={`min-w-0 truncate hover:underline ${post.annule ? "line-through opacity-70" : ""}`}
                              >
                                {post.titre}
                              </Link>
                              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formaterDateCourte(post.debut)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">Aucun post pour ce match.</span>
                      )}
                      {peutEditer && detail.verrouille && !detail.annule ? (
                        <Button
                          type="button"
                          variant="hubSecondary"
                          size="sm"
                          className="mt-2"
                          onClick={() => setRegeneration({ ouverte: true, reinitialiser: false })}
                        >
                          <RefreshCw aria-hidden="true" />
                          Regénérer les posts
                        </Button>
                      ) : null}
                    </Bloc>
                  ) : null}
                </>
              ) : null}

              {detail.notesInternes ? (
                <Bloc titre="Notes internes">
                  <p className="whitespace-pre-wrap break-words rounded-md border border-dashed border-border px-3 py-2">
                    {detail.notesInternes}
                  </p>
                </Bloc>
              ) : null}

              <div className="border-t border-border pt-4">
                <Commentaires
                  relationTo="events"
                  cibleId={detail.id}
                  commentaires={detail.commentaires}
                  utilisateurId={utilisateurId}
                  estAdmin={estAdmin}
                  onChange={() => recharger(detail.id)}
                />
              </div>
            </div>

            <Dialog
              open={regeneration.ouverte}
              onOpenChange={(ouverte) => setRegeneration((r) => ({ ...r, ouverte }))}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Regénérer les posts de ce match ?</DialogTitle>
                  <DialogDescription>
                    Crée les posts qui manquent pour les modèles actifs, sans toucher à ceux qui existent.
                  </DialogDescription>
                </DialogHeader>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={regeneration.reinitialiser}
                    onCheckedChange={(v) => setRegeneration((r) => ({ ...r, reinitialiser: v === true }))}
                    className="mt-0.5"
                  />
                  <span>
                    Réinitialiser aussi les posts non publiés
                    <span className="block text-xs text-muted-foreground">
                      Leur date et leurs textes repartent du modèle, leur statut revient à « À créer ».
                    </span>
                  </span>
                </label>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="hubSecondary"
                    onClick={() => setRegeneration({ ouverte: false, reinitialiser: false })}
                  >
                    Annuler
                  </Button>
                  <Button type="button" variant="hub" disabled={enCours} onClick={regenerer}>
                    {enCours ? "En cours…" : "Regénérer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmation} onOpenChange={setConfirmation}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Supprimer cet événement ?</DialogTitle>
                  <DialogDescription>
                    « {detail.titre} » disparaîtra du calendrier et des flux. Cette action ne se défait pas.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="hubSecondary" onClick={() => setConfirmation(false)}>
                    Garder
                  </Button>
                  <Button type="button" variant="destructive" disabled={enCours} onClick={supprimer}>
                    Supprimer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="flex flex-col gap-3 px-5 py-6">
            <SheetHeader className="p-0">
              <SheetTitle className="sr-only">Événement</SheetTitle>
              <SheetDescription className="sr-only">Chargement du détail</SheetDescription>
            </SheetHeader>
            {erreur ? (
              <p className="text-sm text-destructive">{erreur}</p>
            ) : (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-4 h-24 w-full" />
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
