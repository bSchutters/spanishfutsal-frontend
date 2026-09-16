import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import type { CollectionSlug, Where } from 'payload'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_hub_modules_module" AS ENUM('calendar');
  CREATE TYPE "public"."enum_users_hub_modules_level" AS ENUM('read', 'edit');
  CREATE TYPE "public"."enum_event_types_category" AS ENUM('post', 'match', 'training', 'other');
  CREATE TYPE "public"."enum_events_recurrence_weekdays" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
  CREATE TYPE "public"."enum_events_recurrence_frequency" AS ENUM('none', 'weekly', 'monthly');
  CREATE TYPE "public"."enum_events_status" AS ENUM('to_create', 'ready', 'published', 'cancelled');
  CREATE TYPE "public"."enum_events_source" AS ENUM('lffs', 'manual');
  CREATE TYPE "public"."enum_post_templates_apply_to" AS ENUM('home', 'away', 'both');
  CREATE TYPE "public"."enum_post_templates_time_mode" AS ENUM('fixed_time', 'relative_to_kickoff');
  CREATE TYPE "public"."enum_ideas_status" AS ENUM('new', 'kept', 'discarded');
  CREATE TYPE "public"."enum_notification_log_reminder_type" AS ENUM('morning', 'before');
  CREATE TABLE "users_hub_modules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"module" "enum_users_hub_modules_module",
  	"level" "enum_users_hub_modules_level" DEFAULT 'read'
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"feeds_id" integer
  );
  
  CREATE TABLE "feeds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"color" varchar,
  	"emoji" varchar,
  	"token" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"alarms" boolean DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"options_show_meeting_time" boolean DEFAULT false,
  	"options_show_responsibles" boolean DEFAULT false,
  	"options_show_status" boolean DEFAULT false,
  	"options_show_networks_format" boolean DEFAULT false,
  	"options_show_caption" boolean DEFAULT false,
  	"options_show_visuals_link" boolean DEFAULT false,
  	"options_show_hub_link" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_event_types_category" NOT NULL,
  	"color" varchar,
  	"emoji" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_types_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"feeds_id" integer
  );
  
  CREATE TABLE "networks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"icon" varchar,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "formats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"icon" varchar,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_recurrence_weekdays" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_events_recurrence_weekdays",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"type_id" integer NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"all_day" boolean DEFAULT false,
  	"meeting_at" timestamp(3) with time zone,
  	"location_name" varchar,
  	"location_address" varchar,
  	"description" jsonb,
  	"internal_notes" jsonb,
  	"recurrence_frequency" "enum_events_recurrence_frequency" DEFAULT 'none',
  	"recurrence_interval" numeric DEFAULT 1,
  	"recurrence_until" timestamp(3) with time zone,
  	"status" "enum_events_status" DEFAULT 'to_create',
  	"format_id" integer,
  	"caption" varchar,
  	"visuals_link" varchar,
  	"publication_link" varchar,
  	"views" numeric,
  	"linked_match_id" integer,
  	"template_id" integer,
  	"date_edited_manually" boolean DEFAULT false,
  	"caption_edited_manually" boolean DEFAULT false,
  	"source" "enum_events_source",
  	"lffs_match_id" integer,
  	"lffs_id" numeric,
  	"opponent" varchar,
  	"competition" varchar,
  	"home" boolean DEFAULT true,
  	"score" varchar,
  	"cancelled" boolean DEFAULT false,
  	"no_reminder" boolean DEFAULT false,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"feeds_id" integer,
  	"users_id" integer,
  	"networks_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "post_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"apply_to" "enum_post_templates_apply_to" DEFAULT 'both' NOT NULL,
  	"day_offset" numeric DEFAULT 0 NOT NULL,
  	"time_mode" "enum_post_templates_time_mode" DEFAULT 'fixed_time' NOT NULL,
  	"fixed_time" varchar,
  	"minute_offset" numeric,
  	"title_template" varchar NOT NULL,
  	"format_id" integer,
  	"instructions" jsonb,
  	"caption_template" varchar,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "post_templates_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"networks_id" integer,
  	"feeds_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "ideas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" jsonb,
  	"format_id" integer,
  	"inspiration_link" varchar,
  	"linked_match_id" integer,
  	"status" "enum_ideas_status" DEFAULT 'new' NOT NULL,
  	"author_id" integer,
  	"planned_post_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ideas_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"networks_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author_id" integer,
  	"content" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer,
  	"ideas_id" integer
  );
  
  CREATE TABLE "push_subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"endpoint" varchar NOT NULL,
  	"keys_p256dh" varchar NOT NULL,
  	"keys_auth" varchar NOT NULL,
  	"user_agent" varchar,
  	"last_success" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notification_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"occurrence" timestamp(3) with time zone NOT NULL,
  	"reminder_type" "enum_notification_log_reminder_type" NOT NULL,
  	"user_id" integer NOT NULL,
  	"sent_at" timestamp(3) with time zone,
  	"result" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "hub_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"timezone" varchar DEFAULT 'Europe/Brussels' NOT NULL,
  	"match_duration_minutes" numeric DEFAULT 75 NOT NULL,
  	"match_meeting_offset_minutes" numeric DEFAULT 45 NOT NULL,
  	"training_duration_minutes" numeric DEFAULT 90 NOT NULL,
  	"morning_reminder_time" varchar DEFAULT '09:00' NOT NULL,
  	"reminder_before_minutes" numeric DEFAULT 60 NOT NULL,
  	"club_display_name" varchar DEFAULT 'UD Asturiana' NOT NULL,
  	"club_match_pattern" varchar DEFAULT 'ASTURIANA' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "first_name" varchar;
  ALTER TABLE "users" ADD COLUMN "last_name" varchar;
  ALTER TABLE "users" ADD COLUMN "hub_access" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "hub_push_enabled" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "feeds_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_types_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "networks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "formats_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "post_templates_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ideas_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "push_subscriptions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notification_log_id" integer;
  ALTER TABLE "users_hub_modules" ADD CONSTRAINT "users_hub_modules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_feeds_fk" FOREIGN KEY ("feeds_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_types_rels" ADD CONSTRAINT "event_types_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."event_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_types_rels" ADD CONSTRAINT "event_types_rels_feeds_fk" FOREIGN KEY ("feeds_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_recurrence_weekdays" ADD CONSTRAINT "events_recurrence_weekdays_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_type_id_event_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."event_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_format_id_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."formats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_linked_match_id_events_id_fk" FOREIGN KEY ("linked_match_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_template_id_post_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."post_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_lffs_match_id_matches_id_fk" FOREIGN KEY ("lffs_match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_feeds_fk" FOREIGN KEY ("feeds_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_networks_fk" FOREIGN KEY ("networks_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_templates" ADD CONSTRAINT "post_templates_format_id_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."formats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "post_templates_rels" ADD CONSTRAINT "post_templates_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_templates_rels" ADD CONSTRAINT "post_templates_rels_networks_fk" FOREIGN KEY ("networks_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_templates_rels" ADD CONSTRAINT "post_templates_rels_feeds_fk" FOREIGN KEY ("feeds_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_templates_rels" ADD CONSTRAINT "post_templates_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_format_id_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."formats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_linked_match_id_events_id_fk" FOREIGN KEY ("linked_match_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ideas" ADD CONSTRAINT "ideas_planned_post_id_events_id_fk" FOREIGN KEY ("planned_post_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ideas_rels" ADD CONSTRAINT "ideas_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ideas_rels" ADD CONSTRAINT "ideas_rels_networks_fk" FOREIGN KEY ("networks_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ideas_rels" ADD CONSTRAINT "ideas_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_ideas_fk" FOREIGN KEY ("ideas_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_hub_modules_order_idx" ON "users_hub_modules" USING btree ("_order");
  CREATE INDEX "users_hub_modules_parent_id_idx" ON "users_hub_modules" USING btree ("_parent_id");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_feeds_id_idx" ON "users_rels" USING btree ("feeds_id");
  CREATE UNIQUE INDEX "feeds_slug_idx" ON "feeds" USING btree ("slug");
  CREATE UNIQUE INDEX "feeds_token_idx" ON "feeds" USING btree ("token");
  CREATE INDEX "feeds_updated_at_idx" ON "feeds" USING btree ("updated_at");
  CREATE INDEX "feeds_created_at_idx" ON "feeds" USING btree ("created_at");
  CREATE INDEX "event_types_updated_at_idx" ON "event_types" USING btree ("updated_at");
  CREATE INDEX "event_types_created_at_idx" ON "event_types" USING btree ("created_at");
  CREATE INDEX "event_types_rels_order_idx" ON "event_types_rels" USING btree ("order");
  CREATE INDEX "event_types_rels_parent_idx" ON "event_types_rels" USING btree ("parent_id");
  CREATE INDEX "event_types_rels_path_idx" ON "event_types_rels" USING btree ("path");
  CREATE INDEX "event_types_rels_feeds_id_idx" ON "event_types_rels" USING btree ("feeds_id");
  CREATE INDEX "networks_updated_at_idx" ON "networks" USING btree ("updated_at");
  CREATE INDEX "networks_created_at_idx" ON "networks" USING btree ("created_at");
  CREATE INDEX "formats_updated_at_idx" ON "formats" USING btree ("updated_at");
  CREATE INDEX "formats_created_at_idx" ON "formats" USING btree ("created_at");
  CREATE INDEX "events_recurrence_weekdays_order_idx" ON "events_recurrence_weekdays" USING btree ("order");
  CREATE INDEX "events_recurrence_weekdays_parent_idx" ON "events_recurrence_weekdays" USING btree ("parent_id");
  CREATE INDEX "events_type_idx" ON "events" USING btree ("type_id");
  CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");
  CREATE INDEX "events_format_idx" ON "events" USING btree ("format_id");
  CREATE INDEX "events_linked_match_idx" ON "events" USING btree ("linked_match_id");
  CREATE INDEX "events_template_idx" ON "events" USING btree ("template_id");
  CREATE INDEX "events_lffs_match_idx" ON "events" USING btree ("lffs_match_id");
  CREATE UNIQUE INDEX "events_lffs_id_idx" ON "events" USING btree ("lffs_id");
  CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_feeds_id_idx" ON "events_rels" USING btree ("feeds_id");
  CREATE INDEX "events_rels_users_id_idx" ON "events_rels" USING btree ("users_id");
  CREATE INDEX "events_rels_networks_id_idx" ON "events_rels" USING btree ("networks_id");
  CREATE INDEX "events_rels_media_id_idx" ON "events_rels" USING btree ("media_id");
  CREATE INDEX "post_templates_format_idx" ON "post_templates" USING btree ("format_id");
  CREATE INDEX "post_templates_updated_at_idx" ON "post_templates" USING btree ("updated_at");
  CREATE INDEX "post_templates_created_at_idx" ON "post_templates" USING btree ("created_at");
  CREATE INDEX "post_templates_rels_order_idx" ON "post_templates_rels" USING btree ("order");
  CREATE INDEX "post_templates_rels_parent_idx" ON "post_templates_rels" USING btree ("parent_id");
  CREATE INDEX "post_templates_rels_path_idx" ON "post_templates_rels" USING btree ("path");
  CREATE INDEX "post_templates_rels_networks_id_idx" ON "post_templates_rels" USING btree ("networks_id");
  CREATE INDEX "post_templates_rels_feeds_id_idx" ON "post_templates_rels" USING btree ("feeds_id");
  CREATE INDEX "post_templates_rels_users_id_idx" ON "post_templates_rels" USING btree ("users_id");
  CREATE INDEX "ideas_format_idx" ON "ideas" USING btree ("format_id");
  CREATE INDEX "ideas_linked_match_idx" ON "ideas" USING btree ("linked_match_id");
  CREATE INDEX "ideas_author_idx" ON "ideas" USING btree ("author_id");
  CREATE INDEX "ideas_planned_post_idx" ON "ideas" USING btree ("planned_post_id");
  CREATE INDEX "ideas_updated_at_idx" ON "ideas" USING btree ("updated_at");
  CREATE INDEX "ideas_created_at_idx" ON "ideas" USING btree ("created_at");
  CREATE INDEX "ideas_rels_order_idx" ON "ideas_rels" USING btree ("order");
  CREATE INDEX "ideas_rels_parent_idx" ON "ideas_rels" USING btree ("parent_id");
  CREATE INDEX "ideas_rels_path_idx" ON "ideas_rels" USING btree ("path");
  CREATE INDEX "ideas_rels_networks_id_idx" ON "ideas_rels" USING btree ("networks_id");
  CREATE INDEX "ideas_rels_users_id_idx" ON "ideas_rels" USING btree ("users_id");
  CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  CREATE INDEX "comments_rels_order_idx" ON "comments_rels" USING btree ("order");
  CREATE INDEX "comments_rels_parent_idx" ON "comments_rels" USING btree ("parent_id");
  CREATE INDEX "comments_rels_path_idx" ON "comments_rels" USING btree ("path");
  CREATE INDEX "comments_rels_events_id_idx" ON "comments_rels" USING btree ("events_id");
  CREATE INDEX "comments_rels_ideas_id_idx" ON "comments_rels" USING btree ("ideas_id");
  CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");
  CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");
  CREATE INDEX "push_subscriptions_updated_at_idx" ON "push_subscriptions" USING btree ("updated_at");
  CREATE INDEX "push_subscriptions_created_at_idx" ON "push_subscriptions" USING btree ("created_at");
  CREATE INDEX "notification_log_event_idx" ON "notification_log" USING btree ("event_id");
  CREATE INDEX "notification_log_user_idx" ON "notification_log" USING btree ("user_id");
  CREATE INDEX "notification_log_updated_at_idx" ON "notification_log" USING btree ("updated_at");
  CREATE INDEX "notification_log_created_at_idx" ON "notification_log" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feeds_fk" FOREIGN KEY ("feeds_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_types_fk" FOREIGN KEY ("event_types_id") REFERENCES "public"."event_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_networks_fk" FOREIGN KEY ("networks_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_formats_fk" FOREIGN KEY ("formats_id") REFERENCES "public"."formats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_post_templates_fk" FOREIGN KEY ("post_templates_id") REFERENCES "public"."post_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ideas_fk" FOREIGN KEY ("ideas_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_push_subscriptions_fk" FOREIGN KEY ("push_subscriptions_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notification_log_fk" FOREIGN KEY ("notification_log_id") REFERENCES "public"."notification_log"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_feeds_id_idx" ON "payload_locked_documents_rels" USING btree ("feeds_id");
  CREATE INDEX "payload_locked_documents_rels_event_types_id_idx" ON "payload_locked_documents_rels" USING btree ("event_types_id");
  CREATE INDEX "payload_locked_documents_rels_networks_id_idx" ON "payload_locked_documents_rels" USING btree ("networks_id");
  CREATE INDEX "payload_locked_documents_rels_formats_id_idx" ON "payload_locked_documents_rels" USING btree ("formats_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_post_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("post_templates_id");
  CREATE INDEX "payload_locked_documents_rels_ideas_id_idx" ON "payload_locked_documents_rels" USING btree ("ideas_id");
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");
  CREATE INDEX "payload_locked_documents_rels_push_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("push_subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_notification_log_id_idx" ON "payload_locked_documents_rels" USING btree ("notification_log_id");`)

  // Le journal des rappels ne doit jamais porter deux fois le meme rappel,
  // meme si deux executions du job se chevauchent. Payload ne sait pas
  // declarer un index unique compose : il est pose ici, a la main.
  await db.execute(sql`
   CREATE UNIQUE INDEX "notification_log_reminder_unique_idx" ON "notification_log" USING btree ("event_id", "occurrence", "reminder_type", "user_id");`)

  await semer({ payload, req })
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_hub_modules" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "users_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "feeds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_types_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "networks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_recurrence_weekdays" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_templates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_templates_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ideas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ideas_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comments_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "push_subscriptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notification_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "hub_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_hub_modules" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "feeds" CASCADE;
  DROP TABLE "event_types" CASCADE;
  DROP TABLE "event_types_rels" CASCADE;
  DROP TABLE "networks" CASCADE;
  DROP TABLE "formats" CASCADE;
  DROP TABLE "events_recurrence_weekdays" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "post_templates" CASCADE;
  DROP TABLE "post_templates_rels" CASCADE;
  DROP TABLE "ideas" CASCADE;
  DROP TABLE "ideas_rels" CASCADE;
  DROP TABLE "comments" CASCADE;
  DROP TABLE "comments_rels" CASCADE;
  DROP TABLE "push_subscriptions" CASCADE;
  DROP TABLE "notification_log" CASCADE;
  DROP TABLE "hub_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_feeds_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_networks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_formats_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_post_templates_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ideas_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_comments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_push_subscriptions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_notification_log_fk";
  
  DROP INDEX "payload_locked_documents_rels_feeds_id_idx";
  DROP INDEX "payload_locked_documents_rels_event_types_id_idx";
  DROP INDEX "payload_locked_documents_rels_networks_id_idx";
  DROP INDEX "payload_locked_documents_rels_formats_id_idx";
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_post_templates_id_idx";
  DROP INDEX "payload_locked_documents_rels_ideas_id_idx";
  DROP INDEX "payload_locked_documents_rels_comments_id_idx";
  DROP INDEX "payload_locked_documents_rels_push_subscriptions_id_idx";
  DROP INDEX "payload_locked_documents_rels_notification_log_id_idx";
  ALTER TABLE "users" DROP COLUMN "first_name";
  ALTER TABLE "users" DROP COLUMN "last_name";
  ALTER TABLE "users" DROP COLUMN "hub_access";
  ALTER TABLE "users" DROP COLUMN "hub_push_enabled";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "feeds_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "networks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "formats_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "post_templates_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ideas_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "push_subscriptions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "notification_log_id";
  DROP TYPE "public"."enum_users_hub_modules_module";
  DROP TYPE "public"."enum_users_hub_modules_level";
  DROP TYPE "public"."enum_event_types_category";
  DROP TYPE "public"."enum_events_recurrence_weekdays";
  DROP TYPE "public"."enum_events_recurrence_frequency";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum_events_source";
  DROP TYPE "public"."enum_post_templates_apply_to";
  DROP TYPE "public"."enum_post_templates_time_mode";
  DROP TYPE "public"."enum_ideas_status";
  DROP TYPE "public"."enum_notification_log_reminder_type";`)
}

type Contexte = Pick<MigrateUpArgs, 'payload' | 'req'>

/**
 * Les donnees initiales du Hub : les trois flux, les cinq types d'evenement,
 * les reseaux, les formats, les trois modeles de post et les reglages. Chaque
 * ligne n'est creee que si elle manque, pour que la migration se rejoue sans
 * doublon sur une base qui en aurait deja.
 */
async function semer({ payload, req }: Contexte): Promise<void> {
  const flux = {
    joueurs: await trouverOuCreer(
      { payload, req },
      'feeds',
      { slug: { equals: 'joueurs' } },
      {
        name: 'Matchs',
        slug: 'joueurs',
        description: "Les matchs et les entraînements de l'équipe.",
        color: '#a2d6f8',
        active: true,
        alarms: false,
        order: 1,
        options: { show_meeting_time: true },
      }
    ),
    comite: await trouverOuCreer(
      { payload, req },
      'feeds',
      { slug: { equals: 'comite' } },
      {
        name: 'Comité',
        slug: 'comite',
        description: 'Matchs, réunions et échéances du comité.',
        color: '#fed164',
        active: true,
        alarms: false,
        order: 2,
        options: {
          show_meeting_time: true,
          show_responsibles: true,
          show_status: true,
          show_networks_format: true,
          show_hub_link: true,
        },
      }
    ),
    social: await trouverOuCreer(
      { payload, req },
      'feeds',
      { slug: { equals: 'social' } },
      {
        name: 'Social',
        slug: 'social',
        description: 'Les publications à préparer pour les réseaux du club.',
        color: '#f28cb1',
        active: true,
        alarms: true,
        order: 3,
        options: {
          show_responsibles: true,
          show_status: true,
          show_networks_format: true,
          show_caption: true,
          show_visuals_link: true,
          show_hub_link: true,
        },
      }
    ),
  }

  const types: Array<[string, string, string, Array<number | string>]> = [
    ['Post', 'post', '#f28cb1', [flux.social]],
    ['Match', 'match', '#a2d6f8', [flux.joueurs, flux.comite, flux.social]],
    ['Entraînement', 'training', '#7bd389', [flux.joueurs]],
    ['Réunion', 'other', '#fed164', [flux.comite]],
    ['Deadline', 'other', '#ff6b6b', [flux.comite]],
  ]
  for (const [index, [name, category, color, default_feeds]] of types.entries()) {
    await trouverOuCreer(
      { payload, req },
      'event-types',
      { name: { equals: name } },
      { name, category, color, default_feeds, order: index + 1 }
    )
  }

  for (const [index, name] of ['Instagram', 'TikTok', 'Facebook', 'YouTube'].entries()) {
    await trouverOuCreer({ payload, req }, 'networks', { name: { equals: name } }, { name, active: true, order: index + 1 })
  }

  const formats: Record<string, number | string> = {}
  for (const [index, name] of ['Post', 'Carrousel', 'Reel', 'Story', 'Live'].entries()) {
    formats[name] = await trouverOuCreer(
      { payload, req },
      'formats',
      { name: { equals: name } },
      { name, active: true, order: index + 1 }
    )
  }

  const reseaux = await payload.find({
    collection: 'networks',
    where: { name: { in: ['Instagram', 'Facebook'] } },
    limit: 10,
    depth: 0,
    req,
  })
  const reseauxParDefaut = reseaux.docs.map((doc) => doc.id)

  // Les legendes de Bryan : heure en 22h00, emoji de lieu devant l'adresse,
  // date numerique dans l'annonce. {heure}, {adresse} et {date_courte}
  // sortent deja dans ce format.
  const modeles = [
    {
      name: 'Annonce',
      day_offset: -2,
      fixed_time: '18:00',
      title_template: 'Annonce vs {adversaire}',
      format: formats.Post,
      caption_template: 'PROCHAIN MATCH 💛💙\n\n📅 {date_courte}\n🕒 {heure}\n📍 {adresse}\n🆚 {adversaire}',
    },
    {
      name: 'Jour J',
      day_offset: 0,
      fixed_time: '10:00',
      title_template: 'Jour de match vs {adversaire}',
      format: formats.Story,
      caption_template: 'MATCHDAY ⚔️\n\n🆚 {adversaire}\n📍 {adresse}\n🕒 {heure}',
    },
    {
      name: 'Résultat',
      day_offset: 1,
      fixed_time: '12:00',
      title_template: 'Résultat vs {adversaire}',
      format: formats.Post,
      // Pas de legende : Bryan la genere a part apres chaque match, le post sert de rappel.
      caption_template: null,
    },
  ]
  for (const modele of modeles) {
    await trouverOuCreer(
      { payload, req },
      'post-templates',
      { name: { equals: modele.name } },
      {
        ...modele,
        active: true,
        apply_to: 'both',
        time_mode: 'fixed_time',
        networks: reseauxParDefaut,
        feeds: [flux.social],
      }
    )
  }

  await payload.updateGlobal({
    slug: 'hub-settings',
    data: {
      timezone: 'Europe/Brussels',
      match_duration_minutes: 75,
      match_meeting_offset_minutes: 45,
      training_duration_minutes: 90,
      morning_reminder_time: '09:00',
      reminder_before_minutes: 60,
      club_display_name: 'UD Asturiana',
      club_match_pattern: 'ASTURIANA',
    },
    req,
  })
}

/** L'identifiant de la ligne qui repond au filtre, creee si elle manque. */
async function trouverOuCreer(
  { payload, req }: Contexte,
  collection: CollectionSlug,
  where: Where,
  data: Record<string, unknown>
): Promise<number | string> {
  const existant = await payload.find({ collection, where, limit: 1, depth: 0, req })
  if (existant.docs[0]) return existant.docs[0].id

  const cree = await payload.create({ collection, data, depth: 0, req })
  return cree.id
}
