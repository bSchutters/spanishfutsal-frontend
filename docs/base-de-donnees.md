# Base de donnees

Payload stocke tout dans Postgres, heberge sur Supabase. Le developpement et la
production partagent la meme base : c est un choix assume, documente ici avec ses
consequences.

## 1. Configuration actuelle

`DATABASE_URI` dans `.env.local` pointe sur la base de production. En local comme en
ligne, c est la meme.

Depuis le 15 septembre 2026, le schema **ne se synchronise plus tout seul** :
`push: false` dans `payload.config.ts`. Chaque changement de collection passe par une
migration versionnee dans `src/migrations/`, relue avec le code et rejouee au
deploiement. Un `pnpm dev` ne touche plus jamais au schema.

**Ce que ca simplifie.** Les donnees affichees en local sont les vraies, et une branche
qui n a pas ete migree ne peut plus deformer la base de l autre.

**Ce que ca coute.** Apres avoir touche a une collection, il faut generer puis
appliquer la migration soi-meme (section 3). Sans cela, les colonnes n existent pas et
la premiere ecriture echoue.

Il n y a toujours pas de filet en cas de fausse manoeuvre dans l admin : ce qui est
supprime l est en production.

## 2. Publier en production

Vercel lance `pnpm build`, soit `payload migrate && next build` : les migrations en
attente sont appliquees avant la construction. En pratique elles le sont deja, puisque
`pnpm migrate` a ete lance en local pendant le developpement ; la commande de build ne
fait alors rien.

Une migration ne s applique qu une fois : la table `payload_migrations` retient celles
qui l ont ete.

## 3. Modifier le schema

1. Modifier la collection dans `src/payload/collections/`.
2. `pnpm migrate:create nom-parlant` : Payload compare les collections au dernier
   instantane JSON de `src/migrations/` et ecrit un fichier `.ts` avec le SQL de
   montee et de descente, plus un nouvel instantane.
3. Relire le SQL. Une suppression de colonne est definitive.
4. `pnpm migrate` : applique les migrations en attente sur la base de `DATABASE_URI`.
5. Commiter le fichier `.ts`, le `.json` et `index.ts`.

`pnpm migrate:status` liste ce qui est applique et ce qui attend.

Les migrations peuvent aussi porter des donnees initiales : la fonction `up` recoit
`payload` et `req`, et peut appeler l API locale dans la meme transaction que le SQL.

## 4. Comment on en est arrive la

Le CLI Payload ne demarrait pas sur ce projet : son binaire chargeait
`payload.config.ts` en `require`, et `@payloadcms/richtext-lexical` est un module ESM
avec un `await` de premier niveau. Declarer `"type": "module"` dans `package.json` a
suffi : le config est charge en `import`, et `payload migrate:*` repond.

La migration de reference `20260915_214144_initial` decrit le schema tel qu il etait a
ce moment. Elle n a jamais ete executee : ses tables existaient deja, elle a ete marquee
comme appliquee dans `payload_migrations` (batch 1) et l entree `dev` du mode push a
ete retiree. Les migrations suivantes partent de son instantane.

## 5. Alternative : separer le developpement de la production

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

`pnpm db:refresh --yes` remplit la base locale avec un instantane de la production.
Renseigner `SOURCE_DATABASE_URI` (le **session pooler** Supabase, meme hote que le
pooler transactionnel mais en port 5432 ; le port 6543 ne supporte pas `pg_dump`) et
`TARGET_DATABASE_URI` (la base locale). Le script localise `pg_dump` tout seul, refuse
de tourner si les deux URL designent la meme base, et exige `--yes`. Les migrations
s appliquent ensuite avec `pnpm migrate`, comme sur la production.

Les medias ne sont pas concernes : ils vivent sur Vercel Blob, en dehors de Postgres.

Source : https://payloadcms.com/docs/database/migrations
