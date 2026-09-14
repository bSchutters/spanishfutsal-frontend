import { extractVideoId } from "./youtubeVideoId";

export { extractVideoId };

const CHANNEL_HANDLE = "@UDAsturiana";
const API = "https://www.googleapis.com/youtube/v3";

// Un mois : un handle ne change pas, et l'identifiant qu'il designe encore
// moins. Cette resolution evite d'avoir a relever l'identifiant a la main.
const CHANNEL_ID_TTL = 30 * 24 * 60 * 60;

/**
 * Deux rythmes, parce que les deux appels n'ont pas le meme prix.
 *
 * La recherche coute cent unites et tourne tant qu'aucune diffusion n'a ete
 * trouvee, y compris les soirs ou le club ne diffuse pas : trois minutes
 * plafonnent la depense a trois mille quatre cents unites sur une fenetre de
 * match, sur les dix mille de la journee.
 *
 * La surveillance d'une diffusion deja connue ne coute qu'une unite : rien
 * n'oblige a la ralentir, et le compteur de spectateurs y gagne en fraicheur.
 *
 * Dans les deux cas, toutes les visites d'un meme intervalle partagent un seul
 * appel : la consommation ne depend pas de l'affluence.
 */
const RECHERCHE_TTL = 180;
const SUIVI_TTL = 45;

// Un quart d'heure pour la liste des mises en ligne. Elle ne sert qu'au
// rattrapage des replays, une fois par jour : la garder plus longtemps
// n'economiserait qu'une unite de quota et ferait mentir un appel manuel.
const MISES_EN_LIGNE_TTL = 900;

export type LiveBroadcast = {
  videoId: string;
  url: string;
  title: string;
  /** Spectateurs simultanes, tels que YouTube les compte. */
  viewers: number | null;
};

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

/**
 * Le nombre de spectateurs d'une diffusion. `videos` ne coute qu'une unite de
 * quota, contre cent pour la recherche : le detour est negligeable.
 */
export async function getViewers(videoId: string): Promise<number | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  try {
    const data = await fetchJson(
      `${API}/videos?part=liveStreamingDetails&id=${videoId}&key=${key}`,
      SUIVI_TTL,
    );

    const compte = Number(
      data?.items?.[0]?.liveStreamingDetails?.concurrentViewers,
    );

    return Number.isFinite(compte) ? compte : null;
  } catch (error) {
    console.error("Compte des spectateurs indisponible :", error);
    return null;
  }
}

/**
 * La diffusion dont on connait deja l'identifiant, si elle est toujours en
 * cours. Une unite de quota, contre cent pour la recherche.
 *
 * C'est le chemin normal pendant une rencontre : la recherche ne sert qu'a
 * decouvrir la diffusion, une fois. Ensuite l'identifiant est connu, retenu
 * dans le champ Lien Replay, et il suffit de demander a YouTube si cette video
 * precise diffuse encore.
 */
export async function getBroadcastById(
  videoId: string,
): Promise<LiveBroadcast | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  try {
    const data = await fetchJson(
      `${API}/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${key}`,
      SUIVI_TTL,
    );

    const item = data?.items?.[0];
    if (item?.snippet?.liveBroadcastContent !== "live") return null;

    const compte = Number(item.liveStreamingDetails?.concurrentViewers);

    return {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: item.snippet.title ?? "",
      viewers: Number.isFinite(compte) ? compte : null,
    };
  } catch (error) {
    console.error("Verification de la diffusion impossible :", error);
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
      RECHERCHE_TTL,
    );

    const item = data?.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) return null;

    return {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: item.snippet?.title ?? "",
      viewers: await getViewers(videoId),
    };
  } catch (error) {
    // Une panne chez YouTube ne doit pas priver le site de son bandeau.
    console.error("Detection du live YouTube impossible :", error);
    return null;
  }
}

export type MiseEnLigne = {
  videoId: string;
  url: string;
  title: string;
  description: string;
  /** Date de publication, telle que YouTube la declare. */
  publishedAt: string;
};

/**
 * La playlist qui contient toutes les mises en ligne de la chaine.
 *
 * Son identifiant se deduit de celui de la chaine en changeant deux lettres,
 * mais la convention n'est ecrite nulle part chez Google : on le demande, et on
 * le garde un mois. Une unite de quota.
 */
async function getUploadsPlaylistId(key: string): Promise<string | null> {
  const channelId = await getChannelId(key);
  if (!channelId) return null;

  const data = await fetchJson(
    `${API}/channels?part=contentDetails&id=${channelId}&key=${key}`,
    CHANNEL_ID_TTL,
  );

  return data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

/**
 * Les dernieres videos mises en ligne sur la chaine du club.
 *
 * Une unite de quota, contre cent pour une recherche. Le prix de cette economie
 * est un cache qui accuse parfois un quart d'heure de retard, ce qui interdit ce
 * chemin pour detecter un direct qui commence. Pour retrouver le replay d'une
 * rencontre jouee la veille, il est sans defaut.
 */
export async function getMisesEnLigne(
  combien = 25,
): Promise<MiseEnLigne[] | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  try {
    const playlistId = await getUploadsPlaylistId(key);
    if (!playlistId) return null;

    const data = await fetchJson(
      `${API}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${combien}&key=${key}`,
      MISES_EN_LIGNE_TTL,
    );

    const items: unknown[] = data?.items ?? [];

    return items.flatMap((item) => {
      const snippet = (item as { snippet?: Record<string, unknown> })?.snippet;
      const videoId = (
        snippet?.resourceId as { videoId?: string } | undefined
      )?.videoId;

      if (!videoId) return [];

      return [
        {
          videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: String(snippet?.title ?? ""),
          description: String(snippet?.description ?? ""),
          publishedAt: String(snippet?.publishedAt ?? ""),
        },
      ];
    });
  } catch (error) {
    console.error("Liste des mises en ligne indisponible :", error);
    return null;
  }
}
