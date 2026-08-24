type SeasonWithSerieName = {
  serie_name?: string | null;
};

export function getCompetitionName(
  serieReference: string | null | undefined,
  season: unknown
) {
  if (!serieReference) return "";

  if (serieReference === "COUPE" || serieReference === "AMICAL" || serieReference === "TOURNOIS") {
    return serieReference;
  }

  const serieName =
    typeof season === "object" && season !== null && "serie_name" in season
      ? (season as SeasonWithSerieName).serie_name
      : undefined;

  return serieName || serieReference;
}
