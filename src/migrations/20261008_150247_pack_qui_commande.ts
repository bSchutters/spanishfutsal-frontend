import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_settings" ADD COLUMN "people" jsonb;
  ALTER TABLE "pack_settings" ADD COLUMN "hidden_players" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_settings" DROP COLUMN "people";
  ALTER TABLE "pack_settings" DROP COLUMN "hidden_players";`)
}
