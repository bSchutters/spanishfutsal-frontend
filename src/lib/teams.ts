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

/**
 * Libelles temporaires utilises par la LFFS pour un adversaire de coupe encore
 * inconnu : "Vainqueur BTCPPRM013". Ils sont remplaces par le vrai nom une fois le
 * tour joue, donc leur creer une fiche laisserait une equipe fantome derriere elle.
 *
 * La detection porte sur le mot d ouverture, pas sur la reference de match : les
 * vrais noms contiennent eux aussi des chiffres ("ASM ETTERBEEK 1").
 */
const PLACEHOLDER_PREFIXES = [
  "VAINQUEUR",
  "GAGNANT",
  "PERDANT",
  "WINNAAR",
  "VERLIEZER",
  "A DETERMINER",
];

export function isPlaceholderTeamName(name: string): boolean {
  const key = normalizeTeamKey(name);
  return PLACEHOLDER_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(`${prefix} `),
  );
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
