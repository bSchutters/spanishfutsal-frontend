"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import useBreakpoint from "@/hooks/useBreakpoints";
import { getTeamLogo } from "@/lib/getTeamLogo";
import { cn } from "@/lib/utils";
import { useMatchsStore } from "@/store/useMatchsStore";
import BoxModule from "../layout/boxModule";
import Team from "../team";
import { Button } from "../ui/button";

function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor((totalSeconds / 3600) % 24)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds / 60) % 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}H ${minutes}M ${seconds}S`;
}

export default function NextMatch() {
  const { isMobile } = useBreakpoint();
  const { matchs, isLoading, fetchMatchs } = useMatchsStore();
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    fetchMatchs();
  }, [fetchMatchs]);

  // Toujours calculé, même si matchs est vide
  const nextMatch = useMemo(() => {
    const now = new Date();
    return matchs
      .filter((m) => new Date(m.date) > now)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0];
  }, [matchs]);

  const matchDate = useMemo(() => {
    return nextMatch ? new Date(nextMatch.date) : null;
  }, [nextMatch]);

  useEffect(() => {
    if (!matchDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = matchDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("00h 00M 00S");
      } else {
        setTimeLeft(formatCountdown(diff));
      }
    };

    updateCountdown(); // appelle immédiatement
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [matchDate]);

  if (isLoading || !nextMatch) return null;

  const { homeTeam, awayTeam } = nextMatch;

  return (
    <BoxModule className="lg:-mt-24 -mt-16 z-20 lg:px-8 lg:py-6 xl:w-3/5 lg:w-4/5 w-11/12 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div
        className={cn(
          "flex justify-between items-center",
          isMobile ? "w-full" : ""
        )}
      >
        <div className="flex flex-col gap-0 justify-between w-full">
          <p className="font-marjorie italic font-semibold xl:text-base text-sm">
            prochain match
          </p>
          <p className="lg:text-sm text-xs">{timeLeft}</p>
        </div>
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
      <Link href="/matchs" className="md:flex hidden">
        <Button>calendrier</Button>
      </Link>
    </BoxModule>
  );
}
