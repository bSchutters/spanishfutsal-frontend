"use client";

import BoxModule from "@/components/layout/boxModule";
import { cn } from "@/lib/utils";
import type { Ranking } from "@/lib/getRankings";
import { useRankingStore } from "@/store/useRankingStore";
import { useSeasonStore } from "@/store/useSeasonStore";
import SeasonSelector from "@/components/season-selector";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useEffect, useCallback } from "react";

export default function ClassementClient({
  initialRankings,
}: {
  initialRankings: Ranking[];
}) {
  const { isLoading, fetchRankings, reset } = useRankingStore();
  const { setSelectedSeason } = useSeasonStore();
  const isArchived = useSeasonStore((s) => s.isArchivedSeason());

  // Le classement rendu par le serveur tient jusqu'au premier changement de
  // saison. Sans cela, la page repartirait d'un tableau vide a l'hydratation.
  const fetchedRankings = useRankingStore((s) => s.rankings);
  const hasFetched = useRankingStore((s) => s.hasFetched);
  const rankings = hasFetched ? fetchedRankings : initialRankings;

  useEffect(() => {
    // A chaque arrivee sur la page, on repart des donnees du serveur : sans ce
    // reset, un classement d'archive consulte auparavant resterait affiche sous
    // un selecteur revenu a la saison active.
    setSelectedSeason(null);
    reset();
  }, [reset, setSelectedSeason]);

  const handleSeasonChange = useCallback(
    (seasonId: number | null) => {
      fetchRankings(seasonId);
    },
    [fetchRankings],
  );

  const statsForTeams = [
    "played",
    "wins",
    "draws",
    "losses",
    "goalsFor",
    "goalsAgainst",
    "goalDifference",
    "points",
  ];
  if (isLoading) {
    return (
      <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6">
        <div className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-marjorie italic font-bold">
            Classement
          </h1>
          <SeasonSelector onSeasonChange={handleSeasonChange} />
        </div>
        <BoxModule className="flex flex-col h-full">
          <div className="flex justify-between items-center w-full font-bold uppercase text-white/70 p-2">
            <p>équipes</p>
          </div>
          <div className="w-full flex flex-col gap-1 p-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-2 animate-pulse"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-4 h-4 bg-spanish-bg-lighter rounded" />
                  <div className="w-8 h-8 bg-spanish-bg-lighter rounded-full" />
                  <div className="w-32 h-4 bg-spanish-bg-lighter rounded" />
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-4 bg-spanish-bg-lighter rounded" />
                  <div className="w-8 h-4 bg-spanish-bg-lighter rounded" />
                </div>
              </div>
            ))}
          </div>
        </BoxModule>
      </div>
    );
  }

  return (
    <>
      <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6">
        <div className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-marjorie italic font-bold">
            Classement
          </h1>
          <SeasonSelector onSeasonChange={handleSeasonChange} />
        </div>
        <BoxModule className="flex flex-col h-full">
          <div className="flex justify-between items-center w-full font-bold uppercase text-white/70">
            <p>équipes</p>
            <div className="flex gap-4 items-center p-2 ">
              <div className="grid md:grid-cols-[repeat(8,40px)] grid-cols-[repeat(2,40px)] gap-4 text-center">
                <p className="hidden md:block">J</p>
                <p className="hidden md:block">G</p>
                <p className="hidden md:block">E</p>
                <p className="hidden md:block">P</p>
                <p className="hidden md:block">BP</p>
                <p className="hidden md:block">BC</p>
                <p>+/-</p>
                <p>PTS</p>
              </div>
              {/* <div className="w-[152px] items-center justify-center hidden lg:flex">
              FORME
            </div> */}
            </div>
          </div>
          <div className="w-full flex flex-col">
            {rankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <p className="font-marjorie text-xl font-bold italic">
                  Classement pas encore disponible
                </p>
                <p className="text-sm text-white/70">
                  Il sera affiché dès sa publication par la LFFS.
                </p>
              </div>
            ) : (
              rankings.map((team) => (
                <div
                  key={team.teamName}
                  className={cn(
                    "flex justify-between items-center  text-lg uppercase border-b-2 p-2 border-white last:border-none",
                    team.isClub ? "bg-spanish-accent-2-light/10" : "",
                    team.position === 1
                      ? "rounded-t-lg"
                      : team.position === 12
                        ? "rounded-b-lg"
                        : "",
                  )}
                >
                  <div className="flex gap-4 items-center">
                    <p className="w-4 h-4 flex items-center justify-center">
                      {isArchived ? (
                        "-"
                      ) : team.positionChange === "no_change" ||
                        team.positionChange === null ? (
                        "-"
                      ) : team.positionChange === "up" ? (
                        <ChevronUp className="text-green-500" />
                      ) : (
                        <ChevronDown className="text-red-500" />
                      )}
                    </p>
                    <p
                      className={cn(
                        "italic font-marjorie font-bold xl:text-base text-sm w-3",
                        team.isClub ? "text-spanish-accent-2" : "",
                      )}
                    >
                      {team.position}
                    </p>
                    <div>
                      <Image
                        src={team.teamLogo}
                        alt={team.teamName}
                        width={0}
                        height={0}
                        // Largeur reelle de l'emplacement (logo dans le tableau), et non celle de la fenetre.
                        sizes="32px"
                        className="w-8 h-8"
                      />
                    </div>
                    <p
                      className={cn(
                        "xl:text-base text-sm md:max-w-none max-w-20 truncate",
                        team.isClub ? "font-bold text-spanish-accent-2" : "",
                      )}
                    >
                      {team.teamName}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="md:grid md:grid-cols-[repeat(8,40px)] hidden gap-4 text-center">
                      {statsForTeams.map((stat) => (
                        <p
                          key={stat}
                          className={cn(
                            " xl:text-base text-sm",
                            team.isClub
                              ? "text-spanish-accent-2 font-bold"
                              : "",
                          )}
                        >
                          {stat === "goalDifference" && team.goalDifference > 0
                            ? `+${team[stat as keyof typeof team]}`
                            : team[stat as keyof typeof team]}
                        </p>
                      ))}
                    </div>
                    {/* <div className="gap-2 text-sm  font-bold hidden lg:flex">
                  {JSON.parse(team.result_sequence)?.map(
                    (form: string, index: Key) => (
                      <div
                        key={index}
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded-sm",
                          form === "W" && "bg-green-700",
                          form === "D" && "bg-yellow-700",
                          form === "L" && "bg-red-700"
                        )}
                      >
                        {form === "W" && "G"}
                        {form === "D" && "N"}
                        {form === "L" && "P"}
                      </div>
                    )
                  )}
                </div> */}
                  </div>
                  <div className="md:hidden grid grid-cols-[repeat(2,40px)] gap-4 text-center">
                    <p
                      className={cn(
                        "italic font-marjorie xl:text-base text-sm text-center",
                        team.isClub ? "text-spanish-accent-2 font-bold" : "",
                      )}
                    >
                      {team.goalDifference > 0
                        ? `+${team.goalDifference}`
                        : team.goalDifference}
                    </p>
                    <p
                      className={cn(
                        "italic font-marjorie xl:text-base text-sm text-center",
                        team.isClub ? "text-spanish-accent-2 font-bold" : "",
                      )}
                    >
                      {team.points}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </BoxModule>
        {/*
      <p className="text-4xl font-marjorie italic font-bold">
        évolution de notre position au classement par journée
      </p>

      <Graphiques /> */}
      </div>
    </>
  );
}
