const API = "https://cloud.xbotgo.net/api/core/api/live/room/user/task/detail";

// Leur application lit `region` et `language` dans l'adresse de la salle et les
// transforme en en-tetes. Sans DATA-REGION, l'API repond ERR_REGION_NOT_EXIST,
// et avec la mauvaise region elle repond 14009, « obtention des details de la
// salle echouee ». Une salle chinoise interrogee en EU est donc invisible, et
// reciproquement : la region ne peut pas etre ecrite en dur.
const ENTETES_COMMUNS = {
  "BLINK-APP-MODEL": "WEB",
  "BLINK-APP-LANG": "fr_FR",
};

/** Region retenue quand l'adresse n'en porte pas : celle du club. */
const REGION_PAR_DEFAUT = "EU";

export type SalleXbotgo = {
  id: string;
  /** EU, CN, US ... telle qu'elle est ecrite dans l'adresse de la salle. */
  region: string;
};

/** La salle sous la forme compacte que porte le cookie d'essai : `id:REGION`. */
export function salleVersTexte(salle: SalleXbotgo): string {
  return `${salle.id}:${salle.region}`;
}

export function salleDepuisTexte(texte: string): SalleXbotgo | null {
  const [id, region] = texte.split(":");
  if (!/^\d+$/.test(id ?? "")) return null;

  return {
    id,
    region: /^[A-Z]{2,4}$/.test(region ?? "") ? region : REGION_PAR_DEFAUT,
  };
}

// Quarante-cinq secondes, comme le suivi d'une diffusion YouTube deja connue.
// L'adresse HLS est signee et datee : elle doit rester fraiche, et de toute
// facon l'appel ne coute rien ici, il n'y a pas de quota.
const SUIVI_TTL = 45;

export type XbotgoLive = {
  hlsUrl: string;
  title: string;
  viewers: number | null;
};

/**
 * L'identifiant de salle contenu dans une adresse XbotGo, ou null.
 *
 * Le parametre `userId` de leur lien est l'identifiant encode en base64. Il
 * suffit donc de coller le lien de la salle dans le champ Lien Live pour que le
 * site sache quoi interroger, sans reglage supplementaire.
 */
export function extraireSalle(url: string): SalleXbotgo | null {
  try {
    const { hostname, searchParams } = new URL(url);
    if (!hostname.endsWith("xbotgo.net")) return null;

    const encode = searchParams.get("userId");
    if (!encode) return null;

    const decode = Buffer.from(encode, "base64").toString("utf8").trim();

    // Un identifiant de salle est un nombre. Refuser le reste evite d'appeler
    // leur API avec n'importe quoi.
    if (!/^\d+$/.test(decode)) return null;

    const region = (searchParams.get("region") ?? "").toUpperCase();

    return {
      id: decode,
      region: /^[A-Z]{2,4}$/.test(region) ? region : REGION_PAR_DEFAUT,
    };
  } catch {
    return null;
  }
}

/** L'identifiant seul, pour qui n'a pas besoin de la region. */
export function extractRoomId(url: string): string | null {
  return extraireSalle(url)?.id ?? null;
}

/**
 * La diffusion en cours dans une salle XbotGo, ou null.
 *
 * Leur API rend l'etat, le titre, les compteurs et les adresses de lecture,
 * dont une adresse HLS servie avec CORS ouvert : le lecteur du site la joue
 * directement, sans passer par leur page ni par un cadre. Le filigrane du
 * club reste visible puisqu'il est incruste dans le flux.
 *
 * A savoir : cette adresse repond meme quand la salle porte un mot de passe.
 * Celui-ci protege leur page, pas le flux.
 */
export async function getXbotgoLive(
  salle: SalleXbotgo,
): Promise<XbotgoLive | null> {
  try {
    const res = await fetch(`${API}/${salle.id}`, {
      headers: { ...ENTETES_COMMUNS, "DATA-REGION": salle.region },
      next: { revalidate: SUIVI_TTL },
    });

    if (!res.ok) {
      console.error(`XbotGo a repondu ${res.status} sur la salle ${salle.id}`);
      return null;
    }

    const { code, data } = await res.json();

    // 1 signifie que la salle diffuse. Toute autre valeur veut dire terminee,
    // pas encore commencee, ou en erreur.
    // 14009 signale presque toujours une region qui ne correspond pas a la
    // salle : c'est le premier endroit ou regarder si une diffusion reste
    // introuvable alors qu'elle tourne.
    if (code === 14009) {
      console.error(
        `XbotGo refuse la salle ${salle.id} en region ${salle.region} : region probablement incorrecte`,
      );
      return null;
    }

    if (code !== 200 || data?.playState !== 1) return null;

    // Les adresses de lecture arrivent dans une chaine JSON imbriquee.
    const flux = JSON.parse(data.livePlayUrl ?? "{}");
    if (!flux.hlsPlayUrl) return null;

    const spectateurs = Number(data.currentPlayer);

    return {
      hlsUrl: flux.hlsPlayUrl,
      title: data.liveTitle ?? "",
      viewers: Number.isFinite(spectateurs) ? spectateurs : null,
    };
  } catch (error) {
    // Une panne chez eux ne doit pas priver le site de son bandeau.
    console.error("Etat de la salle XbotGo indisponible :", error);
    return null;
  }
}
