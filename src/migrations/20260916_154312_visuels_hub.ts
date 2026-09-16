import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Les visuels des posts deposes depuis le Hub : la collection hub-media,
 * gardee telle quelle, et son lien depuis les evenements. Le lien vers les
 * medias du site est retire par la migration suivante : en deux temps pour
 * que l outil n ait pas a deviner s il s agit d un renommage.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "hub_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"prefix" varchar DEFAULT 'hub',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_vignette_url" varchar,
  	"sizes_vignette_width" numeric,
  	"sizes_vignette_height" numeric,
  	"sizes_vignette_mime_type" varchar,
  	"sizes_vignette_filesize" numeric,
  	"sizes_vignette_filename" varchar
  );
  
  ALTER TABLE "events_rels" ADD COLUMN "hub_media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "hub_media_id" integer;
  ALTER TABLE "hub_media" ADD CONSTRAINT "hub_media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "hub_media_uploaded_by_idx" ON "hub_media" USING btree ("uploaded_by_id");
  CREATE INDEX "hub_media_updated_at_idx" ON "hub_media" USING btree ("updated_at");
  CREATE INDEX "hub_media_created_at_idx" ON "hub_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "hub_media_filename_idx" ON "hub_media" USING btree ("filename");
  CREATE INDEX "hub_media_sizes_vignette_sizes_vignette_filename_idx" ON "hub_media" USING btree ("sizes_vignette_filename");
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_hub_media_fk" FOREIGN KEY ("hub_media_id") REFERENCES "public"."hub_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_hub_media_fk" FOREIGN KEY ("hub_media_id") REFERENCES "public"."hub_media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_rels_hub_media_id_idx" ON "events_rels" USING btree ("hub_media_id");
  CREATE INDEX "payload_locked_documents_rels_hub_media_id_idx" ON "payload_locked_documents_rels" USING btree ("hub_media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "hub_media" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "hub_media" CASCADE;
  ALTER TABLE "events_rels" DROP CONSTRAINT "events_rels_hub_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_hub_media_fk";
  
  DROP INDEX "events_rels_hub_media_id_idx";
  DROP INDEX "payload_locked_documents_rels_hub_media_id_idx";
  ALTER TABLE "events_rels" DROP COLUMN "hub_media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "hub_media_id";`)
}
