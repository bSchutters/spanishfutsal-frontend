import { calculerLeRapport } from "./audience";
import { esquisse, type Rapport } from "./audienceCalculs";
import { coupDEnvoi, FENETRE_APRES_MS } from "./fenetreDuMatch";
import { getMatchs } from "./getMatchs";
import { getPayloadClient } from "./payload";

/**
 * Le compte rendu d'une diffusion, ecrit puis envoye.
 *
 * Il ne va pas sur le site : l'audience du club ne regarde personne d'autre. Il
 * est conserve dans l'administration, et pousse vers un webhook prive si les
 * parametres en portent un.
 *
 * La fin d'une diffusion peut etre constatee deux fois, par le dernier visiteur
 * encore present comme par le rattrapage du matin. La case « rapport envoye »
 * est ce qui garantit un seul message.
 */

const heure = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("fr-BE", {
        timeZone: "Europe/Brussels",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "?";

/** Le message, tel qu'il arrive dans la conversation. */
function rediger(affiche: string, rapport: Rapport): string {
  const lignes = [
    `**${affiche}**, diffusion terminee`,
    `Pointe : **${rapport.pointe}** en meme temps`,
    `Spectateurs differents : ${rapport.uniques}`,
    `Duree moyenne : ${rapport.dureeMoyenneMinutes.toLocaleString("fr-BE")} min`,
    `Telephones : ${rapport.partMobile} %`,
    `De ${heure(rapport.debut)} a ${heure(rapport.fin)}`,
  ];

  const courbe = esquisse(rapport.courbe);
  if (courbe) lignes.push(`\`${courbe}\``);

  return lignes.join("\n");
}

/** Le meme texte sans ses marques de gras. */
const sansGras = (texte: string) => texte.replace(/\*\*/g, "");

/** L'hote est-il celui-la, ou un de ses sous-domaines ? */
const estLHote = (hostname: string, domaine: string) =>
  hostname === domaine || hostname.endsWith(`.${domaine}`);

/**
 * Pousse le message vers le webhook des parametres.
 *
 * Trois formes selon la destination, parce que chacune attend son propre champ.
 * WhatsApp n'en fait pas partie : leur API reclame un compte professionnel
 * verifie et des modeles de message approuves pour ecrire en dehors d'une
 * conversation en cours, ce qui n'a pas de sens pour six lignes de statistiques.
 */
async function pousser(
  url: string,
  texte: string,
  rapport: Rapport,
): Promise<boolean> {
  try {
    const { hostname } = new URL(url);

    const corps =
      estLHote(hostname, "discord.com") || estLHote(hostname, "discordapp.com")
        ? { content: texte }
        : estLHote(hostname, "telegram.org")
          ? // Le gras de Discord s'ecrit avec deux etoiles, celui de Telegram avec
            // une seule : lui envoyer la notation de Discord lui fait refuser tout
            // le message pour entites non analysables. Il le recoit donc en texte
            // brut, sans mode d'analyse. L'identifiant de conversation, lui, se
            // met dans l'adresse du webhook.
            { text: sansGras(texte) }
          : // N'importe quel autre service : le texte et les chiffres bruts, a
            // charge pour lui d'en faire ce qu'il veut.
            { text: sansGras(texte), rapport };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });

    if (!res.ok) {
      console.error(`Le webhook du rapport a repondu ${res.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Envoi du rapport impossible :", error);
    return false;
  }
}

/**
 * Ecrit le rapport d'une rencontre et l'envoie, si ce n'est pas deja fait.
 *
 * Sans trace d'audience, il n'y a rien a dire : personne n'a regarde, ou la
 * diffusion n'a pas eu lieu. Aucun message n'est alors envoye.
 */
export async function cloturerLaDiffusion(
  matchId: number,
  affiche: string,
): Promise<void> {
  try {
    const payload = await getPayloadClient();

    const { docs } = await payload.find({
      collection: "live-reports",
      where: { match: { equals: matchId } },
      limit: 1,
      depth: 0,
    });

    const existant = docs[0] as
      | { id: number | string; envoye?: boolean }
      | undefined;
    if (existant?.envoye) return;

    const parametres = await payload.findGlobal({ slug: "settings" });
    const webhook = parametres?.report_webhook;

    // Une fiche existe deja et il n'y a nulle part ou l'envoyer : il n'y a plus
    // rien a faire. Sans cette sortie, chaque interrogation de la route
    // recalculerait le meme rapport jusqu'a la fermeture de la fenetre.
    if (existant && !webhook) return;

    const rapport = await calculerLeRapport(matchId);
    if (!rapport) return;

    const chiffres = {
      match: matchId,
      affiche,
      debut: rapport.debut,
      fin: rapport.fin,
      uniques: rapport.uniques,
      pointe: rapport.pointe,
      duree_moyenne: rapport.dureeMoyenneMinutes,
      part_mobile: rapport.partMobile,
      courbe: rapport.courbe,
    };

    const fiche = existant
      ? await payload.update({
          collection: "live-reports",
          id: existant.id,
          data: chiffres,
        })
      : await payload.create({ collection: "live-reports", data: chiffres });

    // Sans destination, le rapport reste dans l'administration : c'est un
    // reglage absent, pas un echec.
    if (!webhook) return;

    const envoye = await pousser(webhook, rediger(affiche, rapport), rapport);

    if (envoye) {
      await payload.update({
        collection: "live-reports",
        id: fiche.id,
        data: { envoye: true },
      });
    }
  } catch (error) {
    // Un rapport manque : la diffusion, elle, s'est bien passee.
    console.error("Cloture de la diffusion impossible :", error);
  }
}

/**
 * Reprend les diffusions passees dont le rapport manque encore.
 *
 * La cloture normale a lieu quand un visiteur encore present constate que la
 * salle s'est eteinte. Si tout le monde ferme son onglet au coup de sifflet
 * final, personne ne la constate : ce balayage est le filet.
 */
export async function balayerLesDiffusions(): Promise<number> {
  const matchs = await getMatchs();
  const now = Date.now();
  let clotures = 0;

  for (const match of matchs) {
    if (!match.date || !match.time) continue;

    const debut = coupDEnvoi(match.date, match.time);
    if (Number.isNaN(debut)) continue;

    const finDeFenetre = debut + FENETRE_APRES_MS;

    // Les trois derniers jours : au-dela, une diffusion sans rapport n'en aura
    // jamais, et ratisser toute la saison a chaque passage ne servirait a rien.
    if (finDeFenetre > now || now - finDeFenetre > 3 * 24 * 60 * 60 * 1000)
      continue;

    await cloturerLaDiffusion(
      match.id,
      `${match.homeTeam} - ${match.awayTeam}`,
    );
    clotures += 1;
  }

  return clotures;
}
