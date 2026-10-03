import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pack_articles_discount_mode" AS ENUM('general', 'none', 'custom');
  ALTER TABLE "pack_articles" ADD COLUMN "discount_mode" "enum_pack_articles_discount_mode" DEFAULT 'general' NOT NULL;
  ALTER TABLE "pack_articles" ADD COLUMN "custom_discount" numeric;
  ALTER TABLE "pack_settings" ADD COLUMN "discount" numeric DEFAULT 0 NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_articles" DROP COLUMN "discount_mode";
  ALTER TABLE "pack_articles" DROP COLUMN "custom_discount";
  ALTER TABLE "pack_settings" DROP COLUMN "discount";
  DROP TYPE "public"."enum_pack_articles_discount_mode";`)
}
