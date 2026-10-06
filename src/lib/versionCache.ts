/**
 * Ajoutee a la cle des caches de donnees qui contiennent des adresses de
 * medias (logos des equipes et des sponsors, photos des joueurs).
 *
 * Le 04/10/2026, les images sont passees de `/api/media/file/...` a une
 * adresse Vercel Blob directe (voir payload.config.ts). Ces caches n'expirent
 * pas d'eux-memes : leurs entrees gardaient l'ancienne adresse, que Payload ne
 * sert plus (erreur 500, fichier cherche sur le disque). Changer cette valeur
 * fait ignorer toutes les entrees anterieures, en local comme sur Vercel, ou
 * le cache de donnees survit aux deploiements.
 */
export const VERSION_CACHE_MEDIAS = "medias-blob";
