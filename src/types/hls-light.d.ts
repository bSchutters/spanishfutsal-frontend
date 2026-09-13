/**
 * Les types du sous-chemin « light » de hls.js.
 *
 * Le paquet declare ses types pour sa racine mais pas pour ce sous-chemin, dont
 * la carte d'exports ne porte qu'`import` et `require`. Sans cette ligne, le
 * chargement dynamique du lecteur est un `any` implicite, et tout ce qui touche
 * a l'instance perd sa verification.
 *
 * Les deux variantes exposent la meme API : la « light » laisse seulement de
 * cote les pistes audio alternatives, les sous-titres et le chiffrement.
 */
declare module "hls.js/light" {
  export * from "hls.js";
  export { default } from "hls.js";
}
