"use client";

import { CalendarPlus, ExternalLink, Pencil, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import Commentaires from "@/components/hub/calendrier/commentaires";
import { Etiquette, PastilleStatut } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { changerStatutIdee, lireIdee, supprimerIdee, voterIdee } from "@/hub/actions/idees";
import { formaterDateCourte } from "@/hub/dates";
import type { IdeeDetail } from "@/hub/idees/donnees";
import { COULEURS_STATUT_IDEE, LIBELLES_STATUT_IDEE, STATUTS_IDEE, type StatutIdee } from "@/hub/idees/schema";
import { cn } from "@/lib/utils";

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3">
      <span className="text-xs font-medium text-muted-foreground sm:pt-0.5 sm:text-sm">{titre}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

/** Le ticket d'une idee : ce qu'elle propose, qui la porte, les votes et les commentaires. */
export default function DetailIdee({
  id,
  peutEditer,
  utilisateurId,
  estAdmin,
  onFermer,
  onModifier,
  onPlanifier,
  onChange,
}: {
  id: number | null;
  peutEditer: boolean;
  utilisateurId: number;
  estAdmin: boolean;
  onFermer: () => void;
  onModifier: (idee: IdeeDetail) => void;
  onPlanifier: (idee: IdeeDetail) => void;
  onChange: () => void;
}) {
  const [detail, setDetail] = useState<IdeeDetail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, lancer] = useTransition();

  const recharger = (cible: number) => {
    lancer(async () => {
      const r = await lireIdee(cible);
      if (r.ok && r.donnees) {
        setDetail(r.donnees);
        setErreur(null);
      } else if (!r.ok) {
        setErreur(r.erreur);
      }
    });
  };

  useEffect(() => {
    if (id !== null) recharger(id);
  }, [id]);

  const voter = () => {
    if (!detail) return;
    lancer(async () => {
      const r = await voterIdee(detail.id);
      if (!r.ok) return void toast.error(r.erreur);
      recharger(detail.id);
      onChange();
    });
  };

  const changerLeStatut = (statut: StatutIdee) => {
    if (!detail) return;
    lancer(async () => {
      const r = await changerStatutIdee({ id: detail.id, statut });
      if (!r.ok) return void toast.error(r.erreur);
      recharger(detail.id);
      onChange();
    });
  };

  const supprimer = () => {
    if (!detail) return;
    lancer(async () => {
      const r = await supprimerIdee(detail.id);
      if (!r.ok) return void toast.error(r.erreur);
      toast.success("Idée supprimée.");
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
              </div>
            ) : null}
            <SheetHeader className="border-b border-border px-5 py-4 pr-28">
              <div className="flex flex-wrap items-center gap-2">
                <PastilleStatut couleur={COULEURS_STATUT_IDEE[detail.statut]} libelle={LIBELLES_STATUT_IDEE[detail.statut]} />
                {detail.postPlanifie ? <Etiquette>Planifiée</Etiquette> : null}
              </div>
              <SheetTitle>{detail.titre}</SheetTitle>
              <SheetDescription>
                {detail.auteur || "Membre"} · {formaterDateCourte(detail.creeLe)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={detail.aVote ? "hub" : "hubSecondary"}
                  size="sm"
                  disabled={enCours}
                  onClick={voter}
                  aria-pressed={detail.aVote}
                >
                  <ThumbsUp aria-hidden="true" />
                  {detail.votes} {detail.votes > 1 ? "votes" : "vote"}
                </Button>
                {peutEditer && !detail.postPlanifie ? (
                  <Button type="button" variant="hub" size="sm" onClick={() => onPlanifier(detail)}>
                    <CalendarPlus aria-hidden="true" />
                    Planifier
                  </Button>
                ) : null}
              </div>

              {detail.description ? (
                <Bloc titre="Description">
                  <p className="whitespace-pre-wrap break-words">{detail.description}</p>
                </Bloc>
              ) : null}

              {detail.reseaux.length > 0 ? <Bloc titre="Réseaux">{detail.reseaux.join(", ")}</Bloc> : null}
              {detail.formats.length > 0 ? <Bloc titre="Formats">{detail.formats.join(", ")}</Bloc> : null}

              {detail.lienInspiration ? (
                <Bloc titre="Inspiration">
                  <a
                    href={detail.lienInspiration}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{detail.lienInspiration.replace(/^https?:\/\//, "")}</span>
                  </a>
                </Bloc>
              ) : null}

              {detail.matchLie ? (
                <Bloc titre="Match lié">
                  <Link href={`/hub/calendrier?evenement=${detail.matchLie.id}`} className="text-primary hover:underline">
                    {detail.matchLie.titre || "Voir le match"}
                  </Link>
                </Bloc>
              ) : null}

              {detail.postPlanifie ? (
                <Bloc titre="Post">
                  <Link href={`/hub/calendrier?evenement=${detail.postPlanifie.id}`} className="text-primary hover:underline">
                    {detail.postPlanifie.titre || "Voir le post"}
                  </Link>
                </Bloc>
              ) : null}

              {peutEditer ? (
                <Bloc titre="Statut">
                  <Select value={detail.statut} onValueChange={(v) => changerLeStatut(v as StatutIdee)} disabled={enCours}>
                    <SelectTrigger size="sm" aria-label="Statut" className={cn("bg-secondary")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_IDEE.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: COULEURS_STATUT_IDEE[s] }}
                            aria-hidden="true"
                          />
                          {LIBELLES_STATUT_IDEE[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Bloc>
              ) : null}

              <div className="border-t border-border pt-4">
                <Commentaires
                  relationTo="ideas"
                  cibleId={detail.id}
                  commentaires={detail.commentaires}
                  utilisateurId={utilisateurId}
                  estAdmin={estAdmin}
                  onChange={() => {
                    recharger(detail.id);
                    onChange();
                  }}
                />
              </div>
            </div>

            <Dialog open={confirmation} onOpenChange={setConfirmation}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Supprimer cette idée ?</DialogTitle>
                  <DialogDescription>« {detail.titre} » disparaîtra du tableau, avec ses votes et ses commentaires.</DialogDescription>
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
              <SheetTitle className="sr-only">Idée</SheetTitle>
              <SheetDescription className="sr-only">Chargement du ticket</SheetDescription>
            </SheetHeader>
            {erreur ? (
              <p className="text-sm text-destructive">{erreur}</p>
            ) : (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="mt-4 h-24 w-full" />
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
