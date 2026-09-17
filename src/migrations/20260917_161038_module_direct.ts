import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_hub_modules_module" ADD VALUE 'live';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_hub_modules" ALTER COLUMN "module" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_hub_modules_module";
  CREATE TYPE "public"."enum_users_hub_modules_module" AS ENUM('calendar', 'players');
  ALTER TABLE "users_hub_modules" ALTER COLUMN "module" SET DATA TYPE "public"."enum_users_hub_modules_module" USING "module"::"public"."enum_users_hub_modules_module";`)
}
