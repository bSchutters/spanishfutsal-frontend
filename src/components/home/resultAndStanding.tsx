import useBreakpoint from "@/hooks/useBreakpoints";
import { getTeamLogo } from "@/lib/getTeamLogo";
import { getTeamName } from "@/lib/getTeamName";
import { cn } from "@/lib/utils";
import { useMatchsStore } from "@/store/useMatchsStore";
import { useRankingStore } from "@/store/useRankingStore";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import BoxModule from "../layout/boxModule";
import Team from "../team";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export default function ResultAndStanding() {
  const {
    rankings,
    isLoading: isRankingLoading,
    fetchRankings,
  } = useRankingStore();
  const { matchs, isLoading: isMatchsLoading, fetchMatchs } = useMatchsStore();

  const { breakpoint } = useBreakpoint();

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  useEffect(() => {
    fetchMatchs();
  }, [fetchMatchs]);

  const lastFinishedMatch = useMemo(() => {
    const now = new Date();

    return matchs
      .filter((match) => {
        if (!match.date || !match.time) return false;
        const matchDate = new Date(
          `${match.date}T${match.time.padEnd(5, ":00")}`
        );
        const oneHourAfter = new Date(matchDate.getTime() + 70 * 60 * 1000);
        const scoreAvailable =
          match.homeScore !== null && match.awayScore !== null;
        return oneHourAfter < now && scoreAvailable;
      })
      .map((match) => ({
        ...match,
        matchDate: new Date(`${match.date}T${match.time.padEnd(5, ":00")}`),
      }))
      .sort((a, b) => b.matchDate.getTime() - a.matchDate.getTime())[0];
  }, [matchs]);

  const ourTeamName = "Furia Roja Futsal";
  const index = rankings.findIndex((team) => team.teamName === ourTeamName);
  const previousTeam = rankings[index - 1];
  const currentTeam = rankings[index];
  const nextTeam = rankings[index + 1];
  const standingCompact = [previousTeam, currentTeam, nextTeam].filter(Boolean);

  if (isMatchsLoading || isRankingLoading || !lastFinishedMatch) return null;
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
            <p>
              {lastFinishedMatch.matchDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}{" "}
              • {lastFinishedMatch.time}
            </p>
            <Badge className="uppercase">
              {lastFinishedMatch.serieReference !== "AMICAL"
                ? `LFFS ${lastFinishedMatch.serieReference}`
                : lastFinishedMatch.serieReference}
            </Badge>
          </div>
          <div className="flex justify-between items-center w-full">
            <Team
              logo={getTeamLogo(lastFinishedMatch.homeTeam)}
              teamName={getTeamName(lastFinishedMatch.homeTeam)}
              logoFirst
              className="w-1/3"
            />
            <div className="flex gap-2 items-center justify-center font-bold md:text-4xl text-2xl font-marjorie italic w-1/3">
              <p>{lastFinishedMatch.homeScore}</p>
              <p>-</p>
              <p>{lastFinishedMatch.awayScore}</p>
            </div>
            <Team
              logo={getTeamLogo(lastFinishedMatch.awayTeam)}
              teamName={getTeamName(lastFinishedMatch.awayTeam)}
              {...(breakpoint === "xs" && { logoFirst: true })}
              className="w-1/3"
            />
          </div>
          <div className="flex gap-2 items-center justify-center font-bold text-sm  w-full">
            <MapPin />
            <p className="text-sm font-semibold">
              {lastFinishedMatch.venueName}
            </p>
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
                key={team.position}
                className={cn(
                  "flex justify-between items-center  text-lg uppercase border-b-2 p-2 border-white last:border-none",
                  team.teamName === "Furia Roja Futsal"
                    ? "bg-spanish-bg-light"
                    : ""
                )}
              >
                <div className="flex gap-4 ">
                  <p
                    className={cn(
                      "italic font-marjorie font-bold xl:text-base text-sm",
                      team.teamName === "Furia Roja Futsal"
                        ? "text-spanish-accent"
                        : ""
                    )}
                  >
                    {team.position}
                  </p>
                  <p
                    className={cn(
                      "xl:text-base text-sm",
                      team.teamName === "Furia Roja Futsal"
                        ? "font-bold text-spanish-accent"
                        : ""
                    )}
                  >
                    {getTeamName(team.teamName)}
                  </p>
                </div>
                <p
                  className={cn(
                    "italic font-marjorie xl:text-base text-sm",
                    team.teamName === "Furia Roja Futsal"
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
