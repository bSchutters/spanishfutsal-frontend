"use client";

import React, { useState } from "react";
import BoxModule from "./layout/boxModule";
import { Badge } from "./ui/badge";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  mvp: number;
  cleanSheets: number;
  saves: number;
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

  return (
    <BoxModule
      className={cn(
        "relative lg:w-72 flex flex-col items-center justify-center overflow-hidden",
        className
      )}
    >
      {stats && (
        <div
          className={cn(
            "absolute top-0 left-0 w-full h-full bg-spanish-bg-dark rounded-lg z-20 p-4 transition-all duration-700 flex flex-col  justify-between",
            isStatsOpen
              ? "opacity-100 pointer-events-auto -translate-y-0"
              : "opacity-0 pointer-events-none -translate-y-10"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <p className="">STATS</p>
            <X
              className="hover:cursor-pointer hover:text-spanish-accent transition-all"
              onClick={() => setIsStatsOpen(!isStatsOpen)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center justify-center">
            <div className="flex flex-col items-center justify-center ">
              <p className="text-2xl font-marjorie font-bold italic">
                {stats?.matchesPlayed}
              </p>
              <p className="text-xs uppercase">matchs joués</p>
            </div>
            <div className="flex flex-col items-center justify-center ">
              <p className="text-2xl font-marjorie font-bold italic">
                {stats?.mvp}
              </p>
              <p className="text-xs uppercase">homme du match</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-2xl font-marjorie font-bold italic">
                {poste === "Gardien" ? stats?.saves : stats?.goals}
              </p>
              <p className="text-xs uppercase">
                {poste === "Gardien" ? "saves" : "goals"}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-2xl font-marjorie font-bold italic">
                {poste === "Gardien" ? stats?.cleanSheets : stats?.assists}
              </p>
              <p className="text-xs uppercase">
                {poste === "Gardien" ? "clean sheets" : "assists"}
              </p>
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
          active ? "justify-between" : "justify-end"
        )}
      >
        {active && (poste === "Joueur" || poste === "Gardien") && (
          <p className="font-bold font-marjorie italic text-3xl">{number}</p>
        )}

        {active && poste !== "Joueur" && poste !== "Gardien" && (
          <p className="font-bold font-marjorie italic text-xl lowercase">
            {poste}
          </p>
        )}

        {stats && (poste === "Gardien" || poste === "Joueur") && (
          <Badge
            className="hover:bg-spanish-bg-lighter hover:cursor-pointer transition-all"
            onClick={() => setIsStatsOpen(!isStatsOpen)}
          >
            STATS
          </Badge>
        )}
      </div>
      <BoxModule className="absolute bottom-3 w-11/12 p-2 flex items-center justify-center rounded-lg z-10">
        <p className="uppercase">
          {lastname} <span className="font-bold">{firstname}</span>
        </p>
      </BoxModule>
      <div className="-mb-4">
        <Image
          src={photo}
          alt={`${firstname} ${lastname}`}
          height={0}
          width={0}
          sizes="100vw"
          className={cn("h-80 w-auto object-cover", active ? "" : "grayscale")}
          priority
        />
      </div>
    </BoxModule>
  );
}
