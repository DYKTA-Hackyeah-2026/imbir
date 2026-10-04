CREATE TYPE "public"."actor_type" AS ENUM('supports_change', 'blocks_change');--> statement-breakpoint
CREATE TYPE "public"."affordability" AS ENUM('cost_greater_than_benefit', 'cost_equals_benefit', 'benefit_greater_than_cost', 'high_value_low_cost');--> statement-breakpoint
CREATE TYPE "public"."audience_type" AS ENUM('main_user', 'payer', 'decision_maker');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('direct', 'partner', 'additional');--> statement-breakpoint
CREATE TYPE "public"."cost_type" AS ENUM('fixed', 'variable');--> statement-breakpoint
CREATE TYPE "public"."innovation_status" AS ENUM('draft', 'completed', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."problem_frequency" AS ENUM('very_often', 'often', 'sometimes', 'rarely');--> statement-breakpoint
CREATE TYPE "public"."problem_intensity" AS ENUM('very_serious', 'strong', 'moderate', 'light');--> statement-breakpoint
CREATE TYPE "public"."problem_scale" AS ENUM('individuals', 'narrow_group', 'large_group', 'very_large_group');--> statement-breakpoint
CREATE TYPE "public"."revenue_scalability" AS ENUM('no_additional_sources', 'possible_additional_sources', 'real_growth_paths', 'replicable');--> statement-breakpoint
CREATE TYPE "public"."revenue_validation" AS ENUM('unknown', 'idea', 'concrete_proposal', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."simplicity" AS ENUM('unclear', 'partially_clear', 'clear', 'users_can_explain');--> statement-breakpoint
CREATE TYPE "public"."value_type" AS ENUM('emotional', 'functional');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"icon" varchar(64) DEFAULT 'lightbulb' NOT NULL,
	"accent" varchar(32) DEFAULT 'blue' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(320) NOT NULL,
	"subject" varchar(300),
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"url" text,
	"synthetic" boolean DEFAULT false NOT NULL,
	"problem_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "innovation_actors" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"type" "actor_type" NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "innovation_audiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"type" "audience_type" NOT NULL,
	"value" text NOT NULL,
	"custom_value" text
);
--> statement-breakpoint
CREATE TABLE "innovation_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"type" "channel_type" NOT NULL,
	"value" text NOT NULL,
	"custom_value" text
);
--> statement-breakpoint
CREATE TABLE "innovation_citations" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" text NOT NULL,
	"source_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"page" integer,
	"excerpt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "innovation_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"type" "cost_type" NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(12, 2),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "innovation_problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"intensity" "problem_intensity",
	"frequency" "problem_frequency",
	"scale" "problem_scale",
	CONSTRAINT "innovation_problems_innovation_id_unique" UNIQUE("innovation_id")
);
--> statement-breakpoint
CREATE TABLE "innovation_revenue" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"validation" "revenue_validation",
	"main_source" text,
	"scalability" "revenue_scalability",
	"additional_source" text,
	CONSTRAINT "innovation_revenue_innovation_id_unique" UNIQUE("innovation_id")
);
--> statement-breakpoint
CREATE TABLE "innovation_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"innovation_type" text,
	"social_inclusion_description" text,
	"deinstitutionalization_description" text,
	"innovation_uniqueness" text,
	"existing_solutions" text,
	"problem_description" text,
	"problem_statistics" text,
	"problem_sources" text,
	"social_challenges_map_reference" text,
	"audience_description" text,
	"audience_needs" text,
	"exclusion_risk_description" text,
	"expected_change" text,
	"social_inclusion_impact" text,
	"future_vision" text,
	"scalability_description" text,
	"implementation_ease" text,
	"requested_grant_amount" numeric(12, 2),
	"team_experience" text,
	"affordability" "affordability",
	"simplicity" "simplicity",
	"status" "innovation_status" DEFAULT 'draft' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "innovation_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"experience" text,
	"organization" text
);
--> statement-breakpoint
CREATE TABLE "innovation_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" integer NOT NULL,
	"value_option_id" integer,
	"custom_value" text
);
--> statement-breakpoint
CREATE TABLE "innovations" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"source_id" text NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	"evidence_status" text NOT NULL,
	"problem_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tested_in" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applicable_contexts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resources_required" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_cost_pln" double precision,
	"timeframe_weeks" integer,
	"embedding" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matchmaking_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" text NOT NULL,
	"request_id" text NOT NULL,
	"innovation_id" text NOT NULL,
	"useful" boolean NOT NULL,
	"reason" text,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matchmaking_requests" (
	"request_id" text PRIMARY KEY NOT NULL,
	"user_type" text NOT NULL,
	"status" text NOT NULL,
	"mode" text NOT NULL,
	"problem_summary" text NOT NULL,
	"identified_needs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input" jsonb NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_tags" (
	"material_id" uuid NOT NULL,
	"tag" varchar(120) NOT NULL,
	CONSTRAINT "material_tags_material_id_tag_pk" PRIMARY KEY("material_id","tag")
);
--> statement-breakpoint
CREATE TABLE "material_topics" (
	"material_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	CONSTRAINT "material_topics_material_id_topic_id_pk" PRIMARY KEY("material_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text,
	"type" varchar(32) NOT NULL,
	"format" varchar(32) NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"visibility" varchar(16) DEFAULT 'public' NOT NULL,
	"category_id" uuid,
	"cover_url" text,
	"thumbnail_url" text,
	"file_url" text,
	"file_type" varchar(32),
	"file_size_bytes" bigint,
	"pages" integer,
	"video_url" text,
	"duration_seconds" integer,
	"author" text,
	"region" varchar(120),
	"language" varchar(8) DEFAULT 'pl' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"gallery" jsonb,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_terms" (
	"term" varchar(200) PRIMARY KEY NOT NULL,
	"searches" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"kind" text NOT NULL,
	"url_verified" boolean DEFAULT false NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(200) NOT NULL,
	"icon" varchar(64) DEFAULT 'users' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "value_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "value_type" NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "value_options_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "innovation_actors" ADD CONSTRAINT "innovation_actors_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_audiences" ADD CONSTRAINT "innovation_audiences_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_channels" ADD CONSTRAINT "innovation_channels_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_costs" ADD CONSTRAINT "innovation_costs_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_problems" ADD CONSTRAINT "innovation_problems_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_revenue" ADD CONSTRAINT "innovation_revenue_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_submissions" ADD CONSTRAINT "innovation_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_team_members" ADD CONSTRAINT "innovation_team_members_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_values" ADD CONSTRAINT "innovation_values_innovation_id_innovation_submissions_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovation_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovation_values" ADD CONSTRAINT "innovation_values_value_option_id_value_options_id_fk" FOREIGN KEY ("value_option_id") REFERENCES "public"."value_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_tags" ADD CONSTRAINT "material_tags_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_topics" ADD CONSTRAINT "material_topics_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_topics" ADD CONSTRAINT "material_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "innovation_citations_innovation_idx" ON "innovation_citations" USING btree ("innovation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "innovation_values_option_unique" ON "innovation_values" USING btree ("innovation_id","value_option_id");--> statement-breakpoint
CREATE INDEX "innovations_source_idx" ON "innovations" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "innovations_synthetic_idx" ON "innovations" USING btree ("synthetic");--> statement-breakpoint
CREATE INDEX "matchmaking_feedback_request_idx" ON "matchmaking_feedback" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matchmaking_feedback_feedback_id_idx" ON "matchmaking_feedback" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "matchmaking_requests_created_idx" ON "matchmaking_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "material_tags_tag_idx" ON "material_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "material_topics_topic_id_idx" ON "material_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_slug_unique" ON "materials" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "materials_status_published_idx" ON "materials" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "materials_type_idx" ON "materials" USING btree ("type");--> statement-breakpoint
CREATE INDEX "materials_category_id_idx" ON "materials" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "materials_featured_idx" ON "materials" USING btree ("is_featured");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_unique" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_hash_unique" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_slug_unique" ON "topics" USING btree ("slug");