"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * La courbe des presents, minute par minute.
 *
 * Elle raconte la soiree mieux que n'importe quel chiffre : quand la salle se
 * remplit, si elle tient pendant la rencontre, et a quel moment tout le monde
 * part. La minute zero est celle du premier spectateur, pas celle du coup
 * d'envoi : c'est la diffusion qu'on mesure, pas le match.
 */

const CONFIG = {
  presents: { label: "Spectateurs", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function CourbeAudience({
  courbe,
  debut,
}: {
  courbe: number[];
  /** Heure du premier spectateur, pour dater l'axe. */
  debut: string | null;
}) {
  const depart = debut ? new Date(debut).getTime() : null;

  const heureDe = (minute: number) => {
    if (depart === null) return `${minute} min`;

    return new Date(depart + minute * 60_000).toLocaleTimeString("fr-BE", {
      timeZone: "Europe/Brussels",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const points = courbe.map((presents, minute) => ({
    minute,
    heure: heureDe(minute),
    presents,
  }));

  // Une graduation toutes les dix minutes environ : au-dela, les heures se
  // chevauchent sur un telephone.
  const pas = Math.max(1, Math.ceil(points.length / 7));

  return (
    <ChartContainer config={CONFIG} className="h-56 w-full">
      <AreaChart data={points} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="heure"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          interval={pas - 1}
        />
        <YAxis
          allowDecimals={false}
          width={28}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelKey="heure" indicator="line" />}
        />
        <Area
          dataKey="presents"
          type="monotone"
          fill="var(--color-presents)"
          fillOpacity={0.25}
          stroke="var(--color-presents)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
