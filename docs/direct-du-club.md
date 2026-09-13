# Le direct du club

Comment le match en direct arrive sur le site, ce qui le regle, et ce qui a ete
decouvert en route. Ce document existe parce que l'essentiel de ce dispositif
repose sur une API qui n'est pas documentee publiquement : sans ces notes, la
prochaine panne demanderait de tout retrouver.

## L'accord

La diffusion passe par le cloud XbotGo, avec l'accord de la marque. La
contrepartie est que leur filigrane reste visible : il est incruste dans le flux
lui-meme, le site n'a donc rien a faire pour le respecter, et rien ne doit venir
le recouvrir.

## Ce qui se regle, et ou

Dans **Parametres** de l'administration :

- **Salle de diffusion XbotGo** : le lien de la salle du club, tel qu'il apparait
  dans leur application. Il ne change jamais, il se colle une seule fois et sert
  a toutes les rencontres. Ce qui compte dedans est le parametre `userId`, qui
  est l'identifiant de salle encode en base64.
- **Verifier le direct XbotGo maintenant** : ouvre la verification en dehors de
  la fenetre du match, le temps d'un essai en arrivant sur place. Sans effet sur
  YouTube. A decocher ensuite.
- **Webhook du rapport de diffusion** : ou envoyer le compte rendu d'audience a
  la fin de chaque direct.

Sur un **match** precis, le champ **Lien Live** l'emporte sur la salle des
parametres. Il sert a la rencontre exceptionnelle diffusee ailleurs : un lien
YouTube y est lu et joue dans le lecteur du site, un lien vers autre chose
devient un simple bouton sortant.

## La fenetre

Le site n'interroge le diffuseur qu'entre un quart d'heure avant le coup d'envoi
et soixante-dix minutes apres. Hors de la, aucun appel. Le bandeau du direct est
le seul composant a interroger la route, et la route lui dit elle-meme dans
combien de temps revenir : quarante-cinq secondes pendant la rencontre, cinq
minutes a l'approche, une heure le reste du temps.

## Leur API

    GET https://cloud.xbotgo.net/api/core/api/live/room/user/task/detail/{roomId}

Avec l'en-tete **`DATA-REGION: EU`**, sans quoi elle repond
`ERR_REGION_NOT_EXIST`. Leur application le derive du parametre `region` de
l'adresse de la salle.

Ce qui en est lu : `playState` valant 1 quand la salle diffuse, `liveTitle`, et
`livePlayUrl`, une chaine JSON imbriquee qui contient `hlsPlayUrl`.

Trois choses a savoir :

- **Le flux repond meme quand la salle porte un mot de passe.** Celui-ci protege
  leur page, pas la diffusion.
- **L'adresse HLS est signee et datee.** Elle change a chaque interrogation et
  finit par etre refusee. Le lecteur s'abonne donc a l'adresse fraiche et se
  rebranche tout seul quand la sienne est refusee, trois fois avant de rendre la
  main au visiteur.
- **Leur memoire tampon fait douze secondes** (trois segments de quatre). Il n'y
  a donc pas de retour arriere possible, et aucune barre de progression n'est
  affichee.

### Leurs segments portent l'heure reelle

Le `#EXT-X-MEDIA-SEQUENCE` de leur manifeste **est** l'horloge unix. Releve a
17h28 heure belge le 2 septembre 2026, il valait `1788362880`, soit exactement
`2026-09-02 15:28:00 UTC`, et il est aligne sur la grille de quatre secondes.

Leur manifeste ne porte pas `EXT-X-PROGRAM-DATE-TIME`, l'etiquette standard qui
dirait la meme chose. La lecture se fait donc sur le numero de segment :

    seconde reelle affichee = frag.sn + (currentTime - frag.start)

C'est ce qui permettra a un tableau de score maison de s'afficher au bon moment
pour chaque spectateur, quel que soit son retard.

## Le replay

Le flux ne survit pas a la rencontre, son adresse expire. Le replay vient donc de
la mise en ligne de l'enregistrement sur la chaine YouTube du club, et le champ
**Lien Replay** se remplit tout seul : un rattrapage quotidien lit les dernieres
mises en ligne et les rapproche des rencontres jouees.

Deux signaux sont exiges ensemble, le nom de l'adversaire et soit la date ecrite
dans le titre, soit une mise en ligne dans les trois semaines. Une date dans le
titre leve toute ambiguite, y compris entre l'aller et le retour. Les cas du
rapprochement s'executent par `pnpm test:replays`.

## Le comptage des spectateurs

Le compteur est le notre. Celui du diffuseur compte les gens sur leur page, qui
est vide depuis que le match se regarde ici.

Le lecteur envoie un signe de vie toutes les quarante-cinq secondes ; un
spectateur compte comme present tant que son dernier signe a moins de deux
minutes. En dessous de dix spectateurs, le nombre n'est pas affiche.

Rien de personnel n'est conserve : l'identifiant du visiteur est tire au hasard
par son navigateur, vit le temps de l'onglet, et n'est relie a aucun compte, a
aucune adresse IP et a aucun cookie. Deux visites de la meme personne sont deux
inconnus. C'est suffisant pour compter une audience, et cela evite d'avoir a
demander un consentement pour la regarder.

A la fin de la diffusion, un rapport est ecrit dans **Rapports de diffusion** et
pousse vers le webhook des parametres : pointe simultanee, spectateurs
differents, duree moyenne, part de telephones, et la courbe de la soiree. Il
n'apparait nulle part sur le site public.

## Le quota YouTube

Il ne se consomme plus. La recherche, qui coute cent unites, ne s'execute que si
aucun lien de diffusion n'est connu ; comme la salle du club est reglee dans les
parametres, elle ne part plus jamais. Il reste deux unites par jour pour le
rattrapage des replays, sur dix mille.

La cle d'API YouTube devient donc facultative pour le direct. Elle reste
necessaire au rattrapage des replays.

## Ce qui n'est pas fait

- Pas de retour arriere pendant le direct, faute de memoire tampon chez eux.
  A leur demander s'ils peuvent elargir cette fenetre.
- Le rapport d'audience ne couvre que les diffusions par leur flux. Une rencontre
  diffusee sur YouTube garde le compteur de YouTube, qui est juste et gratuit.
