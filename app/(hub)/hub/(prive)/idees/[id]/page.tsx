import { redirect } from "next/navigation";

/** L adresse d une idee : elle ouvre le tableau sur son ticket. */
export default async function PageIdee({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = Number(id);
  redirect(Number.isInteger(numero) && numero > 0 ? `/hub/idees?idee=${numero}` : "/hub/idees");
}
