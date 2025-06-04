const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export async function getPlayers() {
  const res = await fetch(`${API_URL}/api/joueurs?populate=*`);

  if (!res.ok) {
    throw new Error("Erreur lors du chargement des joueurs");
  }

  const data = await res.json();
  return data.data;
}
