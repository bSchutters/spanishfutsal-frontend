import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_settings" ADD COLUMN "payment_iban" varchar;
  ALTER TABLE "pack_settings" ADD COLUMN "payment_holder" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_settings" DROP COLUMN "payment_iban";
  ALTER TABLE "pack_settings" DROP COLUMN "payment_holder";`)
}
