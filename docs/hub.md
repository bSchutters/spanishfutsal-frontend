# Hub UDA : mode d'emploi

L'espace privé du club, sur `/hub`. Calendrier des posts, matchs et entraînements, flux à s'abonner sur le téléphone, idées de contenu, rappels. Le cahier des charges et le journal des décisions sont dans `hub-cahier-des-charges.md`.

## L'accueil

La page `/hub` montre ce qui attend la personne, du plus urgent au moins urgent. Chaque bloc n'apparaît que si elle a le droit sur son module :

- **Calendrier** : un bandeau rouge quand des posts sont en retard (date passée sans publication, tous responsables confondus), le prochain match du calendrier, ses trois prochains posts à faire (ceux dont elle est responsable) et le nombre d'idées qui attendent son vote.
- **Joueurs** : les anniversaires des fiches actives, aujourd'hui et les six jours suivants. En édition seulement, les feuilles de stats des matchs joués qui restent vides.
- **Direct** : la dernière diffusion, avec l'écart de spectateurs par rapport à la précédente.
- **Pack** : le nombre de commandes reçues qui attendent d'être passées chez Joma.

Les modules et les flux de la personne sont dans son Profil.

## Le Pack : commandes Joma des joueurs

Le module **Pack** rassemble les commandes d'articles Joma sans compte pour les joueurs ni paiement en ligne. Il s'ouvre à une personne depuis la page Membres, comme les autres modules.

Le module a deux entrées dans le menu, **Commandes** et **Catalogue**.

**Préparer la page des joueurs**, page Catalogue :

1. Ajouter les articles : nom, référence Joma du modèle (104263), prix catalogue Joma (logo du club compris), remise (la générale, aucune, ou une remise propre à l'article), tailles séparées par des virgules, floquable ou non, puis une ou plusieurs couleurs, chacune avec son code couleur Joma (339) et jusqu'à dix photos (la première est la principale ; l'étoile en désigne une autre, et les vignettes se glissent pour changer l'ordre). La référence complète, 104263.339, se compose toute seule pour les commandes et le PDF. Décocher « Dans le catalogue » cache un article de la page des joueurs ; **Supprimer**, dans sa fiche, le retire pour de bon. Dans les deux cas, les commandes déjà passées gardent leurs lignes (nom, référence, prix).
2. Dans le bloc **Page des joueurs** : régler la **remise générale** (en %), choisir un mot de passe, vérifier les prix des flocages (numéro et nom), mettre une date limite si besoin, puis cocher **Commandes ouvertes**. Sans mot de passe, personne n'entre.
3. Partager le **lien** (ou son QR code) et le mot de passe dans le groupe. **Nouveau lien** coupe aussitôt l'ancien ; changer le mot de passe oblige chacun à le retaper.

Le joueur paie le prix catalogue moins la remise de l'article, arrondi au centime ; la page lui montre le prix catalogue barré. Les flocages gardent leur prix, sans remise.

**La fiche d'un article** s'ouvre en grande fenêtre centrée. Sur ordinateur, les réglages à gauche (L'article, Prix, Couleurs et photos, Logo sur la face avant, Flocage) et, à droite, l'aperçu de l'article tel que le joueur le verra, qui reste en place pendant qu'on fait défiler : couleur au choix, Face ou Dos, nom et prix. Il suit ce qu'on règle : toucher une couleur l'affiche, les réglages du logo montrent la face, ceux du flocage le dos. Sur téléphone, tout se suit, l'aperçu juste avant les réglages du logo et du flocage.

**Aperçu du flocage.** Pour un article floquable, marquer dans chaque couleur la photo de dos (bouton « Dos » sur la vignette) et choisir les trois couleurs du flocage (lettre, contour, contour extérieur ; jaune, marine, jaune par défaut, comme le numéro du club). Le bloc « Aperçu du flocage » de la fiche montre un nom et un numéro d'essai sur cette photo (avec un choix de la couleur quand plusieurs ont une photo de dos), avec des curseurs pour la hauteur et la taille du nom et du numéro. Les sponsors du club y sont par défaut, Sofexia au-dessus du numéro et Wabee en dessous : un interrupteur « Sponsors du club » les retire d'un article, et trois curseurs règlent leur hauteur et leur largeur. Leur version suit la couleur des lettres : jaunes, marine ou noirs (les fichiers du club, copiés dans `public/assets/images/flocage`). **Logo des gardiens.** Chaque couleur choisit sa version du logo, pour les logos du numéro comme pour celui de la face avant : celui du club en couleurs (joueurs, domicile et extérieur), marine et rouge (gardien à domicile) ou noir et blanc (gardien à l'extérieur), les fichiers du club copiés dans `public/assets/images/flocage`.

**Logo sur la face avant.** Un interrupteur de la fiche pose le logo du club sur la photo principale de chaque couleur (glisser la photo de face en premier), avec des curseurs propres à l'article pour sa place et sa taille, et trois de plus pour suivre un maillot photographié de biais : largeur, inclinaison et rotation. Côté joueur, il apparaît sur cette photo dès l'ouverture.

Côté joueur, les sponsors sont toujours sur la photo de dos ; activer le flocage y fait glisser le diaporama, et le numéro et le nom s'y dessinent pendant la saisie, en Tanker (la police du flocage, Indian Type Foundry, gratuite via Fontshare), avec le logo du club dans le bas de chaque chiffre.

**L'ordre du catalogue** se change en glissant les articles par leur poignée, ou aux flèches haut et bas depuis la poignée : il s'enregistre au lâcher, et la page des joueurs le suit. Un article reste parmi les actifs, ou parmi les retirés.

**Côté joueur**, la page `/pack/…` demande le mot de passe, puis montre les articles en cartes (photo avec le logo du club, prix remisé, couleurs). Toucher une carte ouvre sa fiche : photos en grand avec l'aperçu du flocage, couleur, taille et quantité en boutons, interrupteur Flocage au dos (numéro et nom, sans contour pour le nom), et le prix de la ligne sur le bouton d'ajout. La commande se récapitule à droite sur ordinateur, en bas de page sur téléphone (une barre y mène) : « Qui commande ? » en tête (le nom dans l'effectif, ou « Autre »), les lignes et leurs quantités, le total, une remarque facultative. Choisi avant d'ouvrir un article, le nom d'un joueur préremplit son flocage avec son numéro et son nom de famille. Plus de téléphone ni d'e-mail demandés. Une même personne peut envoyer plusieurs commandes. Rien ne se modifie après l'envoi : le joueur prévient le club.

**Traiter les commandes**, page Commandes : elles arrivent en « Reçue ». Un clic ouvre une commande, que le club corrige (taille, quantité, flocage, articles, coordonnées, statut) ; une ligne qui ne change pas de nature garde son prix d'origine. Pour commander chez Joma, cocher les commandes, **Préparer la commande Joma**, décocher les articles à garder pour plus tard, **Télécharger le PDF** (quantités par référence, couleur et taille, puis les flocages, sans prix ni noms de joueurs), puis **Marquer commandées**. Ensuite, passer chaque commande en « Livrée » à la distribution. Une commande abandonnée passe en « Annulée ».

## Ajouter une personne et ses droits

Tout se passe dans le Hub, page **Membres**, réservée aux administrateurs et accessible par le menu du compte, en bas de la barre latérale, ou par le profil sur téléphone.

**Ajouter un membre** demande son prénom, son nom et son adresse e-mail, puis ses droits. Le mot de passe est tiré au hasard et s'affiche une seule fois, à copier et à lui transmettre ; elle le remplace par le sien dans son **Profil**, bloc Mot de passe (huit caractères au moins, l'actuel est demandé). Un compte créé ici est un membre : le rôle d'administrateur se donne dans l'admin Payload.

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
