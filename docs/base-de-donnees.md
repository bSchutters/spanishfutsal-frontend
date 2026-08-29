# Base de donnees

Payload stocke tout dans Postgres. La production tourne sur Supabase, le
developpement doit tourner sur un Postgres local. Ce document decrit la mise en
place, le rafraichissement de la base de dev et la reprise du schema.

## 1. Ne jamais developper sur la production

`DATABASE_URI` dans `.env.local` doit pointer sur une base de **dev**, jamais sur la
production. Payload synchronise automatiquement le schema au demarrage de `pnpm dev`
(mode "push") : si la variable pointe sur la prod, un simple `pnpm dev` modifie le
schema de la base live.

### Installer Postgres en local

```
winget install -e --id PostgreSQL.PostgreSQL.17
```

Garder l installation complete : le serveur sert de base de dev, et les Command Line
Tools fournissent `pg_dump` / `pg_restore` utilises par `pnpm db:refresh`.

Deux pieges avec l installation via winget, qui se fait en mode silencieux :

- **Aucun mot de passe n est demande.** Le superutilisateur `postgres` recoit le mot de
  passe par defaut `postgres`. L instance n ecoute qu en local, mais rien n empeche de
  le changer : `ALTER USER postgres WITH PASSWORD '...';`
- **Le dossier `bin` n est pas ajoute au PATH**, donc `psql` et `createdb` restent
  introuvables. A ajouter une fois, dans un terminal PowerShell, puis rouvrir le
  terminal :

  ```
  [Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\Program Files\PostgreSQL\17\bin', 'User')
  ```

Creer ensuite la base du projet :

```
createdb -U postgres spanishfutsal
```

Puis copier `.env.example` vers `.env.local` et renseigner :

```
DATABASE_URI=postgresql://postgres:motdepasse@localhost:5432/spanishfutsal
```

Les vraies valeurs de production restent uniquement dans les variables d environnement
Vercel.

Un Postgres local a trois avantages sur une seconde base hebergee : impossible de le
confondre avec la production, aucune latence reseau, et le meme dialecte que la prod —
donc des migrations valides. SQLite ne conviendrait pas : les migrations Payload sont
specifiques au dialecte, une migration generee sur SQLite ne s applique pas sur Postgres.

## 2. Remplir la base de dev

Deux options, au choix.

**Repartir de zero.** Lancer `pnpm dev`, creer un utilisateur admin, puis declencher
l import LFFS depuis l admin. Matchs, classements et equipes se reconstruisent seuls.
C est suffisant dans la majorite des cas et ne touche jamais la prod.

**Copier la production.** `pnpm db:refresh -- --yes` prend un instantane de la prod et
ecrase le schema `public` de la base locale. L instantane date du moment ou la commande
est lancee : il n y a aucune synchronisation permanente entre les deux bases.

Renseigner au prealable dans `.env.local` :

- `SOURCE_DATABASE_URI` : connexion **directe** a la prod (port 5432). Le pooler
  transactionnel de Supabase (port 6543) ne supporte pas `pg_dump`.
- `TARGET_DATABASE_URI` : la base locale.

Le script refuse de tourner si les deux URL designent la meme base, et exige `--yes`
pour confirmer l ecrasement de la cible. Le dump ne couvre que le schema `public`, donc
les schemas propres a Supabase (`auth`, `storage`) sont ignores et la restauration passe
sans adaptation dans un Postgres standard.

Les medias ne sont pas concernes : ils vivent sur Vercel Blob, en dehors de Postgres.

## 3. Reprise du schema : passer du mode push aux migrations

Aujourd hui le schema est pousse implicitement au demarrage du dev. Rien n est
versionne : impossible de savoir quand une colonne est apparue, ni de rejouer un
changement ailleurs. La cible est de passer aux migrations Payload.

**Prealable non resolu.** Le CLI Payload ne demarre pas en l etat sur ce projet : son
loader tsx ne resout pas les imports TypeScript sans extension, et echoue des le
chargement de `payload.config.ts`. Aucune commande `payload migrate:*` ni
`payload generate:types` n est utilisable pour l instant. C est le premier point a
debloquer.

Une fois le CLI fonctionnel, la procedure est la suivante — a jouer d abord sur la base
locale, jamais directement sur la prod :

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
