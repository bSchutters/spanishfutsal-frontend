import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_reports" DROP COLUMN "envoye";
  ALTER TABLE "settings" DROP COLUMN "report_webhook";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_reports" ADD COLUMN "envoye" boolean DEFAULT false;
  ALTER TABLE "settings" ADD COLUMN "report_webhook" varchar;`)
}
