CREATE TYPE "public"."problem_report_reporter" AS ENUM('resident', 'ngo', 'local_government', 'institution', 'other');--> statement-breakpoint
CREATE TYPE "public"."problem_report_status" AS ENUM('new', 'in_review', 'planned', 'resolved', 'rejected');--> statement-breakpoint
CREATE TABLE "problem_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" varchar(160),
	"municipality" varchar(160),
	"county" varchar(160),
	"reporter_type" "problem_report_reporter" DEFAULT 'resident' NOT NULL,
	"contact_email" varchar(320),
	"status" "problem_report_status" DEFAULT 'new' NOT NULL,
	"admin_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "innovation_submissions" ADD COLUMN "is_accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "problem_reports" ADD CONSTRAINT "problem_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problem_reports_status_idx" ON "problem_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "problem_reports_created_idx" ON "problem_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "problem_reports_user_idx" ON "problem_reports" USING btree ("user_id");