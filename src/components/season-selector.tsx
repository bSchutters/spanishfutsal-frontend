"use client";

import { useEffect } from "react";
import { useSeasonStore } from "@/store/useSeasonStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SeasonSelectorProps = {
  onSeasonChange: (seasonId: number | null) => void;
};

export default function SeasonSelector({ onSeasonChange }: SeasonSelectorProps) {
  const { seasons, fetchSeasons, selectedSeasonId, setSelectedSeason } =
    useSeasonStore();

  useEffect(() => {
    if (seasons.length === 0) {
      fetchSeasons();
    }
  }, [seasons.length, fetchSeasons]);

  if (seasons.length <= 1) return null;

  const activeSeason = seasons.find((s) => s.active);
  const currentValue = selectedSeasonId
    ? String(selectedSeasonId)
    : activeSeason
      ? String(activeSeason.id)
      : undefined;

  const handleChange = (value: string) => {
    const id = Number(value);
    const isActive = seasons.find((s) => s.id === id)?.active;
    const seasonId = isActive ? null : id;
    setSelectedSeason(seasonId);
    onSeasonChange(seasonId);
  };

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger size="sm">
        <SelectValue placeholder="Saison" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((season) => (
          <SelectItem key={season.id} value={String(season.id)}>
            {season.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
