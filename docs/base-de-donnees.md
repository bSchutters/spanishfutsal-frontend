# Base de donnees

Payload stocke tout dans Postgres (Supabase). Ce document decrit la configuration
des environnements, le rafraichissement de la base de dev et la reprise du schema.

## 1. Ne jamais developper sur la production

`DATABASE_URI` dans `.env.local` doit pointer sur une base de **dev**, jamais sur la
production. Payload synchronise automatiquement le schema au demarrage de `pnpm dev`
(mode "push") : si la variable pointe sur la prod, un simple `pnpm dev` modifie le
schema de la base live.

Mise en place, une fois :

1. Creer un second projet Supabase (offre gratuite) dedie au dev.
2. Copier `.env.example` vers `.env.local` et y mettre l URL du projet de dev.
3. Ne laisser les vraies valeurs de production que dans les variables d environnement
   Vercel.

## 2. Remplir la base de dev

Deux options, au choix.

**Repartir de zero.** Lancer `pnpm dev`, creer un utilisateur admin, puis declencher
l import LFFS depuis l admin. Matchs, classements et equipes se reconstruisent seuls.
C est suffisant dans la majorite des cas et ne touche jamais la prod.

**Copier la production.** `pnpm db:refresh -- --yes` prend un instantane de la prod et
ecrase le schema `public` de la base de dev. L instantane date du moment ou la commande
est lancee : il n y a aucune synchronisation permanente entre les deux bases.

Prerequis :

- `pg_dump` et `pg_restore` dans le PATH, dans une version au moins egale a celle du
  serveur Supabase : `winget install -e --id PostgreSQL.PostgreSQL.17`
- `SOURCE_DATABASE_URI` et `TARGET_DATABASE_URI` renseignes dans `.env.local`, en
  connexion **directe** (port 5432). Le pooler transactionnel (port 6543) ne supporte
  pas `pg_dump`.

Le script refuse de tourner si les deux URL designent la meme base, et exige `--yes`
pour confirmer l ecrasement de la cible.

Les medias ne sont pas concernes : ils vivent sur Vercel Blob, en dehors de Postgres.

## 3. Reprise du schema : passer du mode push aux migrations

Aujourd hui le schema est pousse implicitement au demarrage du dev. Rien n est
versionne : impossible de savoir quand une colonne est apparue, ni de rejouer un
changement ailleurs. La cible est de passer aux migrations Payload.

**Prealable non resolu.** Le CLI Payload ne demarre pas en l etat sur ce projet : son
loader tsx ne resout pas les imports TypeScript sans extension, et echoue des le
chargement de `payload.config.ts`. Aucune commande `payload migrate:*` n est donc
utilisable pour l instant. C est le premier point a debloquer.

Une fois le CLI fonctionnel, la procedure est la suivante — a repeter d abord sur la
base de dev, jamais directement sur la prod :

1. Sauvegarder la base.
2. Passer `push: false` dans `postgresAdapter` (`payload.config.ts`).
3. Generer la migration de reference : `payload migrate:create`.
4. La marquer comme **deja appliquee** au lieu de l executer, en inserant sa ligne dans
   la table `payload_migrations`. Sans cela, elle tente de recreer des tables qui
   existent deja. Payload detecte l usage anterieur du mode push et le signale.
5. Verifier avec `payload migrate:status`.
6. Ajouter un script `"ci": "payload migrate && next build"` et le declarer comme
   commande de build sur Vercel, pour que les migrations passent avant chaque deploiement.

Commandes utiles : `migrate` (executer), `migrate:create [nom]`, `migrate:status`,
`migrate:down` (annuler le dernier lot), `migrate:fresh` (tout recreer, destructif).

Source : https://payloadcms.com/docs/database/migrations
