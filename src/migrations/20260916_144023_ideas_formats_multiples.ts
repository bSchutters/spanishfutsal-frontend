import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Une idee peut viser plusieurs formats, comme un post : meme passage en table de relations. */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ideas" DROP CONSTRAINT "ideas_format_id_formats_id_fk";
  
  DROP INDEX "ideas_format_idx";
  ALTER TABLE "ideas_rels" ADD COLUMN "formats_id" integer;
  ALTER TABLE "ideas_rels" ADD CONSTRAINT "ideas_rels_formats_fk" FOREIGN KEY ("formats_id") REFERENCES "public"."formats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ideas_rels_formats_id_idx" ON "ideas_rels" USING btree ("formats_id");
  INSERT INTO "ideas_rels" ("order", "parent_id", "path", "formats_id")
    SELECT 1, "id", 'format', "format_id" FROM "ideas" WHERE "format_id" IS NOT NULL;
  ALTER TABLE "ideas" DROP COLUMN "format_id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ideas" ADD COLUMN "format_id" integer;
  UPDATE "ideas" i SET "format_id" = r."formats_id"
    FROM "ideas_rels" r
    WHERE r."parent_id" = i."id" AND r."path" = 'format' AND r."formats_id" IS NOT NULL AND r."order" = 1;
  DELETE FROM "ideas_rels" WHERE "path" = 'format';
  ALTER TABLE "ideas_rels" DROP CONSTRAINT "ideas_rels_formats_fk";
  
  DROP INDEX "ideas_rels_formats_id_idx";
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_format_id_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."formats"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "ideas_format_idx" ON "ideas" USING btree ("format_id");
  ALTER TABLE "ideas_rels" DROP COLUMN "formats_id";`)
}
