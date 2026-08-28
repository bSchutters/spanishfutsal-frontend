export const DEFAULT_TEAM_LOGO = "/assets/images/svg/teams/default.svg";

export type TeamDisplay = {
  /** Public name to display instead of the raw LFFS registration name. */
  name: string;
  logo: string;
  isClub: boolean;
};

/** Index of LFFS registration names, folded through `normalizeTeamKey`. */
export type TeamsIndex = Record<string, TeamDisplay>;

/**
 * Accents, casing and spacing differ between the LFFS endpoints, so both sides
 * of a lookup are folded before matching.
 */
export function normalizeTeamKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Falls back to the raw LFFS name when the team has no entry yet. */
export function resolveTeam(index: TeamsIndex, rawName: string): TeamDisplay {
  return (
    index[normalizeTeamKey(rawName)] ?? {
      name: rawName,
      logo: DEFAULT_TEAM_LOGO,
      isClub: false,
    }
  );
}
