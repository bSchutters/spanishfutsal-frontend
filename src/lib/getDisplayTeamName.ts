/**
 * Maps the LFFS registration names used by the club to its public name.
 * Names for every other team remain untouched.
 */
export function getDisplayTeamName(name: string) {
  return name === "SPORTING ROJA BRUXELLES" ||
    name === "UNION DEPORTIVA ASTURIANA BRUXELLES"
    ? "UD Asturiana"
    : name;
}
