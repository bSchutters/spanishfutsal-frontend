const CHANNEL_HANDLE = "@UDAsturiana";
const API = "https://www.googleapis.com/youtube/v3";

// Un mois : un handle ne change pas, et l'identifiant qu'il designe encore
// moins. Cette resolution evite d'avoir a relever l'identifiant a la main.
const CHANNEL_ID_TTL = 30 * 24 * 60 * 60;

// Trois minutes : c'est le delai maximum entre le debut de la diffusion et
// l'apparition du bouton. Toutes les visites d'un meme intervalle partagent un
// seul appel, la consommation de quota ne depend donc pas de l'affluence.
const LIVE_TTL = 180;

export type LiveBroadcast = {
  videoId: string;
  url: string;
  title: string;
  /** Vignette de la diffusion, servie par le proxy d'images du site. */
  thumbnail: string | null;
  /** Spectateurs simultanes, tels que YouTube les compte. */
  viewers: number | null;
};

/**
 * L'identifiant contenu dans une adresse YouTube, ou null si l'adresse pointe
 * ailleurs. Sert au champ Lien Live de l'admin : une diffusion collee a la
 * main s'integre au site comme une diffusion detectee, pour peu qu'elle soit
 * bien sur YouTube.
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

async function fetchJson(url: string, revalidate: number) {
  const res = await fetch(url, { next: { revalidate } });

  if (!res.ok) {
    // 403 signale un quota epuise ou une cle invalide, 404 une chaine
    // introuvable. Dans tous les cas le site retombe sur le champ Lien Live.
    console.error(`YouTube a repondu ${res.status} sur ${url.split("?")[0]}`);
    return null;
  }

  return res.json();
}

async function getChannelId(key: string): Promise<string | null> {
  if (process.env.YOUTUBE_CHANNEL_ID) return process.env.YOUTUBE_CHANNEL_ID;

  const data = await fetchJson(
    `${API}/channels?part=id&forHandle=${encodeURIComponent(CHANNEL_HANDLE)}&key=${key}`,
    CHANNEL_ID_TTL,
  );

  return data?.items?.[0]?.id ?? null;
}

type Thumbnails = Record<string, { url?: string } | undefined> | undefined;

function bestThumbnail(thumbnails: Thumbnails): string | null {
  // De la plus large a la plus etroite. `high` arrive en 4/3, avec deux bandes
  // noires que le cadrage en 16/9 de la facade recoupe exactement.
  for (const taille of ["maxres", "standard", "high", "medium"]) {
    const url = thumbnails?.[taille]?.url;
    if (url) return url;
  }

  return null;
}

/**
 * Vignette la plus large disponible et nombre de spectateurs. `videos` ne
 * coute qu'une unite de quota, contre cent pour la recherche qui precede : le
 * detour est negligeable, et il evite d'etirer une vignette de 480 px sur
 * toute la largeur de la facade.
 */
async function getDetails(key: string, videoId: string, secours: Thumbnails) {
  const data = await fetchJson(
    `${API}/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${key}`,
    LIVE_TTL,
  );

  const item = data?.items?.[0];
  const viewers = Number(item?.liveStreamingDetails?.concurrentViewers);

  return {
    thumbnail:
      bestThumbnail(item?.snippet?.thumbnails) ?? bestThumbnail(secours),
    viewers: Number.isFinite(viewers) ? viewers : null,
  };
}

/**
 * Vignette et spectateurs d'une diffusion dont on connait deja l'identifiant.
 * Sert au lien saisi dans l'admin : sans cle API, la facade se rabat sur son
 * fond aux couleurs du club, avec le lecteur au clic comme dans l'autre cas.
 */
export async function getVideoDetails(videoId: string) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  try {
    return await getDetails(key, videoId, undefined);
  } catch (error) {
    console.error("Details de la diffusion indisponibles :", error);
    return null;
  }
}

/**
 * La diffusion en cours sur la chaine du club, ou null si elle ne diffuse pas.
 *
 * `search` coute cent des dix mille unites de quota quotidiennes, contre une
 * seule pour les autres appels. C'est pourtant le seul qui voie une diffusion
 * des la premiere seconde : la playlist des mises en ligne, a une unite,
 * repond depuis un cache qui accuse jusqu'a un quart d'heure de retard. D'ou
 * l'appel reserve par la route appelante aux seules fenetres de match.
 */
export async function getYoutubeLive(): Promise<LiveBroadcast | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  try {
    const channelId = await getChannelId(key);
    if (!channelId) return null;

    const data = await fetchJson(
      `${API}/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${key}`,
      LIVE_TTL,
    );

    const item = data?.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) return null;

    return {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: item.snippet?.title ?? "",
      ...(await getDetails(key, videoId, item.snippet?.thumbnails)),
    };
  } catch (error) {
    // Une panne chez YouTube ne doit pas priver la page de son bouton.
    console.error("Detection du live YouTube impossible :", error);
    return null;
  }
}
