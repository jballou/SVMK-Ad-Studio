CREATE TABLE "score_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"ad_type" text NOT NULL,
	"stage" text NOT NULL,
	"geo" text,
	"kpis" jsonb NOT NULL,
	"data_status" text DEFAULT 'placeholder' NOT NULL,
	"sample_ads" integer,
	"source" text,
	"period_start" date,
	"period_end" date
);
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "ad_type" text DEFAULT 'Static' NOT NULL;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "geo" text;--> statement-breakpoint
ALTER TABLE "metrics_daily" ADD COLUMN "video_starts" integer;--> statement-breakpoint
ALTER TABLE "metrics_daily" ADD COLUMN "video_completions" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "score_benchmarks_key" ON "score_benchmarks" USING btree ("platform","ad_type","stage",(coalesce("geo", '')));