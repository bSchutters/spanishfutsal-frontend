import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Les numeros de feuille de match remplacent le « second numero » ajoute
 * quelques minutes plus tot : le numero du site n'a rien a voir avec la
 * feuille, ou treize maillots se partagent entre tout l'effectif. Deux
 * numeros par joueur, chacun avec sa case dans la matrice des droits. Ce
 * qui aurait pu etre saisi dans l'ancienne colonne passe dans le premier
 * numero avant qu'elle ne disparaisse.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "permissions_players_fields_numero_feuille_1" boolean DEFAULT true;
  ALTER TABLE "users" ADD COLUMN "permissions_players_fields_numero_feuille_2" boolean DEFAULT true;
  ALTER TABLE "players" ADD COLUMN "numero_feuille_1" numeric;
  ALTER TABLE "players" ADD COLUMN "numero_feuille_2" numeric;
  UPDATE "players" SET "numero_feuille_1" = "numero_2" WHERE "numero_2" IS NOT NULL;
  ALTER TABLE "users" DROP COLUMN "permissions_players_fields_numero_2";
  ALTER TABLE "players" DROP COLUMN "numero_2";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "permissions_players_fields_numero_2" boolean DEFAULT true;
  ALTER TABLE "players" ADD COLUMN "numero_2" numeric;
  UPDATE "players" SET "numero_2" = "numero_feuille_1";
  ALTER TABLE "users" DROP COLUMN "permissions_players_fields_numero_feuille_1";
  ALTER TABLE "users" DROP COLUMN "permissions_players_fields_numero_feuille_2";
  ALTER TABLE "players" DROP COLUMN "numero_feuille_1";
  ALTER TABLE "players" DROP COLUMN "numero_feuille_2";`)
}
