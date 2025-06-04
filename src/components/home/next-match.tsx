"use client";

import Link from "next/link";
import React from "react";

import useBreakpoint from "@/hooks/useBreakpoints";
import { cn } from "@/lib/utils";
import { getTeamLogo } from "@/lib/getTeamLogo";
import BoxModule from "../layout/boxModule";
import { Button } from "../ui/button";
import Team from "../team";

export default function NextMatch() {
  const { isMobile } = useBreakpoint();
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
          <p className="lg:text-sm text-xs">05D 08H 21M</p>
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
          logo={getTeamLogo("Spanish Futsal")}
          teamName="SPANISH FUTSAL"
          isNextMatch
          {...(isMobile && { logoFirst: true })}
        />
        <p className="font-marjorie text-2xl italic font-bold">vs</p>
        <Team
          logo={getTeamLogo("Réal Madrid")}
          teamName="Réal Madrid"
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
