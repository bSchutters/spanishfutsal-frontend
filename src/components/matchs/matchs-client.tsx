"use client";

import BoxModule from "@/components/layout/boxModule";
import Team from "@/components/team";
import { Button } from "@/components/ui/button";
import useBreakpoint from "@/hooks/useBreakpoints";
import useLiveStatus from "@/hooks/useLiveStatus";
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

export default function MatchsClient({
  initialMatchs,
}: {
  initialMatchs: Match[];
}) {
  const { isMobile } = useBreakpoint();
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

  const hasLiveMatch = validMatchs.some((match) => {
    const end = new Date(match.matchDate.getTime() + 70 * 60 * 1000); // Durée estimée d'un match
    return now >= match.matchDate && now < end;
  });

  // La diffusion detectee sur la chaine du club, cherchee pendant la rencontre
  // seulement. Le lien saisi dans l'admin reste prioritaire.
  const detectedLiveUrl = useLiveStatus(hasLiveMatch);

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

          const isWaitingScore =
            match.homeScore === null && match.awayScore === null;

          const liveUrl =
            status === "live" ? match.liveLink || detectedLiveUrl : null;

          return (
            <div
              className={cn(
                "relative lg:p-6 p-4 bg-spanish-bg-dark rounded-lg flex lg:flex-row flex-col items-center justify-between gap-8",
                status === "live"
                  ? liveUrl
                    ? "border-2 border-red-600"
                    : "border-2 border-spanish-accent-2"
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
                    liveUrl ? "justify-between" : "justify-center",
                  )}
                >
                  {status === "finished" && match.replayLink && (
                    <Link href={match.replayLink} target="_blank">
                      <Button className="font-nugros uppercase">
                        {status === "finished" && (
                          <>
                            replay
                            <ExternalLink />
                          </>
                        )}
                      </Button>
                    </Link>
                  )}

                  {liveUrl && (
                    <Link href={liveUrl} target="_blank">
                      <Button className="font-nugros uppercase relative flex gap-4">
                        regarder le live
                        <div className="relative flex items-center justify-center">
                          <div className="w-2 h-2  bg-red-600 rounded-full absolute" />
                          <div className="w-2 h-2 animate-ping bg-red-600 rounded-full absolute" />
                        </div>
                      </Button>
                    </Link>
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
