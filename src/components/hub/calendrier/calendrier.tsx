"use client";

import type { EventChangeInfo, EventInput } from "@fullcalendar/react";
import frLocale from "@fullcalendar/react/locales/fr";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { EventCalendar } from "@/components/event-calendar";
import { Button } from "@/components/ui/button";
import { deplacerEvenement } from "@/hub/actions/evenements";
import type { EvenementCalendrier, EvenementDetail, References } from "@/hub/calendrier/donnees";
import { COULEURS_STATUT } from "@/hub/calendrier/schema";
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

// Sur mobile, « 14–20 septembre 2026 » ne tient pas a cote des boutons :
// les vues de la semaine prennent un titre court, « 14–20 sept. ». L annee
// se lit dans la vue mois.
const TITRE_COURT = { day: "numeric", month: "short" } as const;
const VUES_MOBILE = { timeGridWeek: { titleFormat: TITRE_COURT }, listWeek: { titleFormat: TITRE_COURT } };

type Props = {
  references: References;
  peutEditer: boolean;
  utilisateurId: number;
  estAdmin: boolean;
  /** Decide par le serveur d'apres l'appareil : liste d'abord, page qui defile. */
  mobile: boolean;
};

function versEntree(ev: EvenementCalendrier, peutEditer: boolean): EventInput {
  const deplacable = peutEditer && !ev.recurrent && ev.source !== "lffs";
  return {
    id: ev.cle,
    title: ev.titre,
    start: ev.debut,
    end: ev.fin ?? undefined,
    allDay: ev.journeeEntiere,
    color: ev.couleur ?? undefined,
    editable: deplacable,
    extendedProps: {
      evenementId: ev.id,
      annule: ev.annule,
      deplacable,
      couleurStatut: ev.categorie === "post" && ev.statut ? COULEURS_STATUT[ev.statut] : null,
    },
  };
}

/**
 * Le calendrier du club : mois, semaine ou liste, la liste d'abord sur un
 * telephone. Les evenements sont lus par plage affichee, les filtres
 * s'appliquent dans le navigateur et s'y memorisent.
 */
export default function Calendrier({ references, peutEditer, utilisateurId, estAdmin, mobile }: Props) {
  const filtres = useSyncExternalStore(abonnerFiltres, lireFiltresMemorises, filtresServeur);
  const parametres = useSearchParams();
  const [evenements, setEvenements] = useState<EvenementCalendrier[]>([]);
  // Un lien vers un evenement (flux, notification) ouvre son panneau d'emblee.
  const [detailId, setDetailId] = useState<number | null>(() => {
    const demande = Number(parametres.get("evenement"));
    return Number.isInteger(demande) && demande > 0 ? demande : null;
  });
  const [formulaire, setFormulaire] = useState<EtatFormulaire | null>(null);
  const plage = useRef<{ debut: string; fin: string } | null>(null);
  // Sur un telephone, la liste d'abord, et le calendrier prend la hauteur de
  // son contenu : c'est la page qui defile. Sur grand ecran, il remplit
  // l'espace restant et defile lui-meme.
  // La vue mois partout : Bryan la prefere aussi sur telephone.
  const vueInitiale = "dayGridMonth";

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
    <div className={mobile ? "flex flex-col gap-4" : "flex min-h-0 flex-1 flex-col gap-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BarreFiltres references={references} filtres={filtres} onChange={changerFiltres} />
        {peutEditer ? (
          <Button variant="hub" size="sm" onClick={() => setFormulaire({ mode: "creer" })}>
            <Plus aria-hidden="true" />
            {/* Sur mobile, l'icone suffit : filtres, interrupteur et bouton tiennent sur une ligne. */}
            <span className="max-md:sr-only">Nouvel événement</span>
          </Button>
        ) : null}
      </div>

      <EventCalendar
          className={mobile ? "text-sm" : "min-h-[28rem] flex-1 text-sm"}
          locale={frLocale}
          firstDay={1}
          initialView={vueInitiale}
          availableViews={VUES}
          height={mobile ? "auto" : "100%"}
          // Sur mobile, c'est la page qui defile : l'en-tete des jours colle
          // alors au milieu de l'ecran et recouvre les evenements. On le
          // laisse defiler avec le reste.
          tableHeaderSticky={!mobile}
          views={mobile ? VUES_MOBILE : undefined}
          events={entrees}
          // Un bloc colore pour tous, meme a heure fixe dans la vue mois :
          // sans cela FullCalendar les montre en simple point.
          eventDisplay="block"
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
          eventContent={(info) => {
            const couleurStatut = info.event.extendedProps.couleurStatut as string | null;
            return (
              <span className="flex min-w-0 items-center gap-1 px-1 py-px">
                {couleurStatut ? (
                  <span
                    className="size-1.5 shrink-0 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: couleurStatut }}
                    aria-hidden="true"
                  />
                ) : null}
                {info.timeText ? <span className="shrink-0 tabular-nums opacity-80">{info.timeText}</span> : null}
                <span className="truncate font-medium">{info.event.title}</span>
              </span>
            );
          }}
          eventDidMount={(info) => {
            if (info.event.extendedProps.annule) info.el.classList.add("line-through", "opacity-60");
          }}
        />

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
