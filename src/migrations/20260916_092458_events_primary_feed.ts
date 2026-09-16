import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" ADD COLUMN "primary_feed_id" integer;
  ALTER TABLE "events" ADD CONSTRAINT "events_primary_feed_id_feeds_id_fk" FOREIGN KEY ("primary_feed_id") REFERENCES "public"."feeds"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_primary_feed_idx" ON "events" USING btree ("primary_feed_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DROP CONSTRAINT "events_primary_feed_id_feeds_id_fk";
  
  DROP INDEX "events_primary_feed_idx";
  ALTER TABLE "events" DROP COLUMN "primary_feed_id";`)
}
