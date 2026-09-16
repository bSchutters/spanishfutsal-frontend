"use client";

import { ArrowDownWideNarrow, MessageSquare, Plus, ThumbsUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type DragEvent } from "react";
import { toast } from "sonner";

import FormulaireEvenement, { type EtatFormulaire } from "@/components/hub/calendrier/formulaire-evenement";
import { Etiquette } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { changerStatutIdee, planifierIdee, voterIdee } from "@/hub/actions/idees";
import type { References } from "@/hub/calendrier/donnees";
import { formaterDateCourte } from "@/hub/dates";
import type { IdeeCarte, IdeeDetail } from "@/hub/idees/donnees";
import {
  COULEURS_STATUT_IDEE,
  LIBELLES_STATUT_IDEE,
  STATUTS_IDEE,
  trierIdees,
  type StatutIdee,
  type TriIdees,
} from "@/hub/idees/schema";
import { cn } from "@/lib/utils";
import DetailIdee from "./detail-idee";
import FormulaireIdee, { type EtatFormulaireIdee, type ReferencesIdees } from "./formulaire-idee";

type Props = {
  idees: IdeeCarte[];
  references: ReferencesIdees;
  referencesCalendrier: References;
  peutEditer: boolean;
  utilisateurId: number;
  estAdmin: boolean;
  mobile: boolean;
};

const TYPE_MIME = "application/x-hub-idee";

/**
 * Le tableau des idees : trois colonnes, Nouvelle, Retenue, Ecartee. Sur
 * grand ecran, les tickets se glissent d'une colonne a l'autre ; sur
 * telephone, un onglet par colonne et un bouton flottant pour noter vite.
 * Les donnees viennent de la page serveur : chaque action la fait relire.
 */
export default function TableauIdees({ idees, references, referencesCalendrier, peutEditer, utilisateurId, estAdmin, mobile }: Props) {
  const router = useRouter();
  const parametres = useSearchParams();
  const [tri, setTri] = useState<TriIdees>("votes");
  const [detailId, setDetailId] = useState<number | null>(() => {
    const demande = Number(parametres.get("idee"));
    return Number.isInteger(demande) && demande > 0 ? demande : null;
  });
  const [formulaire, setFormulaire] = useState<EtatFormulaireIdee | null>(null);
  const [planification, setPlanification] = useState<{ ideeId: number; etat: EtatFormulaire } | null>(null);
  const [survol, setSurvol] = useState<StatutIdee | null>(null);
  const [, lancer] = useTransition();

  const rafraichir = () => router.refresh();

  const voter = (id: number) => {
    lancer(async () => {
      const r = await voterIdee(id);
      if (!r.ok) return void toast.error(r.erreur);
      rafraichir();
    });
  };

  const deplacer = (id: number, statut: StatutIdee) => {
    const idee = idees.find((i) => i.id === id);
    if (!idee || idee.statut === statut) return;
    lancer(async () => {
      const r = await changerStatutIdee({ id, statut });
      if (!r.ok) return void toast.error(r.erreur);
      rafraichir();
    });
  };

  const ouvrirPlanification = (idee: IdeeDetail) => {
    const typePost = referencesCalendrier.types.find((t) => t.categorie === "post");
    if (!typePost) return void toast.error("Aucun type d'événement de catégorie post n'existe.");
    setDetailId(null);
    setPlanification({
      ideeId: idee.id,
      etat: {
        mode: "creer",
        valeurs: {
          titre: idee.titre,
          typeId: typePost.id,
          description: idee.description,
          post: { reseauxIds: idee.reseauxIds, formatIds: idee.formatIds, matchLieId: idee.matchLieId },
        },
      },
    });
  };

  const apresPostCree = (postId: number) => {
    if (!planification) return;
    const { ideeId } = planification;
    setPlanification(null);
    lancer(async () => {
      const r = await planifierIdee({ ideeId, postId });
      if (!r.ok) return void toast.error(r.erreur);
      toast.success("Post planifié, l'idée est retenue.");
      rafraichir();
    });
  };

  const surDepot = (statut: StatutIdee) => (e: DragEvent) => {
    e.preventDefault();
    setSurvol(null);
    const id = Number(e.dataTransfer.getData(TYPE_MIME));
    if (id > 0) deplacer(id, statut);
  };

  const colonnes = STATUTS_IDEE.map((statut) => ({
    statut,
    idees: trierIdees(
      idees.filter((i) => i.statut === statut),
      tri,
    ),
  }));

  const carte = (idee: IdeeCarte) => (
    <li key={idee.id}>
      <article
        draggable={peutEditer && !mobile}
        onDragStart={(e) => {
          e.dataTransfer.setData(TYPE_MIME, String(idee.id));
          e.dataTransfer.effectAllowed = "move";
        }}
        className={cn(
          "group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/50",
          peutEditer && !mobile && "cursor-grab active:cursor-grabbing",
        )}
      >
        <button type="button" className="text-left" onClick={() => setDetailId(idee.id)}>
          <h3 className="text-sm font-medium leading-snug">{idee.titre}</h3>
          {idee.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{idee.description}</p> : null}
        </button>
        {idee.formats.length > 0 || idee.reseaux.length > 0 || idee.postPlanifie ? (
          <div className="flex flex-wrap gap-1">
            {idee.postPlanifie ? <Etiquette>Planifiée</Etiquette> : null}
            {[...idee.formats, ...idee.reseaux].map((nom) => (
              <Etiquette key={nom}>{nom}</Etiquette>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => voter(idee.id)}
            aria-pressed={idee.aVote}
            aria-label={idee.aVote ? "Retirer mon vote" : "Voter"}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-secondary",
              idee.aVote ? "text-primary" : "",
            )}
          >
            <ThumbsUp className="size-3.5" aria-hidden="true" />
            {idee.votes}
          </button>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            {idee.nbCommentaires}
          </span>
          <span className="ml-auto truncate">
            {idee.auteur || "Membre"} · {formaterDateCourte(idee.creeLe)}
          </span>
        </div>
      </article>
    </li>
  );

  const colonne = (statut: StatutIdee, liste: IdeeCarte[]) => (
    <ul
      className={cn(
        "flex min-h-24 flex-col gap-2 rounded-lg p-1 transition-colors",
        survol === statut && "bg-primary/10 ring-1 ring-primary/40",
      )}
      onDragOver={peutEditer ? (e) => { e.preventDefault(); if (survol !== statut) setSurvol(statut); } : undefined}
      onDragLeave={peutEditer ? () => setSurvol(null) : undefined}
      onDrop={peutEditer ? surDepot(statut) : undefined}
    >
      {liste.length === 0 ? <li className="px-2 py-6 text-center text-xs text-muted-foreground">Rien ici.</li> : liste.map(carte)}
    </ul>
  );

  const enTete = (statut: StatutIdee, nombre: number) => (
    <span className="flex items-center gap-2">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COULEURS_STATUT_IDEE[statut] }} aria-hidden="true" />
      {LIBELLES_STATUT_IDEE[statut]}
      <span className="rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-secondary-foreground">{nombre}</span>
    </span>
  );

  return (
    <div className={mobile ? "flex flex-col gap-4" : "flex min-h-0 flex-1 flex-col gap-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="hubSecondary"
          size="sm"
          onClick={() => setTri((t) => (t === "votes" ? "date" : "votes"))}
          aria-label={`Trier par ${tri === "votes" ? "date" : "votes"}`}
        >
          <ArrowDownWideNarrow aria-hidden="true" />
          {tri === "votes" ? "Les plus votées" : "Les plus récentes"}
        </Button>
        {peutEditer && !mobile ? (
          <Button variant="hub" size="sm" onClick={() => setFormulaire({ mode: "creer" })}>
            <Plus aria-hidden="true" />
            Nouvelle idée
          </Button>
        ) : null}
      </div>

      {mobile ? (
        <Tabs defaultValue="new">
          <TabsList className="w-full">
            {colonnes.map(({ statut, idees: liste }) => (
              <TabsTrigger key={statut} value={statut} className="flex-1">
                {enTete(statut, liste.length)}
              </TabsTrigger>
            ))}
          </TabsList>
          {colonnes.map(({ statut, idees: liste }) => (
            <TabsContent key={statut} value={statut} className="mt-3">
              {colonne(statut, liste)}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 overflow-hidden">
          {colonnes.map(({ statut, idees: liste }) => (
            <section key={statut} className="flex min-h-0 flex-col rounded-lg border border-border bg-background/40">
              <h2 className="shrink-0 border-b border-border px-3 py-2 text-sm font-semibold">{enTete(statut, liste.length)}</h2>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">{colonne(statut, liste)}</div>
            </section>
          ))}
        </div>
      )}

      {peutEditer && mobile ? (
        <Button
          variant="hub"
          size="icon"
          className="fixed right-4 z-30 size-12 rounded-full shadow-lg"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 1rem)" }}
          aria-label="Nouvelle idée"
          onClick={() => setFormulaire({ mode: "creer" })}
        >
          <Plus className="size-5" aria-hidden="true" />
        </Button>
      ) : null}

      <DetailIdee
        key={detailId ?? "aucune"}
        id={detailId}
        peutEditer={peutEditer}
        utilisateurId={utilisateurId}
        estAdmin={estAdmin}
        onFermer={() => setDetailId(null)}
        onModifier={(idee) => {
          setDetailId(null);
          setFormulaire({ mode: "modifier", idee });
        }}
        onPlanifier={ouvrirPlanification}
        onChange={rafraichir}
      />

      <FormulaireIdee
        etat={formulaire}
        references={references}
        onFermer={() => setFormulaire(null)}
        onEnregistre={(idee) => {
          setFormulaire(null);
          rafraichir();
          setDetailId(idee.id);
        }}
      />

      <FormulaireEvenement
        etat={planification?.etat ?? null}
        references={referencesCalendrier}
        onFermer={() => setPlanification(null)}
        onEnregistre={(detail) => apresPostCree(detail.id)}
      />
    </div>
  );
}
