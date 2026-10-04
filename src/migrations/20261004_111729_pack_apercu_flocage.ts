import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_articles_variants" ADD COLUMN "back_photo_id" numeric;
  ALTER TABLE "pack_articles_variants" ADD COLUMN "flock_fill" varchar;
  ALTER TABLE "pack_articles_variants" ADD COLUMN "flock_outline" varchar;
  ALTER TABLE "pack_articles_variants" ADD COLUMN "flock_outer" varchar;
  ALTER TABLE "pack_articles" ADD COLUMN "flock_layout" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_articles_variants" DROP COLUMN "back_photo_id";
  ALTER TABLE "pack_articles_variants" DROP COLUMN "flock_fill";
  ALTER TABLE "pack_articles_variants" DROP COLUMN "flock_outline";
  ALTER TABLE "pack_articles_variants" DROP COLUMN "flock_outer";
  ALTER TABLE "pack_articles" DROP COLUMN "flock_layout";`)
}
