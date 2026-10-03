import { redirect } from "next/navigation";

/** L'entree du module Pack : ses commandes, filtre compris. */
export default async function PagePack({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  redirect(statut ? `/hub/pack/commandes?statut=${encodeURIComponent(statut)}` : "/hub/pack/commandes");
}
