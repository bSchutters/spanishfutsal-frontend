import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pack_orders_status" AS ENUM('received', 'ordered', 'delivered', 'cancelled');
  ALTER TYPE "public"."enum_users_hub_modules_module" ADD VALUE 'pack';
  CREATE TABLE "pack_articles_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"color" varchar,
  	"reference" varchar,
  	"photo_id" integer
  );
  
  CREATE TABLE "pack_articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"price" numeric NOT NULL,
  	"flockable" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"sizes" jsonb,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pack_orders_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"article_id" integer,
  	"variant_id" varchar,
  	"article_name" varchar,
  	"color" varchar,
  	"reference" varchar,
  	"size" varchar,
  	"quantity" numeric,
  	"flock_number" varchar,
  	"flock_name" varchar,
  	"unit_price" numeric
  );
  
  CREATE TABLE "pack_orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"player_id" integer,
  	"other_name" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"note" varchar,
  	"total" numeric,
  	"status" "enum_pack_orders_status" DEFAULT 'received' NOT NULL,
  	"ordered_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pack_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"open" boolean DEFAULT false,
  	"deadline" timestamp(3) with time zone,
  	"token" varchar,
  	"password" varchar,
  	"flock_number_price" numeric DEFAULT 5 NOT NULL,
  	"flock_name_price" numeric DEFAULT 2.5 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pack_articles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pack_orders_id" integer;
  ALTER TABLE "pack_articles_variants" ADD CONSTRAINT "pack_articles_variants_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pack_articles_variants" ADD CONSTRAINT "pack_articles_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pack_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pack_orders_lines" ADD CONSTRAINT "pack_orders_lines_article_id_pack_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."pack_articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pack_orders_lines" ADD CONSTRAINT "pack_orders_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pack_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pack_orders" ADD CONSTRAINT "pack_orders_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pack_articles_variants_order_idx" ON "pack_articles_variants" USING btree ("_order");
  CREATE INDEX "pack_articles_variants_parent_id_idx" ON "pack_articles_variants" USING btree ("_parent_id");
  CREATE INDEX "pack_articles_variants_photo_idx" ON "pack_articles_variants" USING btree ("photo_id");
  CREATE INDEX "pack_articles_updated_at_idx" ON "pack_articles" USING btree ("updated_at");
  CREATE INDEX "pack_articles_created_at_idx" ON "pack_articles" USING btree ("created_at");
  CREATE INDEX "pack_orders_lines_order_idx" ON "pack_orders_lines" USING btree ("_order");
  CREATE INDEX "pack_orders_lines_parent_id_idx" ON "pack_orders_lines" USING btree ("_parent_id");
  CREATE INDEX "pack_orders_lines_article_idx" ON "pack_orders_lines" USING btree ("article_id");
  CREATE INDEX "pack_orders_player_idx" ON "pack_orders" USING btree ("player_id");
  CREATE INDEX "pack_orders_updated_at_idx" ON "pack_orders" USING btree ("updated_at");
  CREATE INDEX "pack_orders_created_at_idx" ON "pack_orders" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pack_articles_fk" FOREIGN KEY ("pack_articles_id") REFERENCES "public"."pack_articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pack_orders_fk" FOREIGN KEY ("pack_orders_id") REFERENCES "public"."pack_orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pack_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("pack_articles_id");
  CREATE INDEX "payload_locked_documents_rels_pack_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("pack_orders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pack_articles_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pack_articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pack_orders_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pack_orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pack_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pack_articles_variants" CASCADE;
  DROP TABLE "pack_articles" CASCADE;
  DROP TABLE "pack_orders_lines" CASCADE;
  DROP TABLE "pack_orders" CASCADE;
  DROP TABLE "pack_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pack_articles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pack_orders_fk";
  
  ALTER TABLE "users_hub_modules" ALTER COLUMN "module" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_hub_modules_module";
  CREATE TYPE "public"."enum_users_hub_modules_module" AS ENUM('calendar', 'players', 'live');
  ALTER TABLE "users_hub_modules" ALTER COLUMN "module" SET DATA TYPE "public"."enum_users_hub_modules_module" USING "module"::"public"."enum_users_hub_modules_module";
  DROP INDEX "payload_locked_documents_rels_pack_articles_id_idx";
  DROP INDEX "payload_locked_documents_rels_pack_orders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pack_articles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pack_orders_id";
  DROP TYPE "public"."enum_pack_orders_status";`)
}
