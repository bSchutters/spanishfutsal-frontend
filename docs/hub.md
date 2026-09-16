# Hub UDA : mode d'emploi

L'espace privé du club, sur `/hub`. Calendrier des posts, matchs et entraînements, flux à s'abonner sur le téléphone, idées de contenu, rappels. Le cahier des charges et le journal des décisions sont dans `hub-cahier-des-charges.md`.

## Ajouter une personne et ses droits

Dans l'admin Payload, collection **Utilisateurs**.

1. Créer le compte avec son adresse, un mot de passe, son **prénom** et son nom. Le Hub n'affiche que le prénom.
2. Un **administrateur** a accès à tout, sans rien régler. Pour un **manager**, ouvrir le bloc **Hub** :
   - cocher **Accès au Hub** ;
   - ajouter le module **Calendrier** en **Lecture** (consulter, voter, commenter) ou en **Édition** (créer, modifier, supprimer, planifier, regénérer les posts) ;
   - choisir ses **Flux autorisés** : la personne ne voit que les événements rattachés à au moins un de ces flux.
3. Les deux derniers champs du bloc, notifications et flux notifiés, se règlent par la personne elle-même depuis son profil dans le Hub.

La connexion se fait sur `/hub/connexion`, aussi par le lien « Connexion » en pied du site. Cinq échecs verrouillent le compte un moment. La session dure sept jours et se prolonge à chaque visite.

## Créer un flux et partager son QR

Un flux est un calendrier à s'abonner : Matchs, Comité, Social. Collection **Flux** de l'admin.

1. Nom, slug, couleur, description. La couleur est celle des événements dans le Hub quand le flux est leur flux principal.
2. Les **options** décident ce que le calendrier du téléphone affiche pour chaque événement : heure de rendez-vous, responsables, statut, réseaux et format, légende, lien des visuels, lien vers le Hub. Les notes internes ne sortent jamais.
3. **Alertes** : cochée, chaque événement porte deux alertes dans le calendrier du téléphone, le matin et un peu avant, selon les réglages du Hub.
4. Une fois enregistré, le bloc **Abonnement** de la fiche donne le lien iCal, la page d'abonnement `/abonnement/[jeton]` et un **QR code** à télécharger. Sur iPhone, la page ajoute le calendrier dans Calendrier ; sur Android, dans Google Agenda.
5. **Régénérer le jeton** invalide l'ancien lien : tous les abonnés doivent se réabonner. À n'utiliser que si le lien a fuité.

Les flux sont donnés aux personnes concernées, il n'y a pas de page publique qui les liste.

## Gérer les modèles de post

Collection **Modèles de post**. Un modèle crée un post pour chaque match LFFS, à domicile, à l'extérieur ou les deux.

- **Décalage en jours** et **heure** : J-2 à 18h00 pour une annonce, J à 10h00 pour le jour du match, J+1 à 12h00 pour le résultat. L'heure peut aussi être relative au coup d'envoi, en minutes.
- **Titre**, **légende** et **instructions** acceptent des variables : `{adversaire}`, `{date}` (mercredi 16 septembre), `{date_courte}` (16/09/2026), `{heure}` (22h00), `{heure_rdv}`, `{salle}`, `{adresse}`, `{domicile_exterieur}`, `{competition}`, `{score}`, `{lien_live}`, `{lien_replay}`.
- **Formats**, **réseaux**, **flux** (Social par défaut) et **responsables** sont repris sur les posts créés.
- Modifier un modèle ne touche pas aux posts existants. Sur un match, le bouton **Regénérer les posts** crée ceux qui manquent ; avec l'option **Réinitialiser aussi les posts non publiés**, ils repartent du modèle, diffusion comprise.

Quand un match bouge, ses posts suivent, sauf ceux dont la date a été déplacée à la main, publiés ou annulés. Quand le score arrive ou la salle change, les textes sont refaits, sauf légende retouchée à la main. Un match supprimé dans l'admin est annulé dans le Hub, jamais effacé, avec ses posts non publiés. Un vrai match ne se supprime pas pour un essai : la base est celle du site.

## Réglages du Hub

Global **Réglages du Hub** : durée d'un match et d'un entraînement, rendez-vous avant le coup d'envoi, heure du rappel du matin, délai du rappel avant l'événement, nom du club affiché et motif de reconnaissance du club dans les noms LFFS. Le nom du club vient d'abord de l'équipe cochée **Équipe du club** dans la collection Équipes.

Les **types d'événement** (Post, Match, Entraînement, Réunion, Deadline) portent leur couleur, leur catégorie et leurs flux par défaut. Les **réseaux** et les **formats** sont des listes libres.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URI`, `PAYLOAD_SECRET` | La base et le secret Payload, comme pour le site |
| `CRON_SECRET` | Protège l'import LFFS et les deux jobs du Hub |
| `HUB_BASE_URL` | Adresse publique du Hub dans les liens des flux, les pages d'abonnement et les QR. Vide : l'adresse du site |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Les clés des notifications push, à générer une fois avec `node -e "console.log(require('web-push').generateVAPIDKeys())"`. Le sujet est une adresse `mailto:` |
| `BLOB_READ_WRITE_TOKEN` | Le stockage des fichiers sur Vercel Blob, visuels du Hub compris, préfixe `hub` |
| `ESSAI_HTTP_RESEAU_LOCAL` | Uniquement pour essayer une construction de production en http sur le réseau local. Jamais sur Vercel |

## Jobs

Trois appels à programmer dans le cron externe, avec l'en-tête `Authorization: Bearer $CRON_SECRET`. Un administrateur connecté peut aussi les lancer à la main dans le navigateur.

| Route | Fréquence | Rôle |
|---|---|---|
| `POST /api/import/trigger` | quotidien, plus souvent les soirs de match | L'import LFFS existant. Chaque match importé synchronise son événement et ses posts |
| `POST /api/hub/synchro-matchs` | une fois par jour, après l'import | Réconciliation : resynchronise tous les matchs de la saison active, annule les événements dont le match a disparu |
| `POST /api/hub/rappels` | toutes les 5 minutes | Envoie les rappels push dont l'heure tombe dans les dix dernières minutes, une seule fois chacun |

Le journal des rappels envoyés est dans l'admin, collection **Journal des rappels**.

## Base de données et migrations

Une seule base pour le développement et la production. Le schéma passe par les migrations : `pnpm migrate:create nom` après un changement de collection, puis `pnpm migrate`. Le `pnpm build` de Vercel applique les migrations avant de construire. Voir `base-de-donnees.md`.

## Déploiement

1. Fusionner `feat/hub` dans `feat/payload-migration`, la branche déployée.
2. Poser sur Vercel les variables VAPID et, si besoin, `HUB_BASE_URL`.
3. Régler les trois appels du cron externe ci-dessus.
4. Après le déploiement, lancer une fois `POST /api/hub/synchro-matchs` pour créer les événements des matchs de la saison, si ce n'est pas déjà fait.

## Essayer sur un téléphone

Le mode développement est trop lourd pour un téléphone. Construire une copie de production dans un dossier à part, avec `ESSAI_HTTP_RESEAU_LOCAL=1` et `HUB_BASE_URL=http://adresse.locale:3001` dans son `.env.local`, puis `pnpm build` et `pnpm exec next start -p 3001 -H 0.0.0.0`. Les notifications push, elles, exigent du https : un déploiement de prévisualisation ou un tunnel https.

## Tests

`pnpm test` lance les tests unitaires du Hub (droits, dates, récurrence, flux iCal, synchronisation des matchs, posts générés, idées, rappels) puis les vérifications du direct. `pnpm test:site` contrôle le site construit, et vérifie en plus qu'aucune route fermée ne répond sans session.
