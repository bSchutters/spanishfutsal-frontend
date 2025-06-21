"use client";

import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import BoxModule from "../layout/boxModule";

export const description = "A linear area chart";

const chartData = [
  { Journées: 1, position: 8 },
  { Journées: 2, position: 13 },
  { Journées: 3, position: 12 },
  { Journées: 4, position: 12 },
  { Journées: 5, position: 11 },
  { Journées: 6, position: 11 },
  { Journées: 7, position: 10 },
  { Journées: 8, position: 10 },
  { Journées: 9, position: 9 },
  { Journées: 10, position: 9 },
  { Journées: 11, position: 8 },
];

const chartConfig = {
  position: {
    label: "Position",
    color: "var(--chart-1)",
    icon: TrendingUp,
  },
} satisfies ChartConfig;

export default function Graphiques() {
  return (
    <BoxModule className="flex flex-col ">
      <ChartContainer config={chartConfig} className="max-h-96">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            top: 20,
            bottom: 12,
            right: 40,
          }}
        >
          <CartesianGrid vertical={true} strokeDasharray={3} />
          <XAxis
            dataKey="Journées"
            tickLine={false}
            tickMargin={5}
            axisLine={true}
            domain={[1, 24]}
            ticks={[
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
              20, 21, 22, 23, 24,
            ]}
            type="number"
            stroke="var(--color-spanish-accent)"
            strokeOpacity={1}
            interval={0}
          >
            <Label
              value="Journées"
              offset={-10}
              position="insideBottom"
              fill="var(--color-spanish-bg-lighter)"
            />
          </XAxis>
          <YAxis
            type="number"
            tickLine={false}
            axisLine={true}
            domain={[1, 13]}
            ticks={[13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]}
            reversed
            stroke="var(--color-spanish-accent)"
            interval={0}
          >
            <Label
              value="Poisition"
              offset={-10}
              position="center"
              angle={-90}
              fill="var(--color-spanish-bg-lighter)"
            />
          </YAxis>

          <ChartTooltip
            cursor={true}
            content={<ChartTooltipContent hideLabel />}
          />

          <Line
            dataKey="position"
            type="linear"
            fillOpacity={0.4}
            strokeWidth={2}
            stroke="var(--color-position)"
            fill=""
          >
            <LabelList
              dataKey="position"
              offset={10}
              position="top"
              fill="var(--color-spanish-accent)"
            />
          </Line>
        </LineChart>
      </ChartContainer>
    </BoxModule>
  );
}
