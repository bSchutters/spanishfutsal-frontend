# Hub UDA : mode d'emploi

L'espace privé du club, sur `/hub`. Calendrier des posts, matchs et entraînements, flux à s'abonner sur le téléphone, idées de contenu, rappels. Le cahier des charges et le journal des décisions sont dans `hub-cahier-des-charges.md`.

## Ajouter une personne et ses droits

Tout se passe dans le Hub, page **Membres**, réservée aux administrateurs et accessible par le menu du compte, en bas de la barre latérale, ou par le profil sur téléphone.

**Ajouter un membre** demande son prénom, son nom et son adresse e-mail, puis ses droits. Le mot de passe est tiré au hasard et s'affiche une seule fois, à copier et à lui transmettre ; elle pourra le changer. Un compte créé ici est un membre : le rôle d'administrateur se donne dans l'admin Payload.

Toucher une ligne ouvre les droits d'une personne :

- **Accès au Hub** : sans cette case, aucune page ne s'ouvre.
- **Modules** : Aucun, Lecture (consulter, voter, commenter) ou Édition (créer, modifier, supprimer) pour chacun. La liste suit le registre : un module ajouté au code apparaît ici tout seul, il n'y a qu'à l'ouvrir aux personnes concernées.
- **Flux autorisés** : la personne ne voit que les événements rattachés à au moins un de ces flux.

Un administrateur a tout sans réglage, sa ligne ne s'ouvre pas. Le rôle, le mot de passe d'un compte existant et les notifications que chacun choisit dans son profil restent hors de cette page.

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

Un post « À créer » qui reçoit une légende et au moins un visuel passe tout seul en « Prêt ». Jamais dans l'autre sens.

Quand un match bouge, ses posts suivent, sauf ceux dont la date a été déplacée à la main, publiés ou annulés. Quand le score arrive ou la salle change, les textes sont refaits, sauf légende retouchée à la main. Un match supprimé dans l'admin est annulé dans le Hub, jamais effacé, avec ses posts non publiés. Un vrai match ne se supprime pas pour un essai : la base est celle du site.

Quinze jours après la date d'un post publié, ses visuels sont effacés du stockage par le job quotidien : ils vivent alors sur les réseaux. Le post garde sa légende et son lien de publication. Un visuel partagé par plusieurs posts attend que tous soient publiés depuis quinze jours.

## Numéros et stats des joueurs

Module **Joueurs**, deux pages.

**Effectif** : toute la collection Joueurs du site, en trois catégories, Gardiens, Joueurs, Staff, les inactifs estompés en fin de catégorie. Chaque ligne montre le numéro, la photo et le nom. Toucher une ligne ouvre la fiche : prénom, nom, poste, photo, date de naissance, numéro, capitaine, actif. Le numéro est celui du site et de la feuille de match, un seul et même numéro ; le staff n'en a pas. Le bouton **Ajouter** crée une fiche. Rien ne se supprime : décocher **Dans l'effectif actuel** sort la personne du site et de la feuille en gardant sa fiche et ses statistiques.

**Stats** : les matchs de la saison active, en trois groupes. **À saisir** : le score est arrivé par l'import, la feuille est vide. **Saisie** : au moins une ligne. **À venir** : pas encore de score. Un match sans date n'apparaît pas tant que la LFFS ne l'a pas fixé. Ouvrir un match donne sa feuille : cocher qui a joué (un joueur coché sans rien compte un match joué), puis compter buts, assists, cartons et, pour le gardien, la clean sheet. Le bas de page compare les buts saisis au score du club et prévient d'un écart, sans empêcher d'enregistrer. Tout s'enregistre d'un coup. Les stats vont dans la collection Matchs, celle que la page Équipe du site lit : l'admin reste utilisable pour les mêmes données.

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
| `POST /api/hub/synchro-matchs` | une fois par jour, après l'import | Réconciliation : resynchronise tous les matchs de la saison active, annule les événements dont le match a disparu. Fait aussi le ménage des visuels des posts publiés depuis quinze jours |
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
