import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Suite de visuels_hub : les evenements ne pointent plus vers les medias du site. */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_rels" DROP CONSTRAINT "events_rels_media_fk";
  
  DROP INDEX "events_rels_media_id_idx";
  ALTER TABLE "events_rels" DROP COLUMN "media_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_rels_media_id_idx" ON "events_rels" USING btree ("media_id");`)
}
