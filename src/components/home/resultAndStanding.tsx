import React from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import BoxModule from "../layout/boxModule";
import { Badge } from "../ui/badge";
import Team from "../team";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { getTeamLogo } from "@/lib/getTeamLogo";

export default function ResultAndStanding() {
  const standing = [
    { pos: 1, name: "Atletico Madrid", points: 45 },
    { pos: 2, name: "FC Barcelona", points: 40 },
    { pos: 3, name: "Makasi Bruxelles", points: 34 },
    { pos: 4, name: "Spanish Futsal", points: 30 },
    { pos: 5, name: "Duckster BRUXELLES", points: 30 },
    { pos: 6, name: "Oviedo FC", points: 18 },
    { pos: 7, name: "Real Betis", points: 15 },
    { pos: 8, name: "Athletic Bilbao", points: 12 },
    { pos: 9, name: "Celta Vigo", points: 10 },
    { pos: 10, name: "Real Sociedad", points: 8 },
    { pos: 11, name: "Granada CF", points: 5 },
    { pos: 12, name: "Getafe CF", points: 3 },
    { pos: 13, name: "Mallorca", points: 1 },
  ];

  const teamName = "Spanish Futsal";
  const index = standing.findIndex((team) => team.name === teamName);
  const previousTeam = standing[index - 1];
  const currentTeam = standing[index];
  const nextTeam = standing[index + 1];
  const standingCompact = [previousTeam, currentTeam, nextTeam].filter(Boolean);
  return (
    <section className="mt-16 flex flex-col lg:flex-row w-11/12 lg:gap-6 gap-12 container">
      {/* Last result */}
      <div className=" lg:w-1/2 w-full flex flex-col lg:gap-6 gap-4">
        <div className="flex justify-between items-center w-full">
          <p className="font-marjorie italic font-bold">derniers résultats</p>
          <Button>
            <Link href="/matchs">calendrier</Link>
          </Button>
        </div>
        <BoxModule className="flex flex-col gap-6">
          <div className="flex justify-between w-full">
            <p>30 avril 2025 • 22h00</p>
            <Badge>LFFS P5E</Badge>
          </div>
          <div className="flex justify-between items-center w-full">
            <Team
              logo={getTeamLogo("Spanish Futsal")}
              teamName="SPANISH FUTSAL"
              logoFirst
              className="w-1/3"
            />
            <div className="flex gap-2 items-center justify-center font-bold text-4xl font-marjorie italic w-1/3">
              <p>1</p>
              <p>-</p>
              <p>0</p>
            </div>
            <Team
              logo={getTeamLogo("Réal Madrid")}
              teamName="réal madrid"
              className="w-1/3"
            />
          </div>
          <div className="flex gap-2 items-center justify-center font-bold text-sm  w-full">
            <MapPin />
            <p className="text-sm font-semibold">Collège Saint-Pierre</p>
          </div>
        </BoxModule>
      </div>

      {/* Standing  */}
      <div className=" lg:w-1/2 w-full flex flex-col lg:gap-6 gap-4">
        <div className="flex justify-between items-center w-full">
          <p className="font-marjorie italic font-bold">classement</p>
          <Button>
            <Link href="/classement">classement complet</Link>
          </Button>
        </div>
        <BoxModule className="flex flex-col h-full">
          <div className="flex justify-between items-center w-full font-bold uppercase text-spanish-bg-lighter">
            <div className="flex gap-4 p-2">
              <p>#</p>
              <p>équipes</p>
            </div>
            <p>PTS</p>
          </div>
          <div className="w-full flex flex-col">
            {standingCompact.map((team) => (
              <div
                key={team.pos}
                className={cn(
                  "flex justify-between items-center  text-lg uppercase border-b-2 p-2 border-white last:border-none",
                  team.name === "Spanish Futsal" ? "bg-spanish-bg-light" : ""
                )}
              >
                <div className="flex gap-4 ">
                  <p
                    className={cn(
                      "italic font-marjorie font-bold xl:text-base text-sm",
                      team.name === "Spanish Futsal"
                        ? "text-spanish-accent"
                        : ""
                    )}
                  >
                    {team.pos}
                  </p>
                  <p
                    className={cn(
                      "xl:text-base text-sm",
                      team.name === "Spanish Futsal"
                        ? "font-bold text-spanish-accent"
                        : ""
                    )}
                  >
                    {team.name}
                  </p>
                </div>
                <p
                  className={cn(
                    "italic font-marjorie xl:text-base text-sm",
                    team.name === "Spanish Futsal"
                      ? "text-spanish-accent font-bold"
                      : ""
                  )}
                >
                  {team.points}
                </p>
              </div>
            ))}
          </div>
        </BoxModule>
      </div>
    </section>
  );
}
