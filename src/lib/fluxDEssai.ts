/**
 * Le flux HLS public qui tient lieu de diffusion pendant un essai du direct,
 * quand aucune salle XbotGo n'est allumee.
 *
 * Un flux d'essai de Mux, en ligne depuis des annees et servi avec les
 * en-tetes CORS qu'un lecteur exige. C'est une video de dix minutes, pas un
 * direct : les particularites du bord du direct (fenetre glissante, retour
 * apres une pause) ne s'eprouvent qu'avec une vraie salle. Le reste, bandeau,
 * lecteur, plein ecran, compteur, traces et rapport, passe par le meme chemin
 * que le soir d'un match.
 *
 * `FLUX_ESSAI` dans `.env.local` permet d'en mettre un autre. Son origine doit
 * alors etre autorisee par la politique de securite : `next.config.ts` la lit
 * de la meme facon, en developpement seulement.
 */
export const FLUX_ESSAI_DEFAUT =
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export function fluxDEssai(): string {
  return process.env.FLUX_ESSAI || FLUX_ESSAI_DEFAUT;
}
