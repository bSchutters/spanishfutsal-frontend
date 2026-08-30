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
  /** Ressource a precharger a l'ouverture de la liste : "rankings" ou "matches". */
  prefetch?: "rankings" | "matches";
};

export default function SeasonSelector({
  onSeasonChange,
  prefetch,
}: SeasonSelectorProps) {
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

  // A l'ouverture de la liste, on va chercher les saisons archivees en fond.
  // Le temps que l'utilisateur lise les options et clique, la reponse est deja
  // dans le cache du navigateur : le changement devient immediat.
  const handleOpenChange = (open: boolean) => {
    if (!open || !prefetch) return;

    for (const season of seasons) {
      if (season.active) continue;
      fetch(`/api/public/${prefetch}/${season.id}`).catch(() => {});
    }
  };

  const handleChange = (value: string) => {
    const id = Number(value);
    const isActive = seasons.find((s) => s.id === id)?.active;
    const seasonId = isActive ? null : id;
    setSelectedSeason(seasonId);
    onSeasonChange(seasonId);
  };

  return (
    <Select
      value={currentValue}
      onValueChange={handleChange}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger size="sm" aria-label="Saison">
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
