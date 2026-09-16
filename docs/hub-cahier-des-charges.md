# Hub UDA : cahier des charges

Version 1.0, septembre 2026
Projet : espace club privé du site udasturiana.be, premier module : Calendrier

---

## 0. Mode d'emploi pour Claude Code

Ce document est la source de vérité du projet. Il est découpé en lots (section 17).

Règles de travail :

1. **Commence par le Lot 0 (audit)** et rends un rapport écrit avant toute modification du code. Attends la validation.
2. Travaille **un lot à la fois**. À la fin de chaque lot : résumé des changements, migrations créées, commandes à lancer, points à tester manuellement. Attends la validation avant le lot suivant.
3. Si l'audit ou l'implémentation révèle un **conflit avec ce document** (structure existante, limite technique, librairie indisponible), arrête-toi et pose la question. Ne contourne pas en silence.
4. **Ne modifie jamais** le comportement de l'import LFFS, de la collection Matches ou des pages publiques existantes sans validation explicite. Le Hub se greffe sur l'existant, il ne le remplace pas.
5. Aucune donnée existante ne doit être supprimée. Toutes les modifications de schéma passent par des migrations.
6. Interface **en français uniquement**. Dans tous les textes d'interface, n'utilise jamais le tiret cadratin : utilise des virgules ou des points.
7. Respecte les conventions du projet (structure, nommage, lint, formatage) relevées pendant l'audit.
8. Mets à jour ce document (section 18, « Journal des décisions ») quand une décision change pendant le développement.

---

## 1. Contexte

UD Asturiana est un club de futsal bruxellois (LFFS, P3). Le site udasturiana.be tourne sous **Next.js + Payload CMS**, avec Tailwind CSS et shadcn/ui, déployé sur un VPS (PM2, Nginx).

Le site contient déjà une collection **Matches**, alimentée automatiquement par un import des données LFFS (champ `lffs_id`, équipes, date, heure, salle, score, liens live et replay, stats joueurs, saison).

Besoins du club :

- Planifier à l'avance les publications sur les réseaux sociaux (pas de publication automatique).
- Recevoir un rappel au moment de publier.
- Donner aux joueurs, au comité et au pôle social un calendrier consultable dans l'app calendrier native de leur téléphone (iPhone et Android), qui se met à jour tout seul.
- Toute modification se fait **uniquement** depuis l'espace privé, jamais depuis les téléphones.
- Préparer un espace privé extensible : un futur module « Matchs & stats » (saisie des scores et statistiques) viendra s'ajouter au calendrier. Payload reste l'outil de réglages généraux.

---

## 2. Périmètre

### Dans le périmètre (V1)

- Espace privé **/hub** avec connexion, droits par module (lecture / édition).
- Module **Calendrier** : événements, types, flux, récurrence, vues mois / semaine / liste, vue « À faire », glisser-déposer, commentaires.
- **Flux iCal** par public (Joueurs, Comité, Social…), contenu adapté par flux, pages d'abonnement et QR codes.
- **Synchronisation des matchs LFFS** vers le calendrier + matchs manuels (amicaux).
- **Modèles de posts** générés automatiquement pour chaque match LFFS.
- **Idées** sous forme de tickets, en board, avec votes indicatifs et commentaires.
- **PWA** et **notifications push** pour les rappels de publication.
- Tests automatisés sur les parties sensibles.

### Hors périmètre (V1)

- Publication automatique sur les réseaux.
- Tags (remplacés par types et flux).
- Suivi des sponsors mis en avant.
- Synchronisation directe vers Google Agenda via API (évolution possible, voir section 19).
- Récapitulatif quotidien par notification.
- Notifications pour les joueurs (ils sont prévenus via WhatsApp).
- Module « Matchs & stats » (seule l'architecture doit le permettre).
- Affichage des matchs amicaux sur le site public.

---

## 3. Lot 0 : audit obligatoire

Avant d'écrire du code, analyse le projet et produis un rapport couvrant :

1. **Versions** : Payload, Next.js, React, Node, base de données (type et version), gestionnaire de paquets.
2. **Structure du projet** : organisation des dossiers, routes App Router, séparation front / Payload, conventions de nommage.
3. **Import LFFS** : où il se trouve, comment il est déclenché (cron, job, manuel), et surtout s'il **met à jour les matchs existants via `lffs_id`** ou s'il **supprime et recrée** les documents. Cette réponse conditionne toute la logique de synchronisation (section 8).
4. **Collection Matches** : schéma complet, champs de dates et heures (format, fuseau), relation saison, noms d'équipes (nom officiel vs nom d'affichage utilisé sur le site, par ex. « UNION DEPORTIVA ASTURIANA BRUXELLES » vs « UD Asturiana »), matchs sans date.
5. **Collection Users** : authentification, rôles existants, champs, durée de session, verrouillage après échecs de connexion.
6. **Règles d'accès** de toutes les collections, en particulier : l'API REST `/api/matches` est aujourd'hui lisible publiquement (stats et liens live compris). Indique si c'est nécessaire au front public et propose une option plus restrictive, **sans l'appliquer** sans validation.
7. **File de jobs Payload** : disponible ? configurée ? compatible avec le déploiement PM2 (mode fork ou cluster, nombre d'instances) ?
8. **UI** : configuration Tailwind (version, tokens de couleurs, polices), composants shadcn installés, thème clair / sombre, composants réutilisables du site (header, footer, logo).
9. **Médias** : collection d'upload existante, stockage (disque, S3…).
10. **Déploiement** : scripts de build, migrations, variables d'environnement, configuration Nginx connue, présence d'une CI.
11. **Tests** : runner existant ou absence de tests.
12. **FullCalendar v7** : vérifier que la v7 est publiée en version stable et que le registre shadcn fonctionne avec la version de shadcn / Tailwind du projet. Si ce n'est pas le cas, proposer une alternative avant le Lot 2.

Le rapport se termine par la liste des **écarts ou risques** par rapport à ce cahier des charges et les questions à trancher.

---

## 4. Architecture générale

- Le Hub vit dans **la même application Next.js** que le site, sous le chemin **`/hub`**.
- Authentification : **les comptes Payload existants** (collection Users), une seule base d'utilisateurs.
- **Payload admin** : réglages (flux, types, réseaux, formats, modèles, réglages globaux, utilisateurs et droits). Le comité n'a pas besoin d'y aller au quotidien.
- **Hub** : interface sur mesure pour l'usage quotidien, pensée mobile d'abord.
- Architecture **modulaire** : un registre de modules (clé, nom, icône, route, niveaux de droits) permet d'ajouter plus tard le module `matchs-stats` sans refonte. La navigation et la page d'accueil du Hub sont générées depuis ce registre, filtrées selon les droits de l'utilisateur.

### Routes

| Route | Accès | Rôle |
|---|---|---|
| `/hub/connexion` | public, noindex | formulaire de connexion |
| `/hub` | connecté + accès Hub | accueil : modules disponibles |
| `/hub/calendrier` | module calendrier | vues calendrier |
| `/hub/calendrier/a-faire` | module calendrier | vue « À faire » |
| `/hub/calendrier/evenements/[id]` | module calendrier | détail / édition d'un événement |
| `/hub/idees` | module calendrier | board des idées |
| `/hub/idees/[id]` | module calendrier | ticket |
| `/hub/profil` | connecté + accès Hub | préférences, notifications, installation PWA |
| `/abonnement/[token]` | public via jeton, noindex | page d'abonnement à un flux |
| `/api/hub/flux/[token].ics` | public via jeton, noindex | flux iCal |

Un lien discret **« Connexion »** est ajouté au footer du site, vers `/hub/connexion`. Un utilisateur déjà connecté avec accès est redirigé vers `/hub`.

Les noms de routes peuvent être adaptés aux conventions relevées pendant l'audit.

---

## 5. Utilisateurs, droits et sécurité

### Champs ajoutés à la collection Users

| Champ | Type | Description |
|---|---|---|
| `accesHub` | booléen | autorise la connexion au Hub |
| `modules` | tableau | lignes `{ module, niveau }`, `module` parmi le registre (`calendrier`, plus tard `matchs-stats`), `niveau` : `lecture` ou `edition` |
| `fluxAutorises` | relation multiple → Flux | flux visibles dans le Hub par cet utilisateur |
| `pushActif` | booléen | reçoit les notifications push (modifiable dans son profil) |
| `fluxNotifies` | relation multiple → Flux | sous-ensemble de `fluxAutorises` pour lesquels il reçoit les rappels (modifiable dans son profil) |

Les administrateurs existants (rôle admin Payload) ont accès à tout, y compris tous les flux et les réglages.

### Règles de droits

- **Sans `accesHub`** : aucune route `/hub` accessible (redirection vers la connexion avec message).
- **Lecture** (module calendrier) : consulter le calendrier, la vue « À faire », les idées ; **voter et commenter** les idées et les événements.
- **Édition** (module calendrier) : en plus, créer, modifier, déplacer, supprimer des événements et des idées, changer les statuts.
- Un utilisateur ne voit **que les événements appartenant à au moins un de ses flux autorisés**. Les événements des autres flux n'existent pas pour lui (ni dans les vues, ni dans l'API).
- Les **notes internes** ne sont visibles que dans le Hub, jamais dans les flux iCal.
- Seuls les administrateurs gèrent les réglages dans Payload.

### Exigences de sécurité

- Vérification des droits **côté serveur** sur chaque page, Server Action et route API. Masquer un bouton ne suffit jamais.
- **Access control Payload** sur toutes les nouvelles collections : aucune lecture publique via l'API REST ou GraphQL. Les flux iCal passent exclusivement par la route à jeton.
- Cookie de session `httpOnly`, `secure`, `sameSite=lax`.
- Limitation des tentatives de connexion (mécanisme Payload `maxLoginAttempts` / `lockTime` ou équivalent) et limitation de débit sur `/hub/connexion` et les routes de flux.
- Expiration de session après inactivité (valeur par défaut : 7 jours, réglable).
- `/hub`, `/abonnement` et `/api/hub` : balise `noindex, nofollow`, en-tête `X-Robots-Tag: noindex`, exclusion dans `robots.txt`.
- Jetons de flux : aléatoires, au moins 32 octets, encodés URL-safe, **régénérables** en un clic (l'ancien jeton cesse immédiatement de fonctionner). Un jeton invalide ou un flux inactif renvoie **404** sans détail.
- Aucune donnée personnelle superflue dans les flux.

---

## 6. Modèle de données

Noms de collections indicatifs, à aligner sur les conventions du projet.

### 6.1 Global `reglages-hub`

| Champ | Défaut | Description |
|---|---|---|
| `fuseau` | `Europe/Brussels` | fuseau d'affichage et de calcul |
| `dureeMatchMinutes` | 75 | durée par défaut d'un match |
| `delaiRdvMatchMinutes` | 45 | heure de rendez-vous par défaut, avant le coup d'envoi |
| `dureeEntrainementMinutes` | 90 | durée par défaut d'un entraînement |
| `heureRappelMatin` | `09:00` | rappel du jour |
| `delaiRappelAvantMinutes` | 60 | rappel avant l'événement |
| `nomClubAffichage` | `UD Asturiana` | nom utilisé dans les titres et légendes |
| `motifReconnaissanceClub` | `ASTURIANA` | pour détecter domicile / extérieur dans les matchs LFFS |

### 6.2 Collection `flux`

| Champ | Type | Description |
|---|---|---|
| `nom` | texte | ex. « Joueurs » |
| `slug` | texte unique | ex. `joueurs` |
| `description` | texte | affichée sur la page d'abonnement |
| `couleur` | couleur | utilisée dans le Hub |
| `emoji` | texte court | préfixe facultatif des titres dans le flux |
| `token` | texte, généré | jeton secret, non modifiable à la main, bouton « Régénérer » |
| `actif` | booléen | flux inactif = 404 |
| `alertes` | booléen | inclure les alertes (VALARM) dans le flux iCal |
| `options` | groupe de booléens | `afficherResponsables`, `afficherStatut`, `afficherReseauxFormat`, `afficherLegende`, `afficherLienVisuels`, `afficherHeureRdv`, `afficherLienHub` |

Dans l'admin Payload, chaque flux affiche : l'URL du flux, l'URL de la page d'abonnement, le **QR code** de la page d'abonnement (téléchargeable en PNG et SVG).

**Données initiales** :

| Flux | Alertes | Options activées |
|---|---|---|
| Joueurs | non | heure RDV |
| Comité | non | responsables, statut, réseaux / format, heure RDV, lien Hub |
| Social | oui | responsables, statut, réseaux / format, légende, lien visuels, lien Hub |

### 6.3 Collection `types-evenement`

| Champ | Type | Description |
|---|---|---|
| `nom` | texte | ex. « Post » |
| `categorie` | select | `post`, `match`, `entrainement`, `autre` : détermine les champs affichés dans le formulaire |
| `couleur` | couleur | couleur dans le calendrier |
| `emoji` | texte court | facultatif |
| `fluxParDefaut` | relation multiple → Flux | pré-cochés à la création, modifiables |
| `ordre` | nombre | ordre d'affichage |

**Données initiales** : Post (post → Social), Match (match → Joueurs, Comité, Social), Entraînement (entrainement → Joueurs), Réunion (autre → Comité), Deadline (autre → Comité).

### 6.4 Collections `reseaux` et `formats`

Listes gérables dans l'admin : `nom`, `icone` facultative, `actif`, `ordre`.
Données initiales réseaux : Instagram, TikTok, Facebook, YouTube.
Données initiales formats : Post, Carrousel, Reel, Story, Live.

### 6.5 Collection `evenements`

**Champs communs**

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `titre` | texte | oui | |
| `type` | relation → types-evenement | oui | |
| `debut` | date-heure | oui | stockée en UTC |
| `fin` | date-heure | non | si absente : durée par défaut selon la catégorie, sinon 1 h |
| `journeeEntiere` | booléen | non | |
| `lieuNom` | texte | non | |
| `lieuAdresse` | texte | non | lien Google Maps / Apple Plans généré à l'affichage |
| `heureRdv` | date-heure | non | catégories match et entrainement uniquement |
| `flux` | relation multiple → Flux | oui, au moins un | |
| `responsables` | relation multiple → Users | non | |
| `description` | texte enrichi | non | visible dans les flux |
| `notesInternes` | texte enrichi | non | Hub uniquement, jamais dans les flux |
| `annule` | booléen | non | affiché barré dans le Hub, préfixe « ❌ ANNULÉ » dans les flux |
| `pasDeRappel` | booléen | non | désactive les rappels push et les alertes iCal pour cet événement |
| `recurrence` | groupe | non | voir 7.4 |
| `creePar` | relation → Users | auto | |

**Champs de catégorie `post`**

| Champ | Type | Description |
|---|---|---|
| `reseaux` | relation multiple → reseaux | |
| `format` | relation multiple → formats | plusieurs formats possibles, ex. Story et Repost en story |
| `statut` | select | `a-creer` (défaut), `pret`, `publie`, `annule` |
| `legende` | texte long | texte à copier-coller, bouton « Copier » dans le Hub |
| `lienVisuels` | URL | lien Drive ou autre |
| `visuels` | upload multiple | collection média existante |
| `lienPublication` | URL | une fois publié |
| `vues` | nombre | relevé manuel |
| `matchLie` | relation → evenements (catégorie match) | |
| `modele` | relation → modeles-post | renseigné si généré |
| `dateModifieeManuellement` | booléen, système | passe à vrai si un utilisateur change `debut` d'un post généré |
| `legendeModifieeManuellement` | booléen, système | passe à vrai si un utilisateur modifie `legende` d'un post généré |

**Champs de catégorie `match`**

| Champ | Type | Description |
|---|---|---|
| `source` | select | `lffs` ou `manuel` |
| `matchLffs` | relation → Matches | si source `lffs` |
| `lffsId` | nombre, indexé unique si renseigné | clé de synchronisation |
| `adversaire` | texte | |
| `domicile` | booléen | |
| `competition` | texte | ex. « P3C », « Coupe », « Amical » |
| `score` | texte, lecture seule | repris de Matches pour les matchs LFFS |

Pour un match `lffs`, les champs `titre`, `debut`, `fin`, `lieuNom`, `lieuAdresse`, `adversaire`, `domicile`, `competition` sont **verrouillés** dans le Hub (affichés avec une icône cadenas et la mention « Synchronisé LFFS »). Les autres champs restent modifiables.

### 6.6 Collection `modeles-post`

| Champ | Type | Description |
|---|---|---|
| `nom` | texte | ex. « Annonce » |
| `actif` | booléen | |
| `appliquerA` | select | `domicile`, `exterieur`, `les-deux` |
| `decalageJours` | nombre entier | ex. -2, 0, 1 |
| `modeHeure` | select | `heure-fixe` ou `relatif-coup-envoi` |
| `heureFixe` | `HH:mm` | si `heure-fixe` |
| `decalageMinutes` | nombre | si `relatif-coup-envoi`, ex. -120 |
| `titreModele` | texte avec variables | ex. `Annonce vs {adversaire}` |
| `reseaux` | relation multiple | |
| `format` | relation multiple | |
| `flux` | relation multiple | défaut : Social |
| `responsables` | relation multiple → Users | facultatif |
| `instructions` | texte enrichi avec variables | copié dans `description` |
| `legendeModele` | texte long avec variables | |

**Variables disponibles** : `{adversaire}`, `{date}` (ex. « mercredi 16 septembre »), `{date_courte}` (ex. « 16/09/2026 »), `{heure}` (format **22h00**), `{heure_rdv}`, `{salle}`, `{adresse}`, `{domicile_exterieur}` (« à domicile » / « à l'extérieur »), `{competition}`, `{score}` (vide tant que non disponible), `{lien_live}`, `{lien_replay}`.

Convention du club pour les légendes de match : heure au format `22h00` et emoji `📍` devant le lieu.

**Données initiales** (modifiables) :

| Modèle | Décalage | Heure |
|---|---|---|
| Annonce | J-2 | 18h00 |
| Jour J | J | 10h00 |
| Résultat | J+1 | 12h00 |

### 6.7 Collection `idees`

| Champ | Type | Description |
|---|---|---|
| `titre` | texte | |
| `description` | texte enrichi | |
| `reseaux` | relation multiple | facultatif |
| `format` | relation | facultatif |
| `lienInspiration` | URL | facultatif |
| `matchLie` | relation → evenements | facultatif |
| `statut` | select | `nouvelle`, `retenue`, `ecartee` |
| `auteur` | relation → Users | auto |
| `postPlanifie` | relation → evenements | renseigné par « Planifier » |
| `votes` | relation multiple → Users | un vote par utilisateur, indicatif, sans effet sur le statut |

### 6.8 Collection `commentaires`

| Champ | Type | Description |
|---|---|---|
| `cible` | relation polymorphe → evenements ou idees | |
| `auteur` | relation → Users | auto |
| `contenu` | texte | |
| `creeLe` | date | auto |

Un auteur peut modifier ou supprimer son commentaire. Un administrateur peut supprimer tout commentaire.

### 6.9 Collections techniques

**`abonnements-push`** : `utilisateur`, `endpoint` (unique), `cles` (p256dh, auth), `userAgent`, `creeLe`, `dernierSucces`.

**`journal-notifications`** : `evenement`, `occurrence` (date de l'occurrence pour les récurrences), `typeRappel` (`matin`, `avant`), `utilisateur`, `envoyeLe`, `resultat`. **Index unique** sur (`evenement`, `occurrence`, `typeRappel`, `utilisateur`) pour garantir qu'aucun rappel n'est envoyé deux fois, même si plusieurs instances tournent.

---

## 7. Module Calendrier

### 7.1 Vues

- **Mois**, **Semaine**, **Liste** (liste par défaut sur mobile, mois par défaut sur écran large).
- Locale française, semaine commençant le lundi, format 24 h.
- Couleur d'un événement : couleur du **type**. Pastille ou bordure de la couleur du **flux** principal.
- Posts : icône du statut (🔴 à créer, 🟠 prêt, 🟢 publié), format et réseaux visibles dans le détail.
- Matchs annulés et événements annulés : barrés, opacité réduite.
- **Filtres** combinables et mémorisés par utilisateur (localStorage) : type, flux, responsable, « mes événements ».
- Clic sur un créneau vide (droit édition) : création pré-remplie à cette date et heure.
- Clic sur un événement : panneau de détail (feuille latérale sur desktop, plein écran sur mobile) avec bouton « Modifier ».

### 7.2 Vue « À faire »

- Posts dont le statut est `a-creer` ou `pret`, triés par date de publication.
- **Retards** en rouge en tête de liste : date passée et statut ni `publie` ni `annule`.
- Filtre « Mes posts » (où je suis responsable).
- Actions rapides : changer le statut, copier la légende, ouvrir le lien des visuels.

### 7.3 Création et édition

- Formulaire unique dont les sections s'adaptent à la **catégorie** du type choisi.
- Changement de type : pré-cochage des flux par défaut du nouveau type, uniquement si l'utilisateur n'a pas encore modifié les flux.
- Validation : titre, type, début et au moins un flux obligatoires ; fin postérieure au début.
- **Glisser-déposer** et redimensionnement dans les vues mois / semaine (droit édition) : confirmation par toast avec bouton « Annuler ». Interdit pour les matchs LFFS et les événements récurrents (en V1).
- Déplacer un post généré à la main met `dateModifieeManuellement` à vrai.
- Suppression : confirmation. Un match LFFS ne peut pas être supprimé depuis le Hub.
- Commentaires en bas du détail de l'événement.

### 7.4 Récurrence

Volontairement simple en V1 :

- `frequence` : aucune, hebdomadaire, mensuelle
- `intervalle` : toutes les N semaines / mois
- `joursSemaine` : pour l'hebdomadaire
- `finRecurrence` : date de fin (obligatoire si récurrence, pour borner le calcul)
- Pas d'exception ni de modification d'une seule occurrence en V1 : on modifie la **série entière**.
- Expansion des occurrences côté serveur pour l'affichage et les rappels ; règle `RRULE` dans les flux iCal.

---

## 8. Matchs

### 8.1 Synchronisation LFFS

La logique exacte dépend du résultat de l'audit (point 3). Principes non négociables :

- Un événement Match LFFS est rattaché à son match par **`lffs_id`**, **jamais par la date**.
- **Création** : un match Matches avec une date génère un événement Match (source `lffs`).
- **Modification** (date, heure, salle, adversaire, score) : mise à jour de l'événement, puis décalage des posts liés (8.3).
- **Annulation** : l'événement passe à `annule = true` **uniquement si le match est réellement supprimé** de la collection Matches. Un changement de date n'est jamais une annulation. Les posts liés non publiés passent en statut `annule`.
- Si l'import LFFS supprime puis recrée les documents, la synchronisation doit se baser sur `lffs_id` et une réconciliation différée pour ne pas interpréter une recréation comme une annulation. Proposer la solution après l'audit.
- **Matchs sans date** : ignorés tant qu'ils ne sont pas datés.
- Mise en œuvre : hooks Payload sur Matches **et** job de **réconciliation quotidienne** idempotent (rattrape tout hook manqué). Les deux utilisent la même fonction de synchronisation.

**Construction de l'événement**

- `titre` : `{nomClubAffichage} vs {adversaire}` à domicile, `{adversaire} vs {nomClubAffichage}` à l'extérieur. Utiliser les noms d'affichage du site si l'audit en trouve.
- `debut` : combinaison de la date et de l'heure LFFS **interprétées dans le fuseau Europe/Brussels**. Attention : la date LFFS est stockée sous la forme `2026-09-02T00:00:00.000Z` et l'heure séparément (`22:00:00`). Ne pas appliquer de conversion qui décalerait le jour. Test obligatoire, y compris autour des changements d'heure d'été / hiver.
- `fin` : `debut + dureeMatchMinutes`.
- `heureRdv` : `debut - delaiRdvMatchMinutes`, modifiable ensuite (la modification manuelle n'est pas écrasée par la synchro, sauf si la date du match change : dans ce cas l'écart manuel est conservé).
- `lieuNom` : salle LFFS.
- `flux` : flux par défaut du type Match.
- `description` : compétition, et lien live si disponible.

### 8.2 Matchs manuels (amicaux, tournois)

- Créés depuis le Hub avec le type Match et `source = manuel`.
- Entièrement modifiables.
- **Aucun post généré**.
- Flux par défaut : **Joueurs** uniquement (au lieu des flux par défaut du type).
- **Jamais** écrits dans la collection Matches ni affichés sur le site public.

### 8.3 Génération des posts

- À la création d'un événement Match LFFS : un post est créé pour **chaque modèle actif** dont `appliquerA` correspond (domicile / extérieur).
- Date du post : date du match + `decalageJours`, à `heureFixe` ou au coup d'envoi + `decalageMinutes`.
- `titre`, `description`, `legende` : rendus depuis les modèles avec les variables.
- **Match déplacé** : les posts liés sont recalculés **sauf** ceux dont `dateModifieeManuellement` est vrai ou dont le statut est `publie` ou `annule`.
- **Mise à jour des textes** (score disponible, salle modifiée…) : `legende` et `titre` sont re-rendus **sauf** si `legendeModifieeManuellement` est vrai.
- Idempotence : jamais deux posts pour le même couple (match, modèle).
- Bouton **« Regénérer les posts »** sur un match (droit édition) : crée les posts manquants pour les modèles actifs, sans toucher aux posts existants. Option cochable « Réinitialiser aussi les posts non publiés ».
- Ajouter ou modifier un modèle n'affecte pas les posts existants, sauf via le bouton ci-dessus.

---

## 9. Flux iCal

### 9.1 Route

`GET /api/hub/flux/[token].ics`

- `Content-Type: text/calendar; charset=utf-8`
- `Cache-Control: public, max-age=300`
- `X-Robots-Tag: noindex`
- Jeton invalide ou flux inactif : 404.
- Limitation de débit raisonnable par IP.
- Librairie : `ical-generator` (ou équivalent validé à l'audit).

### 9.2 Contenu

- Nom du calendrier : `UDA · {nom du flux}` et `X-WR-CALNAME`, fuseau `Europe/Brussels`.
- Événements : ceux qui appartiennent au flux, de **J-90** à la fin de la saison active (ou J+365 à défaut).
- **UID stable** par événement **et** par flux : `{idEvenement}-{slugFlux}@udasturiana.be`. Indispensable pour qu'un déplacement mette à jour l'événement au lieu de créer un doublon.
- `SEQUENCE` / `LAST-MODIFIED` alimentés depuis la date de mise à jour.
- Récurrence : `RRULE`.
- Événement annulé : conservé avec `STATUS:CANCELLED` et titre préfixé « ❌ ANNULÉ ».
- `LOCATION` : lieu + adresse.

**Titre** : `{emoji du flux si défini}` + titre. Pour un post, si `afficherStatut` et / ou `afficherReseauxFormat` : `🔴 Reel · Annonce vs POH ACTION`.

**Description** (selon les options du flux, dans cet ordre) :

1. Heure de rendez-vous (`afficherHeureRdv`) : « RDV : 21h15 »
2. Description de l'événement
3. Réseaux et format (`afficherReseauxFormat`)
4. Statut (`afficherStatut`)
5. Responsables (`afficherResponsables`) : prénoms uniquement
6. Lien des visuels (`afficherLienVisuels`)
7. Légende (`afficherLegende`)
8. Lien vers l'événement dans le Hub (`afficherLienHub`)

Les **notes internes ne sont jamais incluses**, quel que soit le flux.

### 9.3 Alertes

Si `alertes` est actif sur le flux et `pasDeRappel` est faux :

- une alerte à `heureRappelMatin` le jour même (déclencheur absolu)
- une alerte `delaiRappelAvantMinutes` avant le début (déclencheur relatif)
- si le début est avant `heureRappelMatin + 1 h`, seule l'alerte « avant » est incluse
- événement en journée entière : seule l'alerte du matin
- les alertes ne tiennent pas compte du statut (limite du format iCal), contrairement aux push

---

## 10. Pages d'abonnement et QR codes

Route publique à jeton : `/abonnement/[token]` (noindex).

Contenu :

- Logo du club, nom et description du flux.
- Détection de l'appareil :
  - **iPhone / iPad / Mac** : bouton principal « Ajouter à Calendrier » (lien `webcal://…/api/hub/flux/[token].ics`), et rappel de **décocher « Supprimer les alertes »** si le flux contient des alertes.
  - **Android** : bouton principal « Ajouter à Google Agenda » (lien d'abonnement Google avec l'URL du flux), avec une courte explication si l'ajout passe par le navigateur.
  - **Autre** : les deux boutons.
- Bouton « Copier le lien » (URL https du flux) pour les cas particuliers.
- Mention : « Ce calendrier se met à jour automatiquement. Il est en lecture seule. »

**QR codes** : générés côté serveur (librairie `qrcode` ou équivalent) vers la page d'abonnement, affichés dans l'admin Payload de chaque flux, téléchargeables en PNG et SVG, avec le logo du club au centre si la lisibilité le permet.

---

## 11. Idées

- Vue **board** en trois colonnes : Nouvelle, Retenue, Écartée. Glisser-déposer entre colonnes (droit édition). Sur mobile : onglets par colonne.
- Tri dans une colonne : par votes ou par date.
- **Ticket** : titre, description, réseaux et format envisagés, lien d'inspiration (aperçu du lien si simple à obtenir), match lié, auteur, date, compteur de votes, commentaires.
- **Vote** : bouton 👍 bascule, un par utilisateur, visible par tous, purement indicatif.
- Bouton **« Planifier »** (droit édition) : ouvre le formulaire de création d'un post pré-rempli (titre, description, réseaux, format, match lié). À l'enregistrement, le ticket passe en `retenue` et `postPlanifie` est renseigné. Le ticket affiche un lien vers le post.
- Création rapide d'une idée depuis un bouton flottant sur mobile.

---

## 12. PWA et notifications push

### 12.1 PWA

- `manifest` : nom « Hub UDA », icônes générées depuis le blason du club, couleurs du thème, `start_url: /hub`, `scope: /hub`, affichage `standalone`.
- Service worker limité au scope `/hub` : réception et affichage des notifications, clic qui ouvre l'événement concerné. Pas de cache hors ligne complexe en V1.
- Encart d'installation dans `/hub/profil` et au premier passage sur `/hub` :
  - iPhone : « Partager, puis Sur l'écran d'accueil », avec explication que les notifications ne fonctionnent qu'après cette étape.
  - Android / desktop : bouton d'installation natif si disponible.

### 12.2 Abonnement push

- Dans `/hub/profil` : activer / désactiver les notifications sur **cet appareil**, choisir les flux notifiés (parmi les flux autorisés), bouton « Envoyer une notification de test ».
- Librairie `web-push` avec clés VAPID en variables d'environnement.
- Plusieurs appareils par utilisateur. Abonnement supprimé automatiquement si le service push répond 404 ou 410.

### 12.3 Règles des rappels

Destinataires : utilisateurs avec `accesHub`, `pushActif`, ayant au moins un flux de l'événement dans `fluxNotifies`, et au moins un abonnement push.

Déclenchement :

- **Rappel du matin** : le jour de l'événement à `heureRappelMatin`.
- **Rappel avant** : `delaiRappelAvantMinutes` avant le début.
- Si le début est avant `heureRappelMatin + 1 h` : uniquement le rappel avant.
- Journée entière : uniquement le rappel du matin.

Pas d'envoi si :

- `pasDeRappel` est vrai
- l'événement est annulé
- c'est un post au statut `publie` ou `annule`

Contenu :

- Titre : « À publier aujourd'hui » (matin) ou « À publier dans 1 h » (avant) pour les posts ; « Aujourd'hui » / « Dans 1 h » pour les autres catégories.
- Corps : titre de l'événement, heure, format et réseaux pour un post.
- Clic : ouvre l'événement dans le Hub.

### 12.4 Job d'envoi

- Job Payload exécuté **toutes les 5 minutes**.
- Sélectionne les rappels dont l'heure est comprise entre `maintenant - 10 min` et `maintenant` (tolérance en cas de redémarrage), occurrences de récurrence comprises.
- Insère d'abord dans `journal-notifications` (index unique), n'envoie que si l'insertion réussit : aucun doublon possible, même avec plusieurs instances.
- Journalise les erreurs d'envoi sans bloquer les autres destinataires.

---

## 13. Interface et identité visuelle

- **Mobile d'abord** : navigation basse sur mobile (Calendrier, À faire, Idées, Profil), barre latérale sur desktop.
- Reprendre les **tokens de couleurs et polices existants du site** relevés à l'audit. Identité du club : fond **navy sombre** avec dégradés, accents **cyan** et **or**, titres en **majuscules grasses**. Créer des teintes adjointes (niveaux de gris bleutés, états hover, succès / alerte / erreur) cohérentes avec cette base si nécessaire.
- Thème sombre par défaut. Contrastes conformes WCAG AA.
- Composants **shadcn/ui** existants en priorité.
- États vides, chargements (skeletons) et erreurs soignés et en français.
- Toasts pour confirmer les actions.
- Formats : dates « mercredi 16 septembre 2026 », heures « 22h00 ».
- Aucun tiret cadratin dans les textes.

---

## 14. Stack et librairies

| Besoin | Choix | Remarque |
|---|---|---|
| Calendrier | **FullCalendar v7** via le registre shadcn officiel | plugins standard uniquement (daygrid, timegrid, list, interaction, récurrence). Aucun plugin premium. Vérifier la stabilité à l'audit |
| Board idées | **dnd-kit** + composants shadcn | ou composant Kanban compatible shadcn si plus adapté, à justifier |
| Flux iCal | `ical-generator` | |
| Dates et fuseaux | librairie déjà utilisée par le projet, sinon `date-fns` + `date-fns-tz` | tout calcul de fuseau centralisé dans un seul module |
| Push | `web-push` | clés VAPID |
| QR codes | `qrcode` | |
| Jobs | file de jobs Payload | compatible PM2 |
| Formulaires | conventions du projet (ex. react-hook-form + zod) | |
| Tests | runner existant, sinon **Vitest** | |

Toute nouvelle dépendance doit être justifiée brièvement dans le résumé du lot.

**Variables d'environnement à ajouter** (documentées dans `.env.example`) : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `HUB_BASE_URL`, et toute autre nécessaire.

---

## 15. Performance

- Requêtes des vues calendrier bornées à la plage affichée.
- Index sur `evenements.debut`, `evenements.lffsId`, relations de flux.
- Génération du flux iCal en moins d'une seconde pour une saison complète.

---

## 16. Tests

Tests automatisés obligatoires :

1. **Dates LFFS** : combinaison date + heure sans décalage de jour, y compris autour des passages heure d'été / hiver.
2. **Synchronisation** : création, mise à jour, déplacement (jamais d'annulation), suppression (annulation), match sans date ignoré, idempotence de la réconciliation.
3. **Posts générés** : un post par modèle, filtre domicile / extérieur, décalage lors d'un déplacement, respect de `dateModifieeManuellement`, `legendeModifieeManuellement`, statuts `publie` / `annule`, rendu des variables (format `22h00`).
4. **Flux iCal** : UID stables par flux, contenu conforme aux options, **notes internes jamais présentes**, RRULE, VALARM selon les règles, événement annulé, jeton invalide = 404.
5. **Rappels** : calcul des heures, règle du rappel du matin avant 10h, exclusions (publié, annulé, pas de rappel), destinataires selon flux notifiés, déduplication via le journal.
6. **Droits** : routes `/hub` sans session ou sans accès, lecture vs édition, filtrage des événements par flux autorisés, collections non lisibles via l'API publique.

Recommandé si le coût reste raisonnable : un test end-to-end (Playwright) de connexion, création d'un post et apparition dans le flux iCal.

---

## 17. Lots et critères d'acceptation

### Lot 0 : Audit
- Rapport complet (section 3), écarts et questions listés.
- **Aucune modification de code.**

### Lot 1 : Fondations
- Registre de modules, layout `/hub`, navigation, page d'accueil.
- Connexion `/hub/connexion`, lien « Connexion » dans le footer, redirections.
- Champs Users, règles de droits côté serveur et access control Payload.
- Collections et global de la section 6 avec migrations et **données initiales** (flux, types, réseaux, formats, modèles).
- Thème du Hub aligné sur l'identité du site.
- Tests de droits.
- **Acceptation** : un utilisateur sans `accesHub` est refusé ; un utilisateur en lecture ne peut rien modifier ; les nouvelles collections ne sont pas lisibles via `/api` sans session.

### Lot 2 : Calendrier
- Vues mois / semaine / liste, filtres, détail, création, édition, suppression, glisser-déposer, récurrence, commentaires, vue « À faire ».
- **Acceptation** : créer un post depuis mobile en moins d'une minute ; un utilisateur ne voit que les événements de ses flux ; les retards apparaissent en rouge.

### Lot 3 : Flux iCal et abonnements
- Route iCal, options par flux, alertes, pages d'abonnement, QR codes dans l'admin, régénération de jeton.
- Tests des flux.
- **Acceptation** : abonnement réussi sur iPhone (Calendrier) et Android (Google Agenda) ; un événement déplacé est mis à jour sans doublon ; un jeton régénéré invalide l'ancien lien.

### Lot 4 : Matchs et modèles
- Synchronisation LFFS (hooks + réconciliation), matchs manuels, génération et mise à jour des posts, bouton « Regénérer ».
- Tests de synchronisation et de génération.
- **Acceptation** : les matchs de la saison active apparaissent avec leurs posts ; déplacer un match dans Matches décale les posts non modifiés ; supprimer un match l'annule ; un amical manuel n'apparaît que dans le calendrier, sans post.

### Lot 5 : Idées
- Board, tickets, votes, commentaires, « Planifier ».
- **Acceptation** : une idée planifiée crée un post pré-rempli et passe en « Retenue ».

### Lot 6 : PWA et notifications
- Manifest, service worker, encart d'installation, abonnement push dans le profil, notification de test, job d'envoi et journal.
- Tests des rappels.
- **Acceptation** : sur un iPhone avec le Hub installé, la notification de test arrive ; un post prévu à 14h génère un rappel à 9h et à 13h ; un post passé en « publié » ne génère plus de push.

### Fin de projet
- Documentation courte `docs/hub.md` : ajouter un utilisateur et ses droits, créer un flux et partager son QR, gérer les modèles, variables d'environnement, jobs, déploiement.

---

## 18. Journal des décisions

| Sujet | Décision |
|---|---|
| Publication | Pas de publication automatique, planification et rappels uniquement |
| Tags | Supprimés, remplacés par types et flux |
| Sponsors | Pas de suivi en V1 |
| Flux | Sélection directe des flux sur chaque événement |
| Diffusion | Un lien et un QR par flux, envoyés aux personnes concernées, pas de page publique listant les flux |
| Android | Abonnement Google Agenda à l'URL iCal (lenteur de mise à jour acceptée) |
| Rappels joueurs | Gérés hors projet (WhatsApp) |
| Notifications | Push via le Hub + alertes iCal (pôle social sur iPhone), rappels à 9h et 1 h avant, pas de récap quotidien |
| Destinataires push | Utilisateurs abonnés aux flux concernés via leur profil |
| Matchs amicaux | Calendrier uniquement, flux Joueurs, pas de posts, pas sur le site |
| Match supprimé | Annulé, pas effacé ; un déplacement n'est jamais une annulation |
| Espace | `/hub` dans l'application existante, comptes Payload, droits lecture / édition par module |
| Idées | Tickets en board, votes indicatifs, commentaires |
| Langue | Français uniquement |
| Thème | Identité visuelle actuelle du site |
| Hébergement (15/09/2026) | Vercel. L import LFFS et les jobs du Hub sont déclenchés par un cron externe sur des routes protégées par `CRON_SECRET`, pas de processus long ni d `autoRun` |
| Base de données (15/09/2026) | Une seule base pour le dev et la prod. Schéma par migrations Payload, synchronisation automatique désactivée. Le CLI Payload démarre depuis le passage du paquet en ESM (`"type": "module"`) |
| API REST (15/09/2026) | Lecture des collections du site réservée aux utilisateurs connectés, sauf Media (images du site). Le site public passe par l API locale et `/api/public` |
| Session (15/09/2026) | Jeton de 7 jours renouvelé à chaque visite du Hub, cookie `secure` en production, verrouillage Payload après 5 échecs conservé |
| Match retiré du flux LFFS (15/09/2026) | Rien à faire, cas jugé improbable. Seule une suppression manuelle dans l admin annule un match |
| Nom du club (15/09/2026) | Domicile / extérieur et nom affiché tirés de la collection Équipes (`is_club`, `name`). Le motif du global ne sert que de repli |
| Adresse des salles (15/09/2026) | Résolue depuis la collection Salles via `venue_id` |
| Texte enrichi (15/09/2026) | Lexical, éditeur du projet, pour description, notes internes et instructions |
| Tests (15/09/2026) | Vitest |
| Fuseaux (15/09/2026) | `@date-fns/tz`, compagnon de date-fns 4 déjà présent, dans un module unique |
| Nommage (15/09/2026) | Slugs et champs des nouvelles collections en anglais snake_case comme l existant, libellés d interface en français |
| Calendrier (15/09/2026) | FullCalendar 7.1 via le registre shadcn officiel, thème Monarch, vérifié en début de Lot 2 |
| Branche (15/09/2026) | `feat/hub`, créée depuis `feat/payload-migration`, la branche déployée en production |
| Saisie du texte enrichi (16/09/2026) | Le Hub saisit description, notes et instructions en texte simple, stocke en paragraphes Lexical, et relit tout Lexical en texte brut. La mise en forme riche reste possible depuis l admin |
| Calendrier (16/09/2026) | FullCalendar 7.1 en place via le registre shadcn, vues mois, semaine et liste, fuseau du navigateur. Couleur du type sur l evenement, la couleur du flux est dans le panneau de detail |
| Flux iCal (16/09/2026) | Route `/api/hub/flux/[token].ics` par ical-generator. Dates en TZID Europe/Brussels sans bloc VTIMEZONE, ce que Calendrier et Google Agenda lisent. Alertes exprimees par rapport au debut, pour valoir sur chaque occurrence d une recurrence. UID `{id}-{slug}@udasturiana.be` |
| Adresse publique (16/09/2026) | `HUB_BASE_URL`, sinon l adresse du site, pour les liens des flux, les pages d abonnement et les QR codes. Un lien vers un evenement ouvre le calendrier sur son panneau |
| Mobile (16/09/2026) | Lot 3 valide. Vue Mois par defaut sur telephone comme sur ordinateur, en-tete des jours non collant en vue semaine, titre de page reserve aux lecteurs d ecran (la barre du haut nomme deja la page). Le profil se rejoint par le menu du bloc utilisateur, en bas de la barre laterale, avec la deconnexion |
| Synchronisation des matchs (16/09/2026) | Une fonction unique, `synchroniserMatch`, appelee par les crochets de la collection Matchs dans la transaction du match (sinon le lien vers un match pas encore valide serait refuse) et par la route `/api/hub/synchro-matchs` protegee par `CRON_SECRET`, a appeler une fois par jour apres l import. Un echec de crochet est consigne sans faire echouer l import LFFS, la reconciliation rattrape. Seuls les matchs dates de la saison active comptent ; un match sans heure tient la journee entiere ; le match d essai est ignore |
| Match supprime puis recree (16/09/2026) | L import LFFS ne supprime jamais, il met a jour par `lffs_id` : seule une suppression dans l admin annule l evenement et ses posts non publies. Si l import recree le match, l evenement revient et les posts que la synchro avait annules aussi |
| Posts generes (16/09/2026) | Un post par modele actif et par match, rattache par `linked_match` et `template`, jamais en double. Le flux du modele, sinon Social. La synchro ne reecrit que ce qui change, pour ne pas bouger la version des calendriers abonnes. « Regenerer » sans option cree les manquants sans rien toucher ; avec l option, les posts non publies repartent du modele, statut compris |
| Legendes des modeles (16/09/2026) | Textes de Bryan : Annonce « PROCHAIN MATCH 💛💙 » avec date numerique, heure, adresse et adversaire ; Jour J « MATCHDAY ⚔️ » avec adversaire, adresse et heure. Le modele Resultat reste actif comme rappel a J+1, sans legende : Bryan la genere a part apres chaque match. Variable `{date_courte}` ajoutee pour la date en 16/09/2026 |
| Formats multiples (16/09/2026) | Un post et un modele peuvent avoir plusieurs formats (migration `formats_multiples`, le format deja choisi est recopie). Format « Repost en story » ajoute aux cinq de depart. Les posts generes tiennent 30 minutes dans le calendrier, la fin suit la date |
| Lot 4 valide (16/09/2026) | Verifie sur les 26 matchs de la saison et sur un faux match joue devant Bryan : creation, deplacement des posts, annulation a la suppression. Un vrai match ne se supprime jamais dans l admin pour un essai : la base est celle du site |

---

## 19. Évolutions envisagées (hors V1)

- Module **Matchs & stats** dans le Hub (scores, statistiques joueurs, feuilles de match).
- Synchronisation directe vers un Google Agenda par flux via l'API, si la lenteur de l'abonnement Android pose problème.
- Modification d'une seule occurrence d'une récurrence.
- Suivi des sponsors mis en avant et rapport de visibilité par sponsor.
- Statistiques de publication (vues mensuelles) et export pour les dossiers sponsors.
- Duplication d'événements, calendrier imprimable.
