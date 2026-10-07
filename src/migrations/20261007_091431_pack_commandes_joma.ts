import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pack_joma_orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ordered_at" timestamp(3) with time zone NOT NULL,
  	"amount" numeric,
  	"recap" jsonb NOT NULL,
  	"order_ids" jsonb,
  	"excluded" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pack_joma_orders_id" integer;
  CREATE INDEX "pack_joma_orders_updated_at_idx" ON "pack_joma_orders" USING btree ("updated_at");
  CREATE INDEX "pack_joma_orders_created_at_idx" ON "pack_joma_orders" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pack_joma_orders_fk" FOREIGN KEY ("pack_joma_orders_id") REFERENCES "public"."pack_joma_orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pack_joma_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("pack_joma_orders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_joma_orders" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pack_joma_orders" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pack_joma_orders_fk";
  
  DROP INDEX "payload_locked_documents_rels_pack_joma_orders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pack_joma_orders_id";`)
}
