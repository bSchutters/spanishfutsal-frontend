"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import useBreakpoint from "@/hooks/useBreakpoints";
import { getTeamLogo } from "@/lib/getTeamLogo";
import { cn } from "@/lib/utils";
import BoxModule from "../layout/boxModule";
import Team from "../team";
import { Button } from "../ui/button";

import { useMatchsStore } from "@/store/useMatchsStore";

function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(
    2,
    "0"
  );
  const minutes = String(Math.floor((totalSeconds / 60) % 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${days > 0 ? String(days).padStart(2, "0") + "J " : ""}${hours}h ${minutes}M ${seconds}S`;
}

export default function NextMatch() {
  const { isMobile } = useBreakpoint();
  const { matchs, isLoading, fetchMatchs } = useMatchsStore();
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    fetchMatchs();
  }, [fetchMatchs]);

  const nextMatch = useMemo(() => {
    return matchs
      .filter((match) => match.date && match.time)
      .map((match) => ({
        ...match,
        fullDate: new Date(`${match.date}T${match.time.padEnd(5, ":00")}`),
      }))
      .filter((match) => !isNaN(match.fullDate.getTime()))
      .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
      .find((match) => {
        const matchTime = match.fullDate;
        const oneHourAfter = new Date(matchTime.getTime() + 70 * 60 * 1000);
        return new Date() < oneHourAfter;
      });
  }, [matchs]);

  const matchDate = useMemo(() => {
    return nextMatch ? nextMatch.fullDate : null;
  }, [nextMatch]);

  const [status, setStatus] = useState<"before" | "live" | "after">("before");

  useEffect(() => {
    if (!matchDate) return;

    const updateStatus = () => {
      const now = new Date();
      const oneHourAfter = new Date(matchDate.getTime() + 70 * 60 * 1000);

      if (now < matchDate) {
        setStatus("before");
        setTimeLeft(formatCountdown(matchDate.getTime() - now.getTime()));
      } else if (now >= matchDate && now < oneHourAfter) {
        setStatus("live");
        setTimeLeft(""); // pas de countdown pendant le live
      } else {
        setStatus("after");
        setTimeLeft("");
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [matchDate]);

  if (isLoading || !nextMatch || status === "after") return null;

  const { homeTeam, awayTeam, liveLink } = nextMatch;

  return (
    <BoxModule
      className={cn(
        "lg:-mt-24 -mt-16 z-20 lg:px-8 lg:py-6 xl:w-3/5 lg:w-4/5 w-11/12 flex flex-col md:flex-row gap-4 items-center justify-between",
        status === "live" && liveLink
          ? "border-spanish-accent-2"
          : status === "live"
            ? "border-spanish-accent"
            : ""
      )}
    >
      <div
        className={cn(
          "flex justify-between items-center",
          isMobile ? "w-full" : ""
        )}
      >
        <div className="flex flex-col gap-0 justify-between w-full">
          <div
            className={cn(
              "font-marjorie italic font-semibold xl:text-base text-sm",
              status === "live" && liveLink ? "text-red-500" : ""
            )}
          >
            {status === "live"
              ? liveLink
                ? "en direct"
                : "match en cours"
              : "prochain match"}
          </div>
          <p className="lg:text-sm text-xs">{status !== "live" && timeLeft}</p>
        </div>

        {/* bouton calendrier toujours présent sur mobile */}
        <Link href="/matchs" className="flex md:hidden">
          <Button size="sm" className="text-xs">
            calendrier
          </Button>
        </Link>
      </div>

      <div
        className={cn(
          "flex items-center gap-4",
          isMobile ? "w-full justify-between" : ""
        )}
      >
        <Team
          logo={getTeamLogo(homeTeam)}
          teamName={homeTeam}
          isNextMatch
          {...(isMobile && { logoFirst: true })}
        />
        <p className="font-marjorie text-2xl italic font-bold">vs</p>
        <Team
          logo={getTeamLogo(awayTeam)}
          teamName={awayTeam}
          isNextMatch
          {...(!isMobile && { logoFirst: true })}
        />
      </div>

      <div className="md:flex hidden">
        {status === "live" && liveLink ? (
          <Link href={liveLink} target="_blank">
            <Button className="font-nugros uppercase relative flex gap-4">
              regarder le live
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2  bg-red-500 rounded-full absolute" />
                <div className="w-2 h-2 animate-ping bg-red-500 rounded-full absolute" />
              </div>
            </Button>
          </Link>
        ) : (
          <Link href="/matchs">
            <Button>calendrier</Button>
          </Link>
        )}
      </div>
    </BoxModule>
  );
}
