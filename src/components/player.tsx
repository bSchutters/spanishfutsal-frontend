"use client";

import useBreakpoint from "@/hooks/useBreakpoints";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import BoxModule from "./layout/boxModule";
import { Badge } from "./ui/badge";

interface PlayerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
}

interface PlayerProps {
  firstname: string;
  lastname: string;
  number: number;
  photo: string;
  stats?: PlayerStats;
  active: boolean;
  className?: string;
  poste?: "Joueur" | "Gardien" | "Staff";
}

export default function Player({
  firstname,
  lastname,
  number,
  photo,
  stats,
  active,
  className,
  poste,
}: PlayerProps) {
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const { breakpoint } = useBreakpoint();

  function shortenName(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + ".";
  }

  return (
    <BoxModule
      className={cn(
        "relative lg:w-72 flex flex-col items-center justify-center overflow-hidden",
        className,
      )}
    >
      {stats && (
        <div
          className={cn(
            "absolute top-0 left-0 w-full h-full bg-spanish-bg-dark rounded-lg z-20 p-4 transition-all duration-700 flex flex-col  justify-between",
            isStatsOpen
              ? "opacity-100 pointer-events-auto -translate-y-0"
              : "opacity-0 pointer-events-none -translate-y-10",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <p className="">STATS</p>
            <X
              className="hover:cursor-pointer hover:text-spanish-accent-2 transition-all"
              onClick={() => setIsStatsOpen(!isStatsOpen)}
            />
          </div>

          {poste === "Gardien" ? (
            // Gardiens : Matchs/Clean Sheets, Cartons, Goals/Assists
            <div className="grid grid-cols-2 gap-4 items-center justify-center text-center">
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.matchesPlayed}
                </p>
                <p className="text-xs uppercase">matchs joués</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.cleanSheets}
                </p>
                <p className="text-xs uppercase">clean sheets</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.yellowCards}
                </p>
                <p className="text-xs uppercase">carton jaune</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.redCards}
                </p>
                <p className="text-xs uppercase">carton rouge</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.goals}
                </p>
                <p className="text-xs uppercase">goals</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.assists}
                </p>
                <p className="text-xs uppercase">assists</p>
              </div>
            </div>
          ) : (
            // Joueurs : Matchs (centré), Goals/Assists, Cartons
            <div className="grid grid-cols-2 gap-4 items-center justify-center text-center">
              <div className="col-span-2 flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.matchesPlayed}
                </p>
                <p className="text-xs uppercase">matchs joués</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.goals}
                </p>
                <p className="text-xs uppercase">goals</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.assists}
                </p>
                <p className="text-xs uppercase">assists</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.yellowCards}
                </p>
                <p className="text-xs uppercase">carton jaune</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.redCards}
                </p>
                <p className="text-xs uppercase">carton rouge</p>
              </div>
            </div>
          )}
          <div className="w-full flex items-center justify-center gap-2 uppercase">
            {active && (
              <p className="font-bold italic font-marjorie text-xl">{number}</p>
            )}
            <p>
              {active && "/"} {lastname}{" "}
              <span className="font-bold"> {firstname} </span>
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex items-center  w-full",
          active ? "justify-between" : "justify-end",
        )}
      >
        {active && (poste === "Joueur" || poste === "Gardien") && (
          <p className="font-bold font-marjorie italic text-3xl">{number}</p>
        )}

        {active && poste !== "Joueur" && poste !== "Gardien" && (
          <p className="font-bold font-marjorie italic text-xl">{poste}</p>
        )}

        {stats &&
          stats.matchesPlayed > 0 &&
          (poste === "Gardien" || poste === "Joueur") && (
            <Badge
              className="hover:bg-spanish-accent-2-light/20 bg-spanish-accent-2-light/10  text-spanish-accent-2 hover:cursor-pointer transition-all"
              onClick={() => setIsStatsOpen(!isStatsOpen)}
            >
              STATS
            </Badge>
          )}
      </div>
      <BoxModule className="absolute bottom-3 w-11/12 md:p-2 p-1 -mb-1 md:mb-0 flex items-center justify-center rounded-lg z-10">
        <p className="uppercase">
          {breakpoint === "xs" ? shortenName(lastname) : lastname}{" "}
          <span className="font-bold">{firstname}</span>
        </p>
      </BoxModule>
      <div className="-mb-4">
        <Image
          src={photo}
          alt={`${firstname} ${lastname}`}
          height={0}
          width={0}
          // Largeur reelle de l'emplacement (photo de joueur dans une grille de 2 a 5 colonnes), et non celle de la fenetre.
          sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          className={cn("h-80 w-auto object-cover", active ? "" : "grayscale")}
        />
      </div>
    </BoxModule>
  );
}
