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
  la fin de chaque direct. Une adresse de webhook Discord, de bot Telegram, ou de
  n'importe quel service qui accepte un message ; la forme du corps envoye
  s'adapte a la destination. Laisse vide, le rapport reste dans l'administration.
- **Rattrapage automatique des replays** : en pause, voir plus bas.

Sur un **match** precis, le champ **Lien Live** l'emporte sur la salle des
parametres. Il sert a la rencontre exceptionnelle diffusee ailleurs : un lien
YouTube y est lu et joue dans le lecteur du site, un lien vers autre chose
devient un simple bouton sortant.

## La fenetre

Le site n'interroge le diffuseur qu'entre un quart d'heure avant le coup d'envoi
et soixante-dix minutes apres. Hors de la, aucun appel. Le bandeau du direct est
le seul composant a interroger la route, et la route lui dit elle-meme dans
combien de temps revenir : trente secondes pendant la rencontre, cinq minutes a
l'approche, une heure le reste du temps. Dix secondes tant qu'un lecteur est
ouvert, parce que celui qui regarde a le compteur sous les yeux.

Le CDN, lui, ne laisse passer qu'une interrogation toutes les cinq secondes
pendant la rencontre : l'affluence ne change donc rien a ce que ca coute.

**Comment savoir si le direct est detecte**, sans attendre :

    curl -s https://www.udasturiana.be/api/live-status

Elle repond `{"live":false,...}` quand rien ne diffuse, et sinon l'adresse du
flux, l'affiche de la rencontre et le nombre de spectateurs.

## Leur API

    GET https://cloud.xbotgo.net/api/core/api/live/room/user/task/detail/{roomId}

Avec l'en-tete **`DATA-REGION: EU`**, sans quoi elle repond
`ERR_REGION_NOT_EXIST`. Leur application le derive du parametre `region` de
l'adresse de la salle.

Ce qui en est lu : `playState` valant 1 quand la salle diffuse, et `livePlayUrl`,
une chaine JSON imbriquee qui contient `hlsPlayUrl`.

`liveTitle` est lu mais ne sert a rien : leur application le remplit toute seule
avec l'adresse de courriel du diffuseur, du genre « Transmision en vivo de
xxx@privaterelay.appleid.com ». Le site affiche l'affiche de la rencontre, prise
dans le calendrier, et c'est heureux.

Leur compteur `currentPlayer` n'est pas lu non plus : il compte les gens sur leur
page, pas sur la notre.

Trois choses a savoir :

- **Le flux repond meme quand la salle porte un mot de passe.** Celui-ci protege
  leur page, pas la diffusion.
- **L'adresse HLS est signee et datee.** Elle change a chaque interrogation et
  finit par etre refusee. Le lecteur s'abonne donc a l'adresse fraiche et se
  rebranche tout seul quand la sienne est refusee, trois fois avant de rendre la
  main au visiteur.
- **Leur liste de lecture ne declare que trois segments**, soit douze secondes.
  hls.js garde toutefois ce qu'il a deja telecharge : sur une diffusion reelle,
  la fenetre de retour observee montait a quarante puis soixante secondes au fil
  de la lecture. Trop peu et trop variable pour offrir une barre de progression,
  qui n'est donc pas affichee.

### Le numero de segment, et pourquoi il ne faut pas s'y fier

Leur manifeste ne porte pas `EXT-X-PROGRAM-DATE-TIME`, l'etiquette standard qui
dirait l'heure reelle de chaque segment. Une piste avait ete relevee a la place,
et **elle s'est revelee fausse en general.**

Sur la diffusion du club, le 2 septembre a 17h28 heure belge, le
`#EXT-X-MEDIA-SEQUENCE` valait `1788362880`, soit exactement
`2026-09-02 15:28:00 UTC`, et aligne sur la grille de quatre secondes. La
coincidence est impossible : sur ce flux-la, le numero de segment etait bien
l'horloge unix.

Sur une seconde diffusion, relevee le 13 septembre, il n'en est rien : le numero
retarde de quarante-trois minutes sur l'horloge et n'est pas aligne sur quatre.
Cette diffusion etait servie par `prod-us-live-pull` quand celle du club l'etait
par `prod-eu-live-pull`, ce qui laisse penser a deux reglages de segmenteur
plutot qu'a une regle commune.

**Consequence pour un tableau de score synchronise :** la formule

    seconde reelle affichee = frag.sn + (currentTime - frag.start)

ne vaut que si le flux du club numerote encore ses segments a l'heure, ce qui
demande un nouveau releve a la prochaine diffusion. Un tableau de score ne doit
donc pas reposer dessus seul. La parade qui marche sans elle reste la plus
simple : l'operateur regarde le flux et non le terrain, et clique quand il voit
l'action a l'ecran.

## Eprouver le direct sans rencontre

Un direct ne se presente pas sur commande. En developpement seulement, un lien
impose n'importe quelle salle en cours au site entier, bandeau et compteur
compris :

    /api/salle-essai?lien=<adresse de la salle>
    /api/salle-essai?lien=                        pour l'enlever

Il pose un cookie que la route lit, et il repond 404 en production : ce detour ne
peut rien y faire, quoi qu'on mette dans le cookie.

## Le replay

**En pause.** Le mecanisme est en place mais sa case n'est pas cochee : rien ne
s'ecrit dans les fiches de match. Pour l'activer, cocher **Rattrapage
automatique des replays** dans les Parametres.

Le flux ne survit pas a la rencontre, son adresse expire. Le replay vient donc de
la mise en ligne de l'enregistrement sur la chaine YouTube du club, et le champ
**Lien Replay** peut se remplir tout seul : un rattrapage quotidien lit les
dernieres mises en ligne et les rapproche des rencontres jouees.

Deux signaux sont exiges ensemble, le nom de l'adversaire et soit la date ecrite
dans le titre, soit une mise en ligne dans les trois semaines. Une date dans le
titre leve toute ambiguite, y compris entre l'aller et le retour. Les cas du
rapprochement s'executent par `pnpm test:replays`.

## Le comptage des spectateurs

Le compteur est le notre. Celui du diffuseur compte les gens sur leur page, qui
est vide depuis que le match se regarde ici.

Le lecteur envoie un signe de vie toutes les trente secondes, tant que la lecture
tourne. Un spectateur compte comme present tant que son dernier signe a moins
d'une minute, et son depart est annonce des qu'il ferme l'onglet ou le lecteur :
la place se libere alors tout de suite, sans attendre l'expiration.

Un onglet passe a l'arriere-plan continue de compter : le son continue, et
ecouter le match en travaillant, c'est le regarder. Passe cinq minutes sans
revenir, en revanche, c'est un onglet oublie et il cesse de compter.

Le nombre s'affiche des le premier spectateur. Seul zero reste tu.

Rien de personnel n'est conserve : l'identifiant du visiteur est tire au hasard
par son navigateur, vit le temps de l'onglet, et n'est relie a aucun compte, a
aucune adresse IP et a aucun cookie. Deux visites de la meme personne sont deux
inconnus. C'est suffisant pour compter une audience, et cela evite d'avoir a
demander un consentement pour la regarder.

A la fin de la diffusion, un rapport est ecrit dans **Rapports de diffusion** et
pousse vers le webhook des parametres. Il n'apparait nulle part sur le site
public.

Ce qu'il contient : pointe simultanee et la minute ou elle a eu lieu, spectateurs
differents, temps regarde en moyenne et en mediane, total d'heures visionnees,
retention par paliers (cinq, quinze, trente, quarante-cinq minutes, jusqu'au
bout), familles d'ecran, part de son active, part de plein ecran, provenance par
familles, coupures subies par personne, courbe des presents et courbe des
arrivees minute par minute. Et, pour ceux qui ont ferme le bandeau de mesure,
combien avaient deja regarde une diffusion precedente.

Les chiffres sont calcules par personne et non par presence : quelqu'un qui met
en pause et revient reste un spectateur, et sa duree est la somme de ce qu'il a
regarde. Les cas s'executent par `pnpm test:audience`.

Pour eprouver le webhook sans attendre une rencontre, une commande envoie un
rapport d'essai aux chiffres fabriques par le meme chemin que le vrai :

    POST /api/live-report-test

Cette fin est constatee par le dernier visiteur encore present. Si tout le monde
ferme son onglet au coup de sifflet, personne ne la constate : le rattrapage
quotidien (`/api/live-catchup`, a 9h) sert alors de filet.

## Le quota YouTube

Il ne se consomme plus du tout. La recherche, qui coute cent unites, ne s'execute
que si aucun lien de diffusion n'est connu ; comme la salle du club est reglee
dans les parametres, elle ne part plus jamais. Le rattrapage des replays, deux
unites par jour sur dix mille, est en pause.

La cle d'API YouTube devient donc facultative pour le direct. Elle redeviendra
necessaire le jour ou le rattrapage des replays sera active.

## Ce qui n'est pas fait

- Pas de retour arriere pendant le direct, faute de memoire tampon chez eux.
  A leur demander s'ils peuvent elargir cette fenetre.
- Le rapport d'audience ne couvre que les diffusions par leur flux. Une rencontre
  diffusee sur YouTube garde le compteur de YouTube, qui est juste et gratuit.
