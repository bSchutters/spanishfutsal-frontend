import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Migration de reference. Le schema existait deja quand elle a ete generee, en
 * mode push : sur une base qui le porte, elle ne fait que retirer le marqueur
 * du mode push, pour que les migrations suivantes tournent sans question. Sur
 * une base vide, elle cree tout.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const { rows } = await db.execute(sql`SELECT to_regclass('public.users') AS existante`)
  const schemaEnPlace = (rows[0] as { existante?: unknown } | undefined)?.existante != null

  await payload.delete({ collection: 'payload-migrations', where: { batch: { equals: -1 } }, req })

  if (schemaEnPlace) return

  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'manager');
  CREATE TYPE "public"."enum_users_permissions_matches" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_users_permissions_players" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_users_permissions_teams" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_users_permissions_media" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_users_permissions_sponsors" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_users_permissions_rankings" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_users_permissions_seasons" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_users_permissions_venues" AS ENUM('none', 'edit', 'full');
  CREATE TYPE "public"."enum_players_poste" AS ENUM('Gardien', 'Joueur', 'Coach', 'Kine');
  CREATE TYPE "public"."enum_rankings_position_change" AS ENUM('no_change', 'up', 'down');
  CREATE TYPE "public"."enum_lffs_updates_type" AS ENUM('ranking', 'matches');
  CREATE TYPE "public"."enum_lffs_updates_status" AS ENUM('success', 'error', 'in_progress');
  CREATE TYPE "public"."enum_sponsors_type" AS ENUM('sponsor', 'partner');
  CREATE TYPE "public"."enum_live_audience_source" AS ENUM('direct', 'facebook', 'instagram', 'recherche', 'autre', 'interne');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'manager' NOT NULL,
  	"permissions_matches" "enum_users_permissions_matches" DEFAULT 'none',
  	"permissions_matches_fields_home_team" boolean DEFAULT true,
  	"permissions_matches_fields_away_team" boolean DEFAULT true,
  	"permissions_matches_fields_score_home" boolean DEFAULT true,
  	"permissions_matches_fields_score_away" boolean DEFAULT true,
  	"permissions_matches_fields_date" boolean DEFAULT true,
  	"permissions_matches_fields_time" boolean DEFAULT true,
  	"permissions_matches_fields_venue_id" boolean DEFAULT true,
  	"permissions_matches_fields_venue_name" boolean DEFAULT true,
  	"permissions_matches_fields_live_link" boolean DEFAULT true,
  	"permissions_matches_fields_replay_link" boolean DEFAULT true,
  	"permissions_matches_fields_serie_reference" boolean DEFAULT true,
  	"permissions_matches_fields_season" boolean DEFAULT true,
  	"permissions_matches_fields_essai" boolean DEFAULT true,
  	"permissions_matches_fields_field_players_stats" boolean DEFAULT true,
  	"permissions_matches_fields_goalkeeper_stats" boolean DEFAULT true,
  	"permissions_players" "enum_users_permissions_players" DEFAULT 'none',
  	"permissions_players_fields_prenom" boolean DEFAULT true,
  	"permissions_players_fields_nom" boolean DEFAULT true,
  	"permissions_players_fields_numero" boolean DEFAULT true,
  	"permissions_players_fields_poste" boolean DEFAULT true,
  	"permissions_players_fields_photo" boolean DEFAULT true,
  	"permissions_players_fields_date_naissance" boolean DEFAULT true,
  	"permissions_players_fields_capitaine" boolean DEFAULT true,
  	"permissions_players_fields_actif" boolean DEFAULT true,
  	"permissions_teams" "enum_users_permissions_teams" DEFAULT 'none',
  	"permissions_teams_fields_lffs_names" boolean DEFAULT true,
  	"permissions_teams_fields_name" boolean DEFAULT true,
  	"permissions_teams_fields_short_name" boolean DEFAULT true,
  	"permissions_teams_fields_logo" boolean DEFAULT true,
  	"permissions_teams_fields_is_club" boolean DEFAULT true,
  	"permissions_media" "enum_users_permissions_media" DEFAULT 'none',
  	"permissions_media_fields_alt" boolean DEFAULT true,
  	"permissions_sponsors" "enum_users_permissions_sponsors" DEFAULT 'none',
  	"permissions_sponsors_fields_name" boolean DEFAULT true,
  	"permissions_sponsors_fields_type" boolean DEFAULT true,
  	"permissions_sponsors_fields_logo" boolean DEFAULT true,
  	"permissions_sponsors_fields_logo_on_light" boolean DEFAULT true,
  	"permissions_sponsors_fields_sector" boolean DEFAULT true,
  	"permissions_sponsors_fields_description" boolean DEFAULT true,
  	"permissions_sponsors_fields_links" boolean DEFAULT true,
  	"permissions_sponsors_fields_active" boolean DEFAULT true,
  	"permissions_rankings" "enum_users_permissions_rankings" DEFAULT 'none',
  	"permissions_rankings_fields_team_name" boolean DEFAULT true,
  	"permissions_rankings_fields_position" boolean DEFAULT true,
  	"permissions_rankings_fields_played" boolean DEFAULT true,
  	"permissions_rankings_fields_points" boolean DEFAULT true,
  	"permissions_rankings_fields_wins" boolean DEFAULT true,
  	"permissions_rankings_fields_draws" boolean DEFAULT true,
  	"permissions_rankings_fields_losses" boolean DEFAULT true,
  	"permissions_rankings_fields_goals_for" boolean DEFAULT true,
  	"permissions_rankings_fields_goals_against" boolean DEFAULT true,
  	"permissions_rankings_fields_goal_difference" boolean DEFAULT true,
  	"permissions_rankings_fields_result_sequence" boolean DEFAULT true,
  	"permissions_rankings_fields_imported_at" boolean DEFAULT true,
  	"permissions_rankings_fields_position_change" boolean DEFAULT true,
  	"permissions_rankings_fields_season" boolean DEFAULT true,
  	"permissions_seasons" "enum_users_permissions_seasons" DEFAULT 'none',
  	"permissions_seasons_fields_name" boolean DEFAULT true,
  	"permissions_seasons_fields_season_id" boolean DEFAULT true,
  	"permissions_seasons_fields_serie_id" boolean DEFAULT true,
  	"permissions_seasons_fields_serie_name" boolean DEFAULT true,
  	"permissions_seasons_fields_active" boolean DEFAULT true,
  	"permissions_seasons_fields_archived" boolean DEFAULT true,
  	"permissions_seasons_fields_start_date" boolean DEFAULT true,
  	"permissions_seasons_fields_end_date" boolean DEFAULT true,
  	"permissions_venues" "enum_users_permissions_venues" DEFAULT 'none',
  	"permissions_venues_fields_short_name" boolean DEFAULT true,
  	"permissions_venues_fields_reference" boolean DEFAULT true,
  	"permissions_venues_fields_street" boolean DEFAULT true,
  	"permissions_venues_fields_street2" boolean DEFAULT true,
  	"permissions_venues_fields_zip" boolean DEFAULT true,
  	"permissions_venues_fields_city" boolean DEFAULT true,
  	"permissions_venues_fields_country" boolean DEFAULT true,
  	"permissions_venues_fields_lffs_id" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "players" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar,
  	"prenom" varchar NOT NULL,
  	"nom" varchar NOT NULL,
  	"numero" numeric,
  	"poste" "enum_players_poste",
  	"photo_id" integer,
  	"date_naissance" timestamp(3) with time zone,
  	"capitaine" boolean DEFAULT false,
  	"actif" boolean DEFAULT true NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"prefix" varchar DEFAULT 'media',
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
  	"focal_y" numeric
  );
  
  CREATE TABLE "matches_field_players_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"joueur_id" integer NOT NULL,
  	"goals" numeric DEFAULT 0,
  	"assists" numeric DEFAULT 0,
  	"yellow_cards" numeric DEFAULT 0,
  	"red_cards" numeric DEFAULT 0
  );
  
  CREATE TABLE "matches_goalkeeper_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"joueur_id" integer NOT NULL,
  	"goals" numeric DEFAULT 0,
  	"assists" numeric DEFAULT 0,
  	"clean_sheet" boolean DEFAULT false,
  	"yellow_cards" numeric DEFAULT 0,
  	"red_cards" numeric DEFAULT 0
  );
  
  CREATE TABLE "matches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"lffs_id" numeric,
  	"home_team" varchar NOT NULL,
  	"away_team" varchar NOT NULL,
  	"score_home" numeric,
  	"score_away" numeric,
  	"date" timestamp(3) with time zone,
  	"time" varchar,
  	"venue_id" numeric,
  	"venue_name" varchar,
  	"live_link" varchar,
  	"replay_link" varchar,
  	"serie_reference" varchar,
  	"season_id" integer,
  	"essai" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rankings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"team_name" varchar NOT NULL,
  	"position" numeric,
  	"played" numeric,
  	"points" numeric,
  	"wins" numeric,
  	"draws" numeric,
  	"losses" numeric,
  	"goals_for" numeric,
  	"goals_against" numeric,
  	"goal_difference" numeric,
  	"result_sequence" varchar,
  	"imported_at" timestamp(3) with time zone,
  	"position_change" "enum_rankings_position_change" DEFAULT 'no_change',
  	"season_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "seasons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"season_id" varchar NOT NULL,
  	"serie_id" varchar NOT NULL,
  	"serie_name" varchar,
  	"active" boolean DEFAULT false,
  	"archived" boolean DEFAULT false,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lffs_updates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_lffs_updates_type" NOT NULL,
  	"last_update" timestamp(3) with time zone,
  	"status" "enum_lffs_updates_status" DEFAULT 'success',
  	"error_message" varchar,
  	"items_processed" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "venues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"short_name" varchar NOT NULL,
  	"reference" varchar,
  	"street" varchar,
  	"street2" varchar,
  	"zip" varchar,
  	"city" varchar,
  	"country" varchar,
  	"lffs_id" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "teams" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"short_name" varchar,
  	"logo_id" integer,
  	"is_club" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "teams_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "sponsors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"name" varchar NOT NULL,
  	"type" "enum_sponsors_type" DEFAULT 'sponsor' NOT NULL,
  	"logo_id" integer NOT NULL,
  	"logo_on_light" boolean DEFAULT false,
  	"sector" varchar,
  	"description" varchar,
  	"links_website" varchar,
  	"links_facebook" varchar,
  	"links_instagram" varchar,
  	"links_linkedin" varchar,
  	"links_tiktok" varchar,
  	"links_youtube" varchar,
  	"links_x" varchar,
  	"links_email" varchar,
  	"active" boolean DEFAULT true,
  	"url" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "live_audience" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"match_id" integer NOT NULL,
  	"visiteur" varchar NOT NULL,
  	"durable" varchar,
  	"debut" timestamp(3) with time zone NOT NULL,
  	"fin" timestamp(3) with time zone NOT NULL,
  	"parti" boolean DEFAULT false,
  	"battements" numeric DEFAULT 1,
  	"mobile" boolean DEFAULT false,
  	"largeur" numeric,
  	"son" boolean DEFAULT false,
  	"plein_ecran" boolean DEFAULT false,
  	"source" "enum_live_audience_source" DEFAULT 'direct',
  	"coupures" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "live_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"match_id" integer NOT NULL,
  	"affiche" varchar NOT NULL,
  	"debut" timestamp(3) with time zone,
  	"fin" timestamp(3) with time zone,
  	"uniques" numeric,
  	"pointe" numeric,
  	"duree_moyenne" numeric,
  	"part_mobile" numeric,
  	"courbe" jsonb,
  	"details" jsonb,
  	"envoye" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"players_id" integer,
  	"media_id" integer,
  	"matches_id" integer,
  	"rankings_id" integer,
  	"seasons_id" integer,
  	"lffs_updates_id" integer,
  	"venues_id" integer,
  	"teams_id" integer,
  	"sponsors_id" integer,
  	"live_audience_id" integer,
  	"live_reports_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"imports" boolean DEFAULT true,
  	"xbotgo_room" varchar,
  	"force_live_check" boolean DEFAULT false,
  	"replays_auto" boolean DEFAULT false,
  	"report_webhook" varchar,
  	"lffs_token" varchar,
  	"cached_lffs_token" varchar,
  	"cached_lffs_token_at" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "players" ADD CONSTRAINT "players_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "matches_field_players_stats" ADD CONSTRAINT "matches_field_players_stats_joueur_id_players_id_fk" FOREIGN KEY ("joueur_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "matches_field_players_stats" ADD CONSTRAINT "matches_field_players_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "matches_goalkeeper_stats" ADD CONSTRAINT "matches_goalkeeper_stats_joueur_id_players_id_fk" FOREIGN KEY ("joueur_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "matches_goalkeeper_stats" ADD CONSTRAINT "matches_goalkeeper_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rankings" ADD CONSTRAINT "rankings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams" ADD CONSTRAINT "teams_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams_texts" ADD CONSTRAINT "teams_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_audience" ADD CONSTRAINT "live_audience_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_reports" ADD CONSTRAINT "live_reports_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_players_fk" FOREIGN KEY ("players_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_matches_fk" FOREIGN KEY ("matches_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rankings_fk" FOREIGN KEY ("rankings_id") REFERENCES "public"."rankings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seasons_fk" FOREIGN KEY ("seasons_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lffs_updates_fk" FOREIGN KEY ("lffs_updates_id") REFERENCES "public"."lffs_updates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_venues_fk" FOREIGN KEY ("venues_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teams_fk" FOREIGN KEY ("teams_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sponsors_fk" FOREIGN KEY ("sponsors_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_audience_fk" FOREIGN KEY ("live_audience_id") REFERENCES "public"."live_audience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_reports_fk" FOREIGN KEY ("live_reports_id") REFERENCES "public"."live_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "players_photo_idx" ON "players" USING btree ("photo_id");
  CREATE INDEX "players_updated_at_idx" ON "players" USING btree ("updated_at");
  CREATE INDEX "players_created_at_idx" ON "players" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "matches_field_players_stats_order_idx" ON "matches_field_players_stats" USING btree ("_order");
  CREATE INDEX "matches_field_players_stats_parent_id_idx" ON "matches_field_players_stats" USING btree ("_parent_id");
  CREATE INDEX "matches_field_players_stats_joueur_idx" ON "matches_field_players_stats" USING btree ("joueur_id");
  CREATE INDEX "matches_goalkeeper_stats_order_idx" ON "matches_goalkeeper_stats" USING btree ("_order");
  CREATE INDEX "matches_goalkeeper_stats_parent_id_idx" ON "matches_goalkeeper_stats" USING btree ("_parent_id");
  CREATE INDEX "matches_goalkeeper_stats_joueur_idx" ON "matches_goalkeeper_stats" USING btree ("joueur_id");
  CREATE UNIQUE INDEX "matches_lffs_id_idx" ON "matches" USING btree ("lffs_id");
  CREATE INDEX "matches_season_idx" ON "matches" USING btree ("season_id");
  CREATE INDEX "matches_updated_at_idx" ON "matches" USING btree ("updated_at");
  CREATE INDEX "matches_created_at_idx" ON "matches" USING btree ("created_at");
  CREATE INDEX "rankings_season_idx" ON "rankings" USING btree ("season_id");
  CREATE INDEX "rankings_updated_at_idx" ON "rankings" USING btree ("updated_at");
  CREATE INDEX "rankings_created_at_idx" ON "rankings" USING btree ("created_at");
  CREATE INDEX "seasons_updated_at_idx" ON "seasons" USING btree ("updated_at");
  CREATE INDEX "seasons_created_at_idx" ON "seasons" USING btree ("created_at");
  CREATE INDEX "lffs_updates_updated_at_idx" ON "lffs_updates" USING btree ("updated_at");
  CREATE INDEX "lffs_updates_created_at_idx" ON "lffs_updates" USING btree ("created_at");
  CREATE UNIQUE INDEX "venues_lffs_id_idx" ON "venues" USING btree ("lffs_id");
  CREATE INDEX "venues_updated_at_idx" ON "venues" USING btree ("updated_at");
  CREATE INDEX "venues_created_at_idx" ON "venues" USING btree ("created_at");
  CREATE INDEX "teams_logo_idx" ON "teams" USING btree ("logo_id");
  CREATE INDEX "teams_updated_at_idx" ON "teams" USING btree ("updated_at");
  CREATE INDEX "teams_created_at_idx" ON "teams" USING btree ("created_at");
  CREATE INDEX "teams_texts_order_parent" ON "teams_texts" USING btree ("order","parent_id");
  CREATE INDEX "sponsors__order_idx" ON "sponsors" USING btree ("_order");
  CREATE INDEX "sponsors_logo_idx" ON "sponsors" USING btree ("logo_id");
  CREATE INDEX "sponsors_updated_at_idx" ON "sponsors" USING btree ("updated_at");
  CREATE INDEX "sponsors_created_at_idx" ON "sponsors" USING btree ("created_at");
  CREATE INDEX "live_audience_match_idx" ON "live_audience" USING btree ("match_id");
  CREATE INDEX "live_audience_visiteur_idx" ON "live_audience" USING btree ("visiteur");
  CREATE INDEX "live_audience_durable_idx" ON "live_audience" USING btree ("durable");
  CREATE INDEX "live_audience_fin_idx" ON "live_audience" USING btree ("fin");
  CREATE INDEX "live_audience_updated_at_idx" ON "live_audience" USING btree ("updated_at");
  CREATE INDEX "live_audience_created_at_idx" ON "live_audience" USING btree ("created_at");
  CREATE UNIQUE INDEX "live_reports_match_idx" ON "live_reports" USING btree ("match_id");
  CREATE INDEX "live_reports_updated_at_idx" ON "live_reports" USING btree ("updated_at");
  CREATE INDEX "live_reports_created_at_idx" ON "live_reports" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_players_id_idx" ON "payload_locked_documents_rels" USING btree ("players_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_matches_id_idx" ON "payload_locked_documents_rels" USING btree ("matches_id");
  CREATE INDEX "payload_locked_documents_rels_rankings_id_idx" ON "payload_locked_documents_rels" USING btree ("rankings_id");
  CREATE INDEX "payload_locked_documents_rels_seasons_id_idx" ON "payload_locked_documents_rels" USING btree ("seasons_id");
  CREATE INDEX "payload_locked_documents_rels_lffs_updates_id_idx" ON "payload_locked_documents_rels" USING btree ("lffs_updates_id");
  CREATE INDEX "payload_locked_documents_rels_venues_id_idx" ON "payload_locked_documents_rels" USING btree ("venues_id");
  CREATE INDEX "payload_locked_documents_rels_teams_id_idx" ON "payload_locked_documents_rels" USING btree ("teams_id");
  CREATE INDEX "payload_locked_documents_rels_sponsors_id_idx" ON "payload_locked_documents_rels" USING btree ("sponsors_id");
  CREATE INDEX "payload_locked_documents_rels_live_audience_id_idx" ON "payload_locked_documents_rels" USING btree ("live_audience_id");
  CREATE INDEX "payload_locked_documents_rels_live_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("live_reports_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "players" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "matches_field_players_stats" CASCADE;
  DROP TABLE "matches_goalkeeper_stats" CASCADE;
  DROP TABLE "matches" CASCADE;
  DROP TABLE "rankings" CASCADE;
  DROP TABLE "seasons" CASCADE;
  DROP TABLE "lffs_updates" CASCADE;
  DROP TABLE "venues" CASCADE;
  DROP TABLE "teams" CASCADE;
  DROP TABLE "teams_texts" CASCADE;
  DROP TABLE "sponsors" CASCADE;
  DROP TABLE "live_audience" CASCADE;
  DROP TABLE "live_reports" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_permissions_matches";
  DROP TYPE "public"."enum_users_permissions_players";
  DROP TYPE "public"."enum_users_permissions_teams";
  DROP TYPE "public"."enum_users_permissions_media";
  DROP TYPE "public"."enum_users_permissions_sponsors";
  DROP TYPE "public"."enum_users_permissions_rankings";
  DROP TYPE "public"."enum_users_permissions_seasons";
  DROP TYPE "public"."enum_users_permissions_venues";
  DROP TYPE "public"."enum_players_poste";
  DROP TYPE "public"."enum_rankings_position_change";
  DROP TYPE "public"."enum_lffs_updates_type";
  DROP TYPE "public"."enum_lffs_updates_status";
  DROP TYPE "public"."enum_sponsors_type";
  DROP TYPE "public"."enum_live_audience_source";`)
}
