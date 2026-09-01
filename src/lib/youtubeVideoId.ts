/**
 * L'identifiant contenu dans une adresse YouTube, ou null si l'adresse pointe
 * ailleurs.
 *
 * Isole dans son propre module parce qu'il sert des deux cotes : la route s'en
 * sert pour le champ Lien Live, les cartes de match pour savoir si un replay
 * peut s'ouvrir dans le lecteur du site plutot que chez YouTube. Le reste de
 * `getYoutubeLive` ne doit pas partir dans le paquet du navigateur pour si peu.
 */
export function extractVideoId(url: string): string | null {
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    const host = hostname.replace(/^www\./, "");

    if (host === "youtu.be") return pathname.slice(1) || null;
    if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com"))
      return null;

    if (pathname === "/watch") return searchParams.get("v");

    // /live/ID et /embed/ID
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 2 && ["live", "embed"].includes(segments[0])) {
      return segments[1];
    }

    return null;
  } catch {
    return null;
  }
}
