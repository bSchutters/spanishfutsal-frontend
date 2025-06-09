"use client";

import Team from "@/components/team";
import Image from "next/image";
import matchesOld from "@/mocks/matchesold.json";
import { Button } from "@/components/ui/button";
import { ExternalLink, Icon, Loader, MapPin, MapPinned } from "lucide-react";
import { getTeamLogo } from "@/lib/getTeamLogo";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getVenueById } from "@/lib/getVenueById";
import useBreakpoint from "@/hooks/useBreakpoints";
import { toast } from "sonner";
import { useMatchsStore } from "@/store/useMatchsStore";

export default function Matchs() {
  const { isMobile } = useBreakpoint();
  const { matchs, isLoading, fetchMatchs } = useMatchsStore();

  useEffect(() => {
    fetchMatchs();
  }, []);

  console.log("matchs", matchs);

  const now = new Date();

  // Filtrer les matchs valides (ceux qui ont une date ET time valide)
  const validMatchs = matchs
    .filter((match) => match.date && match.time)
    .map((match) => ({
      ...match,
      matchDate: new Date(`${match.date}T${match.time.padEnd(5, ":00")}`),
    }))
    .filter((match) => !isNaN(match.matchDate.getTime()));

  // Trier les matchs par date
  validMatchs.sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime());

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
    if (fallbackIndex !== -1 && matchRefs.current[fallbackIndex]) {
      matchRefs.current[fallbackIndex]?.scrollIntoView({
        behavior: "smooth",
        block: isMobile ? "end" : "center",
      });
    }
  }, [fallbackIndex, isMobile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="my-30 container mx-auto flex flex-col gap-8 lg:px-0 px-6">
      <p className="text-4xl font-marjorie italic font-bold">nos matchs</p>
      {matchs.map((match, index) => {
        const today = new Date();
        const matchDateTime = new Date(`${match.date}T${match.time}`);
        const oneHourAfter = new Date(matchDateTime.getTime() + 70 * 60 * 1000);

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

        return (
          <div
            className={cn(
              "relative lg:p-6 p-4 bg-spanish-bg-dark rounded-lg flex lg:flex-row flex-col items-center justify-between gap-8",
              status === "live" ? "border-2 border-spanish-accent" : ""
            )}
            key={index}
            ref={(el) => {
              matchRefs.current[index] = el;
            }}
          >
            <div className="flex items-center lg:gap-3 gap-2 lg:w-1/6 w-full text-end justify-between lg:justify-start lg:text-start">
              <Image
                src="/assets/images/lffs.png"
                alt="Team Logo"
                width={0}
                height={0}
                sizes="100vw"
                className="w-6 h-auto"
              />
              <div className="flex flex-col text-sm  leading-4">
                <p className="font-bold">
                  LFFS{" "}
                  {match.serieReference === "BTCPRES" ||
                  match.serieReference === "BTCPPRM"
                    ? "COUPE"
                    : match.serieReference}
                </p>
                {match.date && (
                  <p className="capitalize">
                    {new Date(match.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    • {match.time}
                  </p>
                )}
              </div>
            </div>
            <div className="grid xl:grid-cols-[1fr_100px_1fr] grid-cols-[1fr_50px_1fr]">
              <Team
                logo={getTeamLogo(match.homeTeam)}
                teamName={match.homeTeam}
                isMatchPage
                {...(isMobile && { logoFirst: true })}
                isMobile={isMobile}
              />
              <p className="text-2xl font-marjorie font-bold italic items-center justify-center flex">
                {status === "finished" && !isWaitingScore
                  ? match.homeScore + " - " + match.awayScore
                  : "vs"}
              </p>
              <Team
                logo={getTeamLogo(match.awayTeam)}
                teamName={match.awayTeam}
                isMatchPage
                logoFirst
                isMobile={isMobile}
              />
            </div>
            <div className="w-full lg:w-1/6 flex items-center lg:justify-end justify-center ">
              <div
                className={cn(
                  "flex items-center gap-2 w-full lg:w-auto", // S'il y a deux boutons (replay/live + adresse)
                  (status === "finished" && match.replayLink) ||
                    (status === "live" && match.liveLink)
                    ? "justify-between"
                    : "justify-center"
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

                {status === "live" && match.liveLink && (
                  <Link href={match.liveLink} target="_blank">
                    <Button className="font-nugros uppercase relative flex gap-4">
                      regarder le live
                      <div className="relative flex items-center justify-center">
                        <div className="w-2 h-2  bg-red-500 rounded-full absolute" />
                        <div className="w-2 h-2 animate-ping bg-red-500 rounded-full absolute" />
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
                              "!bg-spanish-accent  !text-spanish-bg !font-bold hover:!bg-spanish-accent-dark !transition-all",
                            cancelButton: "cancel-button",
                            closeButton: "close-button",
                            icon: "!mr-2",
                          },
                          icon: <MapPinned />,
                          duration: 50000,
                          action: {
                            label: "Copier l'adresse",
                            onClick: () => {
                              const venue = getVenueById(Number(match.venueId));
                              if (venue) {
                                navigator.clipboard.writeText(
                                  (venue.street || "") +
                                    " " +
                                    (venue.street2 || "") +
                                    ", " +
                                    (venue.zip || "") +
                                    " " +
                                    (venue.city || "")
                                );
                              }
                            },
                          },
                        }
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
  );
}
