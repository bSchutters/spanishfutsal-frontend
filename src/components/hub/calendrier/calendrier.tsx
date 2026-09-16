"use client";

import type { EventChangeInfo, EventInput } from "@fullcalendar/react";
import frLocale from "@fullcalendar/react/locales/fr";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { EventCalendar } from "@/components/event-calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deplacerEvenement } from "@/hub/actions/evenements";
import type { EvenementCalendrier, EvenementDetail, References } from "@/hub/calendrier/donnees";
import { REPERES_STATUT } from "@/hub/calendrier/schema";
import BarreFiltres from "./barre-filtres";
import DetailEvenement from "./detail-evenement";
import {
  abonnerFiltres,
  ecrireFiltres,
  filtresServeur,
  lireFiltresMemorises,
  passeLesFiltres,
  type Filtres,
} from "./filtres";
import FormulaireEvenement, { type EtatFormulaire } from "./formulaire-evenement";

const VUES = ["dayGridMonth", "timeGridWeek", "listWeek"];

// Le calendrier ne se rend que dans le navigateur : la vue de depart depend
// de la largeur de l'ecran, et les filtres du stockage local.
const rienAEcouter = () => () => {};
const coteNavigateur = () => true;
const coteServeur = () => false;

type Props = {
  references: References;
  peutEditer: boolean;
  utilisateurId: number;
  estAdmin: boolean;
};

function versEntree(ev: EvenementCalendrier, peutEditer: boolean): EventInput {
  const repere = ev.categorie === "post" && ev.statut ? `${REPERES_STATUT[ev.statut]} ` : "";
  const deplacable = peutEditer && !ev.recurrent && ev.source !== "lffs";
  return {
    id: ev.cle,
    title: `${repere}${ev.titre}`,
    start: ev.debut,
    end: ev.fin ?? undefined,
    allDay: ev.journeeEntiere,
    color: ev.couleur ?? undefined,
    editable: deplacable,
    extendedProps: { evenementId: ev.id, annule: ev.annule, deplacable },
  };
}

/**
 * Le calendrier du club : mois, semaine ou liste, la liste d'abord sur un
 * telephone. Les evenements sont lus par plage affichee, les filtres
 * s'appliquent dans le navigateur et s'y memorisent.
 */
export default function Calendrier({ references, peutEditer, utilisateurId, estAdmin }: Props) {
  const monte = useSyncExternalStore(rienAEcouter, coteNavigateur, coteServeur);
  const filtres = useSyncExternalStore(abonnerFiltres, lireFiltresMemorises, filtresServeur);
  const [evenements, setEvenements] = useState<EvenementCalendrier[]>([]);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [formulaire, setFormulaire] = useState<EtatFormulaire | null>(null);
  const plage = useRef<{ debut: string; fin: string } | null>(null);
  const vueInitiale = monte && window.innerWidth < 768 ? "listWeek" : "dayGridMonth";

  const charger = useCallback(async () => {
    if (!plage.current) return;
    const { debut, fin } = plage.current;
    try {
      const reponse = await fetch(
        `/api/hub/evenements?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`,
        { credentials: "include" },
      );
      if (!reponse.ok) throw new Error(String(reponse.status));
      const json = (await reponse.json()) as { evenements: EvenementCalendrier[] };
      setEvenements(json.evenements);
    } catch {
      toast.error("Impossible de charger les événements.");
    }
  }, []);

  const changerFiltres = (f: Filtres) => ecrireFiltres(f);

  const entrees = useMemo(
    () => evenements.filter((ev) => passeLesFiltres(ev, filtres, utilisateurId)).map((ev) => versEntree(ev, peutEditer)),
    [evenements, filtres, utilisateurId, peutEditer],
  );

  const ouvrirModification = (detail: EvenementDetail) => {
    setDetailId(null);
    setFormulaire({ mode: "modifier", detail });
  };

  const apresDeplacement = (info: EventChangeInfo) => {
    const id = Number(info.event.extendedProps.evenementId);
    const debut = info.event.start?.toISOString();
    const fin = info.event.end ? info.event.end.toISOString() : null;
    if (!debut) return info.revert();

    void (async () => {
      const r = await deplacerEvenement({ id, debut, fin });
      if (!r.ok || !r.donnees) {
        info.revert();
        toast.error(r.ok ? "Déplacement impossible." : r.erreur);
        return;
      }
      const avant = r.donnees;
      toast.success("Événement déplacé.", {
        action: {
          label: "Annuler",
          onClick: () => {
            void (async () => {
              const retour = await deplacerEvenement({ id, debut: avant.debut, fin: avant.fin });
              if (!retour.ok) toast.error(retour.erreur);
              void charger();
            })();
          },
        },
      });
    })();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BarreFiltres references={references} filtres={filtres} onChange={changerFiltres} />
        {peutEditer ? (
          <Button variant="hub" size="sm" onClick={() => setFormulaire({ mode: "creer" })}>
            <Plus aria-hidden="true" />
            Nouvel événement
          </Button>
        ) : null}
      </div>

      {monte ? (
        <EventCalendar
          className="text-sm"
          locale={frLocale}
          firstDay={1}
          initialView={vueInitiale}
          availableViews={VUES}
          height="auto"
          events={entrees}
          editable={peutEditer}
          nowIndicator
          dayMaxEvents={4}
          slotMinTime="07:00:00"
          slotMaxTime="24:00:00"
          scrollTime="17:00:00"
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          datesSet={(info) => {
            plage.current = { debut: info.start.toISOString(), fin: info.end.toISOString() };
            void charger();
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            setDetailId(Number(info.event.extendedProps.evenementId));
          }}
          dateClick={
            peutEditer
              ? (info) => setFormulaire({ mode: "creer", debut: info.date, journeeEntiere: info.allDay })
              : undefined
          }
          eventAllow={(_span, evenement) => Boolean(evenement?.extendedProps.deplacable)}
          eventDrop={apresDeplacement}
          eventResize={apresDeplacement}
          eventDidMount={(info) => {
            if (info.event.extendedProps.annule) info.el.classList.add("line-through", "opacity-60");
          }}
        />
      ) : (
        <Skeleton className="h-[32rem] w-full rounded-lg" />
      )}

      <DetailEvenement
        key={detailId ?? "aucun"}
        id={detailId}
        references={references}
        peutEditer={peutEditer}
        utilisateurId={utilisateurId}
        estAdmin={estAdmin}
        onFermer={() => setDetailId(null)}
        onModifier={ouvrirModification}
        onChange={() => void charger()}
      />

      <FormulaireEvenement
        etat={formulaire}
        references={references}
        onFermer={() => setFormulaire(null)}
        onEnregistre={(detail) => {
          setFormulaire(null);
          void charger();
          setDetailId(detail.id);
        }}
      />
    </div>
  );
}
