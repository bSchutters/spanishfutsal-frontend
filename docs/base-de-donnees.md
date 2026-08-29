# Base de donnees

Payload stocke tout dans Postgres, heberge sur Supabase. Le developpement et la
production partagent la meme base : c est un choix assume, documente ici avec ses
consequences.

## 1. Configuration actuelle

`DATABASE_URI` dans `.env.local` pointe sur la base de production. En local comme en
ligne, c est la meme.

**Ce que ca simplifie.** Payload synchronise automatiquement le schema au demarrage de
`pnpm dev` (mode "push"). Comme le dev est branche sur la prod, toute modification de
collection y est appliquee immediatement : il n y a rien a faire avant de deployer, et
les donnees affichees en local sont les vraies.

**Ce que ca coute.** Un `pnpm dev` lance apres avoir touche a une collection modifie le
schema de la base live, sans confirmation ni trace. Tant qu on **ajoute** des champs,
l operation est additive et le code en ligne ignore ce qu il ne connait pas. En
revanche, **renommer ou supprimer un champ est destructif** : la colonne correspondante
part avec ses donnees. A faire en connaissance de cause, et de preference apres une
sauvegarde.

Il n y a pas non plus de filet en cas de fausse manoeuvre dans l admin : ce qui est
supprime l est en production.

## 2. Publier en production

Vercel construit en mode production, ou Payload ne synchronise plus rien : les colonnes
doivent exister en base avant que le nouveau code arrive. Avec la configuration
actuelle, c est deja le cas — un `pnpm dev` lance pendant le developpement s en est
charge.

La procedure se resume donc a pousser la branche. Verifier simplement, avant de merger,
qu un `pnpm dev` a bien tourne depuis la derniere modification de collection.

Un manquement ne casse pas le deploiement : les lectures Payload tolerent une colonne
absente, le site se construit et s affiche normalement. C est l **import LFFS** qui
echoue ensuite, au premier passage du cron, en tentant d ecrire dans une colonne qui n
existe pas.

## 3. Alternative : separer le developpement de la production

Si le partage de base devient genant, tout est en place pour revenir en arriere.

Installer Postgres en local :

```
winget install -e --id PostgreSQL.PostgreSQL.17
```

Deux pieges, l installation via winget se faisant en mode silencieux :

- **Aucun mot de passe n est demande.** Le superutilisateur `postgres` recoit le mot de
  passe par defaut `postgres`. A changer via `ALTER USER postgres WITH PASSWORD '...';`
- **Le dossier `bin` n est pas ajoute au PATH.** A faire une fois dans PowerShell, puis
  rouvrir le terminal :

  ```
  [Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\Program Files\PostgreSQL\17\bin', 'User')
  ```

Creer la base, puis faire pointer `DATABASE_URI` dessus :

```
createdb -U postgres spanishfutsal
```

Deux commandes accompagnent ce mode :

- `pnpm db:refresh --yes` remplit la base locale avec un instantane de la production.
  Renseigner `SOURCE_DATABASE_URI` (le **session pooler** Supabase, meme hote que le
  pooler transactionnel mais en port 5432 ; le port 6543 ne supporte pas `pg_dump`, et
  l ancienne connexion directe `db.<ref>.supabase.co` ne resout plus) et
  `TARGET_DATABASE_URI` (la base locale). Le script localise `pg_dump` tout seul, refuse
  de tourner si les deux URL designent la meme base, et exige `--yes`.
- `pnpm schema:push:prod --yes` applique le schema a la production sans y brancher le
  developpement : un serveur ephemere est demarre sur le port 3999 en pointant sur
  `PROD_DATABASE_URI`, une requete declenche la synchronisation, puis il est coupe.

Les medias ne sont concernes par aucune des deux : ils vivent sur Vercel Blob, en dehors
de Postgres.

## 4. Reprise du schema : passer du mode push aux migrations

Des migrations versionnees remplaceraient le push implicite : chaque changement de
schema deviendrait un fichier SQL commite, relu en revue et rejoue au deploiement.

**Prealable non resolu.** Le CLI Payload ne demarre pas sur ce projet. Son binaire
appelle `tsImport('./dist/bin/index.js', url)` avec une `url` situee dans
`node_modules/payload/` : tsx cherche donc le tsconfig depuis ce dossier et n applique
jamais celui du projet, si bien que les alias `@/` du config ne sont pas resolus. Ni
`TSX_TSCONFIG_PATH`, ni `--use-swc`, ni le passage aux imports relatifs n y changent
quelque chose — la correction est a faire en amont, chez Payload. Aucune commande
`payload migrate:*` ni `payload generate:types` n est donc utilisable.

Une fois le CLI debloque, la procedure serait : sauvegarder, passer `push: false` dans
`postgresAdapter`, generer la migration de reference avec `payload migrate:create`, la
marquer comme deja appliquee dans la table `payload_migrations` au lieu de l executer,
verifier avec `payload migrate:status`, puis declarer `payload migrate && next build`
comme commande de build sur Vercel.

Source : https://payloadcms.com/docs/database/migrations
