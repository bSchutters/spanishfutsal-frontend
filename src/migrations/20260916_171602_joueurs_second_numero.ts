import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Le module Joueurs du Hub : la valeur `players` parmi les modules d'une fiche
 * utilisateur, et un second numero de maillot sur chaque joueur, avec sa case
 * dans la matrice des droits. Rien n'est supprime.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_hub_modules_module" ADD VALUE 'players';
  ALTER TABLE "users" ADD COLUMN "permissions_players_fields_numero_2" boolean DEFAULT true;
  ALTER TABLE "players" ADD COLUMN "numero_2" numeric;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_hub_modules" ALTER COLUMN "module" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_hub_modules_module";
  CREATE TYPE "public"."enum_users_hub_modules_module" AS ENUM('calendar');
  ALTER TABLE "users_hub_modules" ALTER COLUMN "module" SET DATA TYPE "public"."enum_users_hub_modules_module" USING "module"::"public"."enum_users_hub_modules_module";
  ALTER TABLE "users" DROP COLUMN "permissions_players_fields_numero_2";
  ALTER TABLE "players" DROP COLUMN "numero_2";`)
}
