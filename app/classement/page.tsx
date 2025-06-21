"use client";

import Graphiques from "@/components/classement/graphiques";
import BoxModule from "@/components/layout/boxModule";
import { Button } from "@/components/ui/button";
import { getTeamLogo } from "@/lib/getTeamLogo";
import { cn } from "@/lib/utils";
import { useRankingStore } from "@/store/useRankingStore";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Key, useEffect } from "react";

export default function Equipe() {
  const { rankings, isLoading, fetchRankings } = useRankingStore();

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

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
      <div className="flex items-center justify-center h-screen">
        <p className="text-2xl font-bold">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6">
      <div className="w-full flex justify-between items-center">
        <p className="text-4xl font-marjorie italic font-bold">classement</p>
        <Link href="https://www.lffs.eu" target="_blank">
          <Button className="font-nugros">
            LFFS P5E <ExternalLink />
          </Button>
        </Link>
      </div>
      <BoxModule className="flex flex-col h-full">
        <div className="flex justify-between items-center w-full font-bold uppercase text-spanish-bg-lighter">
          <p>équipes</p>
          <div className="flex gap-4 items-center p-2 ">
            <div className="grid md:grid-cols-[repeat(8,40px)] grid-cols-[repeat(2,40px)] gap-4 text-center">
              <p className="hidden md:block">J</p>
              <p className="hidden md:block">G</p>
              <p className="hidden md:block">E</p>
              <p className="hidden md:block">P</p>
              <p className="hidden md:block">BP</p>
              <p className="hidden md:block">BC</p>
              <p>DIFF</p>
              <p>PTS</p>
            </div>
            <div className="w-[152px] items-center justify-center hidden lg:flex">
              FORME
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col">
          {rankings.map((team) => (
            <div
              key={team.position}
              className={cn(
                "flex justify-between items-center  text-lg uppercase border-b-2 p-2 border-white last:border-none",
                team.teamName === "Spanish Futsal" ? "bg-spanish-bg-light" : ""
              )}
            >
              <div className="flex gap-4 items-center">
                <p
                  className={cn(
                    "italic font-marjorie font-bold xl:text-base text-sm w-3",
                    team.teamName === "Spanish Futsal"
                      ? "text-spanish-accent"
                      : ""
                  )}
                >
                  {team.position}
                </p>
                <div>
                  <Image
                    src={getTeamLogo(team.teamName)}
                    alt={team.teamName}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-8 h-8"
                  />
                </div>
                <p
                  className={cn(
                    "xl:text-base text-sm",
                    team.teamName === "Spanish Futsal"
                      ? "font-bold text-spanish-accent"
                      : ""
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
                        team.teamName === "Spanish Futsal"
                          ? "text-spanish-accent font-bold"
                          : ""
                      )}
                    >
                      {team[stat as keyof typeof team]}
                    </p>
                  ))}
                </div>
                <div className="gap-2 text-sm  font-bold hidden lg:flex">
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
                </div>
              </div>
              <div className="md:hidden grid grid-cols-[repeat(2,40px)] gap-4 text-center">
                <p
                  className={cn(
                    "italic font-marjorie xl:text-base text-sm text-center",
                    team.teamName === "Spanish Futsal"
                      ? "text-spanish-accent font-bold"
                      : ""
                  )}
                >
                  {team.goalDifference}
                </p>
                <p
                  className={cn(
                    "italic font-marjorie xl:text-base text-sm text-center",
                    team.teamName === "Spanish Futsal"
                      ? "text-spanish-accent font-bold"
                      : ""
                  )}
                >
                  {team.points}
                </p>
              </div>
            </div>
          ))}
        </div>
      </BoxModule>
      <p className="text-4xl font-marjorie italic font-bold">
        évolution notre position au classement par journée
      </p>

      <Graphiques />
    </div>
  );
}
