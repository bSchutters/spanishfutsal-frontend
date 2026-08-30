import ClassementClient from "@/components/classement/classement-client";
import { getRankings } from "@/lib/getRankings";
import { classementMetadata } from "./metadata";

// Export natif de Next, desormais possible : `MetadataHead` etait un
// contournement rendu necessaire par une page cliente.
export const metadata = classementMetadata;

/**
 * Composant serveur : le classement part avec le HTML. La partie interactive,
 * selecteur de saison compris, reste cliente et prend ces donnees en point de
 * depart plutot que de les redemander apres l'hydratation.
 */
export default async function Classement() {
  const rankings = await getRankings();

  return <ClassementClient initialRankings={rankings} />;
}
