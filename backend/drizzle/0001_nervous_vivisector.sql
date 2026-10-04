CREATE TYPE "public"."innovation_test_status" AS ENUM('recruiting', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tester_application_status" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn', 'completed');--> statement-breakpoint
CREATE TABLE "innovation_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"innovation_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"instructions" text,
	"location" text,
	"max_testers" integer,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"status" "innovation_test_status" DEFAULT 'recruiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tester_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"motivation" text,
	"status" "tester_application_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tester_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"overall_rating" integer NOT NULL,
	"usefulness_rating" integer,
	"ease_of_use_rating" integer,
	"would_use_again" boolean,
	"what_worked" text,
	"problems" text,
	"suggestions" text,
	"comment" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tester_feedback_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
ALTER TABLE "tester_applications" ADD CONSTRAINT "tester_applications_test_id_innovation_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."innovation_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_applications" ADD CONSTRAINT "tester_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_feedback" ADD CONSTRAINT "tester_feedback_application_id_tester_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."tester_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "innovation_tests_innovation_idx" ON "innovation_tests" USING btree ("innovation_id");--> statement-breakpoint
CREATE INDEX "innovation_tests_status_idx" ON "innovation_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tester_applications_user_idx" ON "tester_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tester_applications_test_idx" ON "tester_applications" USING btree ("test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tester_applications_test_user_unique" ON "tester_applications" USING btree ("test_id","user_id");--> statement-breakpoint
CREATE INDEX "tester_feedback_application_idx" ON "tester_feedback" USING btree ("application_id");