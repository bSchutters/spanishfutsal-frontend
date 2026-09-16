import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Un post et un modele peuvent avoir plusieurs formats (Story et Repost en
 * story, par exemple) : la relation devient multiple, donc passe de la colonne
 * `format_id` a la table des relations, chemin `format`. Le format deja
 * choisi est recopie avant que la colonne ne disparaisse. Le format « Repost
 * en story » est ajoute a la liste, s'il manque.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DROP CONSTRAINT "events_format_id_formats_id_fk";

  ALTER TABLE "post_templates" DROP CONSTRAINT "post_templates_format_id_formats_id_fk";

  DROP INDEX "events_format_idx";
  DROP INDEX "post_templates_format_idx";
  ALTER TABLE "events_rels" ADD COLUMN "formats_id" integer;
  ALTER TABLE "post_templates_rels" ADD COLUMN "formats_id" integer;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_formats_fk" FOREIGN KEY ("formats_id") REFERENCES "public"."formats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_templates_rels" ADD CONSTRAINT "post_templates_rels_formats_fk" FOREIGN KEY ("formats_id") REFERENCES "public"."formats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_rels_formats_id_idx" ON "events_rels" USING btree ("formats_id");
  CREATE INDEX "post_templates_rels_formats_id_idx" ON "post_templates_rels" USING btree ("formats_id");

  INSERT INTO "events_rels" ("order", "parent_id", "path", "formats_id")
    SELECT 1, "id", 'format', "format_id" FROM "events" WHERE "format_id" IS NOT NULL;
  INSERT INTO "post_templates_rels" ("order", "parent_id", "path", "formats_id")
    SELECT 1, "id", 'format', "format_id" FROM "post_templates" WHERE "format_id" IS NOT NULL;

  ALTER TABLE "events" DROP COLUMN "format_id";
  ALTER TABLE "post_templates" DROP COLUMN "format_id";`)

  const existant = await payload.find({
    collection: 'formats',
    where: { name: { equals: 'Repost en story' } },
    limit: 1,
    depth: 0,
    req,
  })
  if (!existant.docs[0]) {
    await payload.create({
      collection: 'formats',
      data: { name: 'Repost en story', active: true, order: 6 },
      depth: 0,
      req,
    })
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" ADD COLUMN "format_id" integer;
  ALTER TABLE "post_templates" ADD COLUMN "format_id" integer;

  UPDATE "events" e SET "format_id" = r."formats_id"
    FROM "events_rels" r
    WHERE r."parent_id" = e."id" AND r."path" = 'format' AND r."formats_id" IS NOT NULL AND r."order" = 1;
  UPDATE "post_templates" t SET "format_id" = r."formats_id"
    FROM "post_templates_rels" r
    WHERE r."parent_id" = t."id" AND r."path" = 'format' AND r."formats_id" IS NOT NULL AND r."order" = 1;
  DELETE FROM "events_rels" WHERE "path" = 'format';
  DELETE FROM "post_templates_rels" WHERE "path" = 'format';

  ALTER TABLE "events_rels" DROP CONSTRAINT "events_rels_formats_fk";

  ALTER TABLE "post_templates_rels" DROP CONSTRAINT "post_templates_rels_formats_fk";

  DROP INDEX "events_rels_formats_id_idx";
  DROP INDEX "post_templates_rels_formats_id_idx";
  ALTER TABLE "events" ADD CONSTRAINT "events_format_id_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."formats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "post_templates" ADD CONSTRAINT "post_templates_format_id_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."formats"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_format_idx" ON "events" USING btree ("format_id");
  CREATE INDEX "post_templates_format_idx" ON "post_templates" USING btree ("format_id");
  ALTER TABLE "events_rels" DROP COLUMN "formats_id";
  ALTER TABLE "post_templates_rels" DROP COLUMN "formats_id";`)
}
