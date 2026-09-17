import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Deux postes de plus, Delegue et Staff : la page Equipe annoncait « Staff »
 * pour tout le monde, le club veut le role exact. Rien n est supprime, le
 * `down` ne peut revenir que si personne ne porte ces deux postes.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_players_poste" ADD VALUE 'Delegue';
  ALTER TYPE "public"."enum_players_poste" ADD VALUE 'Staff';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "players" ALTER COLUMN "poste" SET DATA TYPE text;
  DROP TYPE "public"."enum_players_poste";
  CREATE TYPE "public"."enum_players_poste" AS ENUM('Gardien', 'Joueur', 'Coach', 'Kine');
  ALTER TABLE "players" ALTER COLUMN "poste" SET DATA TYPE "public"."enum_players_poste" USING "poste"::"public"."enum_players_poste";`)
}
