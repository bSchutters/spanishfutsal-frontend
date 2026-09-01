"use client";

import { useEffect, useMemo, useState } from "react";

import useBreakpoint from "@/hooks/useBreakpoints";
import { useLiveStore } from "@/store/useLiveStore";
import { cn } from "@/lib/utils";
import BoxModule from "../layout/boxModule";
import Team from "../team";

import type { Match } from "@/lib/getMatchs";
import Link from "next/link";

/**
 * Le decompte, a la precision de l'echeance. A trois jours du coup d'envoi la
 * seconde ne renseigne personne, et comme les chiffres n'ont pas tous la meme
 * largeur, elle faisait sauter la ligne a chaque battement. Elle n'apparait
 * plus que dans la derniere heure, ou elle veut dire quelque chose.
 */
function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const seconds = totalSeconds % 60;

  const deux = (n: number) => String(n).padStart(2, "0");

  if (days > 0) return `${deux(days)}J ${deux(hours)}H ${deux(minutes)}M`;
  if (hours > 0) return `${deux(hours)}H ${deux(minutes)}M`;

  return `${deux(minutes)}M ${deux(seconds)}S`;
}

export default function NextMatch({ matchs }: { matchs: Match[] }) {
  const { breakpoint, isMobile } = useBreakpoint();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const live = useLiveStore((s) => s.live);
  const openLive = useLiveStore((s) => s.open);

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

  if (!nextMatch || status === "after") return null;

  const {
    homeTeam,
    homeTeamLogo,
    homeIsClub,
    awayTeam,
    awayTeamLogo,
    awayIsClub,
    liveLink,
  } = nextMatch;

  // La chaine ouvre souvent une demi-heure avant le coup d'envoi. La route fait
  // foi : si elle voit une diffusion, la carte l'annonce, meme si l'horloge dit
  // que la rencontre n'a pas commence.
  const enDirect =
    live?.match?.id === nextMatch.id ||
    (status === "live" && Boolean(liveLink));

  // Deux conditions, et pas une de moins : la route voit une diffusion pour
  // cette rencontre precise, et cette diffusion est sur YouTube donc lisible
  // sur le site. Sinon la carte reste un lien vers le calendrier.
  const ouvreLeLecteur =
    live?.match?.id === nextMatch.id && Boolean(live.videoId);

  const contenu = (
    <>
      {status !== "live" && !enDirect && (
        <div className="absolute sm:-top-6 -top-4 sm:p-2 p-1 w-36 flex  items-center justify-center bg-spanish-accent text-spanish-bg italic rounded-md text-sm font-bold tabular-nums">
          {timeLeft || "Prochain match"}
        </div>
      )}
      {enDirect && (
        <div className="absolute sm:-top-6 -top-4 sm:p-2 p-1 w-36 flex items-center justify-center gap-2 bg-red-600 text-white italic rounded-md text-sm font-bold uppercase">
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute size-2 rounded-full bg-white" />
            <span className="absolute size-2 animate-ping rounded-full bg-white" />
          </span>
          en direct
        </div>
      )}
      {status === "live" && !enDirect && (
        <div className="absolute sm:-top-6 -top-4 sm:p-2 p-1 w-40 flex items-center justify-center bg-spanish-accent text-spanish-bg italic rounded-md text-sm font-bold">
          MATCH EN COURS
        </div>
      )}

      {/* <div
        className={cn(
          " flex justify-between items-center",
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

      
        <Link href="/matchs" className="flex md:hidden">
          <Button size="sm" className="text-xs">
            calendrier
          </Button>
        </Link>
      </div> */}

      <div
        className={cn(
          "flex items-center gap-6",
          isMobile ? "w-full justify-between" : "",
        )}
      >
        <Team
          logo={homeTeamLogo}
          teamName={homeTeam}
          isClub={homeIsClub}
          isNextMatch
          {...(isMobile && { logoFirst: true })}
        />
        <p className="font-marjorie text-xl sm:text-2xl italic font-bold">vs</p>
        <Team
          logo={awayTeamLogo}
          teamName={awayTeam}
          isClub={awayIsClub}
          isNextMatch
          {...((!isMobile || breakpoint === "xs") && { logoFirst: true })}
        />
      </div>

      {/* <div className="md:flex hidden">
        {status === "live" && liveLink && (
          <Link href={liveLink} target="_blank">
            <Button className="font-nugros uppercase relative flex gap-4">
              regarder le live
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2  bg-red-500 rounded-full absolute" />
                <div className="w-2 h-2 animate-ping bg-red-500 rounded-full absolute" />
              </div>
            </Button>
          </Link>
        )}
      </div> */}
    </>
  );

  return (
    <BoxModule
      className={cn(
        "relative lg:-mt-24 -mt-16 z-20 p-6  2xl:w-1/3 xl:w-2/5 lg:w-3/5 sm:w-2/3 w-5/6 flex flex-col md:flex-row gap-4 items-center justify-center hover:bg-spanish-bg-dark-minus cursor-pointer transition-colors duration-300",
        enDirect
          ? "border-red-600"
          : status === "live"
            ? "border-spanish-accent"
            : "",
      )}
    >
      {ouvreLeLecteur ? (
        <button
          type="button"
          onClick={openLive}
          aria-label={`Regarder ${homeTeam} contre ${awayTeam} en direct`}
          className="w-full flex items-center justify-center cursor-pointer"
        >
          {contenu}
        </button>
      ) : (
        <Link
          href="/matchs"
          className="w-full flex items-center justify-center"
        >
          {contenu}
        </Link>
      )}
    </BoxModule>
  );
}
