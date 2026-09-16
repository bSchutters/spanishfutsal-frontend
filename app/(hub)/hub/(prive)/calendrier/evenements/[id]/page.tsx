import { redirect } from "next/navigation";

/**
 * L adresse d un evenement, celle que portent les flux et les notifications :
 * elle ouvre le calendrier sur son panneau de detail.
 */
export default async function PageEvenement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = Number(id);
  redirect(Number.isInteger(numero) && numero > 0 ? `/hub/calendrier?evenement=${numero}` : "/hub/calendrier");
}
