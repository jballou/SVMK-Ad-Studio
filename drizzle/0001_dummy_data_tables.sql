CREATE TABLE "batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"config" jsonb NOT NULL,
	"ad_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"variable" text NOT NULL,
	"hypothesis" text NOT NULL,
	"ad_a" text NOT NULL,
	"ad_b" text NOT NULL,
	"status" text NOT NULL,
	"started_at" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "copy" jsonb;--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "art" jsonb;