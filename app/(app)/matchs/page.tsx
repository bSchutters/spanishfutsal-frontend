import MatchsClient from "@/components/matchs/matchs-client";
import { getMatchs } from "@/lib/getMatchs";
import { matchsMetadata } from "./metadata";

// Export natif de Next, desormais possible : `MetadataHead` etait un
// contournement rendu necessaire par une page cliente.
export const metadata = matchsMetadata;

/**
 * Composant serveur : le calendrier part avec le HTML. La partie interactive,
 * selecteur de saison et defilement vers le prochain match compris, reste
 * cliente et prend ces donnees en point de depart.
 */
export default async function Matchs() {
  const matchs = await getMatchs();

  return <MatchsClient initialMatchs={matchs} />;
}
