import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "super_admin" boolean DEFAULT false;`)
  // Dans la base partagee, la premiere version de cette migration a coche la case
  // sur le compte de Bryan (07/10/2026). Sur une autre base, un identifiant ne
  // designe personne de sur : la case se coche par l'adresse,
  // node scripts/fix-admin.mjs <email> --super-admin.
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "super_admin";`)
}
