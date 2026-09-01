"use client";

import BoxModule from "@/components/layout/boxModule";
import Team from "@/components/team";
import { Button } from "@/components/ui/button";
import useBreakpoint from "@/hooks/useBreakpoints";
import { useLiveStore } from "@/store/useLiveStore";
import { extractVideoId } from "@/lib/youtubeVideoId";
import { getVenueById } from "@/lib/getVenueById";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/getMatchs";
import { useMatchsStore } from "@/store/useMatchsStore";
import { useSeasonStore } from "@/store/useSeasonStore";
import SeasonSelector from "@/components/season-selector";
import {
  ExternalLink,
  Handshake,
  MapPin,
  MapPinned,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

/** Le point qui bat, commun au bandeau, au bouton et a la pastille d'etat. */
function Bulle() {
  return (
    <span className="relative flex size-2 items-center justify-center">
      <span className="absolute size-2 rounded-full bg-white" />
      <span className="absolute size-2 animate-ping rounded-full bg-white" />
    </span>
  );
}

export default function MatchsClient({
  initialMatchs,
}: {
  initialMatchs: Match[];
}) {
  const { isMobile } = useBreakpoint();
  const live = useLiveStore((s) => s.live);
  const ouvrir = useLiveStore((s) => s.ouvrir);
  const { isLoading, fetchMatchs, reset } = useMatchsStore();
  const { breakpoint } = useBreakpoint();
  const { setSelectedSeason } = useSeasonStore();
  const isArchived = useSeasonStore((s) => s.isArchivedSeason());

  // Le calendrier rendu par le serveur tient jusqu'au premier changement de
  // saison. Sans cela, la page repartirait d'une liste vide a l'hydratation.
  const fetchedMatchs = useMatchsStore((s) => s.matchs);
  const hasFetched = useMatchsStore((s) => s.hasFetched);
  const matchs = hasFetched ? fetchedMatchs : initialMatchs;

  useEffect(() => {
    // A chaque arrivee sur la page, on repart des donnees du serveur : sans ce
    // reset, un classement d'archive consulte auparavant resterait affiche sous
    // un selecteur revenu a la saison active.
    setSelectedSeason(null);
    reset();
  }, [reset, setSelectedSeason]);

  const handleSeasonChange = useCallback(
    (seasonId: number | null) => {
      fetchMatchs(seasonId);
    },
    [fetchMatchs],
  );

  const now = new Date();

  // Filtrer les matchs valides (ceux qui ont une date ET time valide)
  const validMatchs = matchs
    .filter((match) => match.date && match.time)
    .map((match) => ({
      ...match,
      matchDate: new Date(`${match.date}T${match.time.padEnd(5, ":00")}`),
    }))
    .filter((match) => !isNaN(match.matchDate.getTime()));

  // Trouver l'index du prochain match futur
  const closestIndex = validMatchs.findIndex((match) => match.matchDate >= now);

  // Fallback : dernier match joué (matchDate < now)
  let fallbackIndex = closestIndex;
  if (closestIndex === -1) {
    const lastPlayedIndex = validMatchs
      .map((match, index) => ({ index, matchDate: match.matchDate }))
      .filter((item) => item.matchDate < now)
      .map((item) => item.index)
      .pop(); // le dernier index < now

    fallbackIndex = lastPlayedIndex !== undefined ? lastPlayedIndex : -1;
  }

  // Créer un tableau de refs
  const matchRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (
      !isArchived &&
      fallbackIndex !== -1 &&
      matchRefs.current[fallbackIndex]
    ) {
      matchRefs.current[fallbackIndex]?.scrollIntoView({
        behavior: "instant",
        block: isMobile ? "end" : "center",
      });
    }
  }, [fallbackIndex, isMobile, isArchived]);

  if (isLoading) {
    return (
      <div className="my-30 container mx-auto flex flex-col gap-8 lg:px-0 px-6">
        <div className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-marjorie italic font-bold">
            Nos matchs
          </h1>
          <SeasonSelector
            onSeasonChange={handleSeasonChange}
            prefetch="matches"
          />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BoxModule
              key={i}
              className="flex flex-col gap-4 p-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="w-24 h-5 bg-spanish-bg-lighter rounded" />
                <div className="w-16 h-5 bg-spanish-bg-lighter rounded" />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 bg-spanish-bg-lighter rounded-full" />
                  <div className="w-28 h-4 bg-spanish-bg-lighter rounded" />
                </div>
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 bg-spanish-bg-lighter rounded" />
                  <div className="w-3 h-4 bg-spanish-bg-lighter rounded" />
                  <div className="w-6 h-6 bg-spanish-bg-lighter rounded" />
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-28 h-4 bg-spanish-bg-lighter rounded" />
                  <div className="w-8 h-8 bg-spanish-bg-lighter rounded-full" />
                </div>
              </div>
            </BoxModule>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="my-30 container mx-auto flex flex-col gap-8 lg:px-0 px-6">
        <div className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-marjorie italic font-bold">
            Nos matchs
          </h1>
          <SeasonSelector
            onSeasonChange={handleSeasonChange}
            prefetch="matches"
          />
        </div>
        {validMatchs.map((match, index) => {
          const isLffsCompetition = !["AMICAL", "TOURNOIS"].includes(
            match.serieReference,
          );
          const today = new Date();
          const matchDateTime = new Date(`${match.date}T${match.time}`);
          const oneHourAfter = new Date(
            matchDateTime.getTime() + 70 * 60 * 1000,
          );

          let status = "";
          if (today < matchDateTime) {
            status = "after";
          } else if (today >= matchDateTime && today < oneHourAfter) {
            status = "live";
          } else {
            status = "finished";
          }

          // La route fait foi sur ce qui diffuse, y compris avant le coup
          // d'envoi : la chaine ouvre souvent une demi-heure plus tot.
          const enDirect =
            live?.match?.id === match.id ||
            (status === "live" && Boolean(match.liveLink));

          // Deux conditions, et pas une de moins : la route voit une diffusion
          // pour cette rencontre precise, et elle est sur YouTube donc lisible
          // sur le site.
          const ouvreLeLecteur =
            live?.match?.id === match.id && Boolean(live.videoId);

          // Le replay s'ouvre dans le lecteur du site s'il est sur YouTube.
          // Rempli a la main ou retenu par la route pendant la diffusion, le
          // champ a la meme forme dans les deux cas.
          const replayVideoId = match.replayLink
            ? extractVideoId(match.replayLink)
            : null;

          const affiche = `${match.homeTeam} - ${match.awayTeam}`;
          const contexte = `${match.competitionName} · ${match.time}`;

          const isWaitingScore =
            match.homeScore === null && match.awayScore === null;

          // Une rencontre est-elle en cours, d'apres l'horloge ou d'apres la
          // route ? La seconde fait foi et voit la diffusion avant le coup
          // d'envoi, sans quoi le lisere du prochain match l'emporterait sur le
          // rouge du direct.
          const hasLiveMatch =
            Boolean(live) ||
            validMatchs.some((m) => {
              const matchStart = m.matchDate;
              const matchEnd = new Date(matchStart.getTime() + 70 * 60 * 1000); // Durée estimée d'un match
              return now >= matchStart && now < matchEnd;
            });

          return (
            <div
              className={cn(
                "relative lg:p-6 p-4 bg-spanish-bg-dark rounded-lg flex lg:flex-row flex-col items-center justify-between gap-8",
                enDirect
                  ? "border-2 border-red-600"
                  : status === "live"
                    ? "border-2 border-spanish-accent-2"
                    : "",
                fallbackIndex === index &&
                  !isArchived &&
                  !hasLiveMatch &&
                  "border-2 border-spanish-accent",
              )}
              key={index}
              ref={(el) => {
                matchRefs.current[index] = el;
              }}
            >
              <div className="flex items-center lg:gap-3 gap-2 lg:w-1/6 w-full text-end justify-between lg:justify-start lg:text-start">
                {isLffsCompetition && (
                  <Image
                    src="/assets/images/lffs.png"
                    alt="Team Logo"
                    width={0}
                    height={0}
                    // Largeur reelle de l'emplacement (logo dans une rencontre), et non celle de la fenetre.
                    sizes="96px"
                    className="w-6 h-auto"
                  />
                )}
                {match.serieReference === "AMICAL" && (
                  <div>
                    <Handshake className="w-6 h-auto text-spanish-accent" />
                  </div>
                )}
                {match.serieReference === "TOURNOIS" && (
                  <div>
                    <Trophy className="w-6 h-auto text-spanish-accent" />
                  </div>
                )}
                <div className="flex flex-col text-sm  leading-4">
                  <p className="font-bold">
                    {isLffsCompetition ? "LFFS " : ""}
                    {match.competitionName}
                  </p>
                  {match.date && (
                    <p className="capitalize">
                      {new Date(match.date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      • {match.time}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-2 sm:gap-0 xl:grid-cols-[1fr_100px_1fr] grid-cols-[1fr_50px_1fr]">
                <Team
                  logo={match.homeTeamLogo}
                  teamName={match.homeTeam}
                  isClub={match.homeIsClub}
                  isMatchPage
                  {...(isMobile && { logoFirst: true })}
                  isMobile={isMobile}
                />
                <p className="text-2xl font-marjorie font-bold italic items-center justify-center flex ">
                  {status === "finished" && !isWaitingScore
                    ? match.homeScore + " - " + match.awayScore
                    : "vs"}
                </p>
                <Team
                  logo={match.awayTeamLogo}
                  teamName={match.awayTeam}
                  isClub={match.awayIsClub}
                  isMatchPage
                  logoFirst
                  isMobile={isMobile}
                />
              </div>

              <div
                className={cn(
                  "w-full lg:w-1/6 flex items-center lg:justify-end justify-center",
                  breakpoint === "xs" &&
                    !match.replayLink &&
                    status === "finished" &&
                    "hidden",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 w-full lg:w-auto", // S'il y a deux boutons (replay/live + adresse)
                    enDirect ? "justify-between" : "justify-center",
                  )}
                >
                  {status === "finished" &&
                    match.replayLink &&
                    (replayVideoId ? (
                      <Button
                        onClick={() =>
                          ouvrir({
                            mode: "replay",
                            videoId: replayVideoId,
                            url: match.replayLink,
                            affiche,
                            contexte,
                            viewers: null,
                          })
                        }
                        className="font-nugros uppercase"
                      >
                        replay
                      </Button>
                    ) : (
                      // Replay heberge ailleurs : il reste un lien sortant.
                      <Link href={match.replayLink} target="_blank">
                        <Button className="font-nugros uppercase">
                          replay
                          <ExternalLink />
                        </Button>
                      </Link>
                    ))}

                  {ouvreLeLecteur ? (
                    <Button
                      onClick={() =>
                        ouvrir({
                          mode: "direct",
                          videoId: live!.videoId as string,
                          url: live!.url,
                          affiche,
                          contexte,
                          viewers: live!.viewers,
                        })
                      }
                      aria-label={`Regarder ${match.homeTeam} contre ${match.awayTeam} en direct`}
                      className="font-nugros uppercase bg-red-600 border-red-800 text-white hover:bg-red-800"
                    >
                      <Bulle />
                      regarder
                    </Button>
                  ) : (
                    enDirect && (
                      <span className="flex items-center gap-2 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold uppercase italic text-white">
                        <Bulle />
                        en direct
                      </span>
                    )
                  )}
                  {match.venueId && status !== "finished" && (
                    <Button
                      className="font-nugros uppercase"
                      onClick={() => {
                        toast(
                          <div className="flex flex-col">
                            <p className="font-bold">
                              {getVenueById(Number(match.venueId))?.street}{" "}
                              {getVenueById(Number(match.venueId))?.street2}
                            </p>
                            <p>
                              {getVenueById(Number(match.venueId))?.city}{" "}
                              {getVenueById(Number(match.venueId))?.zip}
                            </p>
                          </div>,
                          {
                            classNames: {
                              toast:
                                "!bg-spanish-bg-dark !text-white !border-spanish-bg-light",
                              title: "title",
                              description: "description",
                              actionButton:
                                "!bg-spanish-accent  !text-spanish-bg !font-bold hover:!bg-spanish-accent-dark !transition-colors",
                              cancelButton: "cancel-button",
                              closeButton: "close-button",
                              icon: "!mr-2",
                            },
                            icon: <MapPinned />,
                            duration: 50000,
                            action: {
                              label: "Copier l'adresse",
                              onClick: () => {
                                const venue = getVenueById(
                                  Number(match.venueId),
                                );
                                if (venue) {
                                  navigator.clipboard.writeText(
                                    (venue.street || "") +
                                      " " +
                                      (venue.street2 || "") +
                                      ", " +
                                      (venue.zip || "") +
                                      " " +
                                      (venue.city || ""),
                                  );
                                }
                              },
                            },
                          },
                        );
                      }}
                    >
                      Adresse
                      <MapPin />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
