import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Le coach adjoint, et l ordre du staff tel que le club le nomme : coach,
 * adjoint, delegue, kine, staff. L enumeration est recreee pour porter cet
 * ordre ; toutes les valeurs deja en base s y retrouvent, rien ne se perd.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "players" ALTER COLUMN "poste" SET DATA TYPE text;
  DROP TYPE "public"."enum_players_poste";
  CREATE TYPE "public"."enum_players_poste" AS ENUM('Gardien', 'Joueur', 'Coach', 'Adjoint', 'Delegue', 'Kine', 'Staff');
  ALTER TABLE "players" ALTER COLUMN "poste" SET DATA TYPE "public"."enum_players_poste" USING "poste"::"public"."enum_players_poste";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "players" ALTER COLUMN "poste" SET DATA TYPE text;
  DROP TYPE "public"."enum_players_poste";
  CREATE TYPE "public"."enum_players_poste" AS ENUM('Gardien', 'Joueur', 'Coach', 'Kine', 'Delegue', 'Staff');
  ALTER TABLE "players" ALTER COLUMN "poste" SET DATA TYPE "public"."enum_players_poste" USING "poste"::"public"."enum_players_poste";`)
}
