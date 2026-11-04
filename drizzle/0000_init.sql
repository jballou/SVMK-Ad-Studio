CREATE TYPE "public"."ad_status" AS ENUM('draft', 'live', 'paused', 'retired');--> statement-breakpoint
CREATE TABLE "ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"creative_id" integer NOT NULL,
	"copy_row_id" integer,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"placement" text NOT NULL,
	"status" "ad_status" DEFAULT 'draft' NOT NULL,
	"launched_at" date,
	"paused_at" date,
	"tags" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "ads_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"funnel" text NOT NULL,
	"metric" text NOT NULL,
	"value" real NOT NULL,
	"direction" text DEFAULT 'higher' NOT NULL,
	"tier" text NOT NULL,
	"source" text,
	"as_of" date
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" serial PRIMARY KEY NOT NULL,
	"concept_key" text NOT NULL,
	"campaign" text,
	"figma_file_key" text,
	"tags" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "concepts_concept_key_unique" UNIQUE("concept_key")
);
--> statement-breakpoint
CREATE TABLE "copy_decks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sheet_id" text NOT NULL,
	"tab" text NOT NULL,
	"column_map" jsonb NOT NULL,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "copy_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"deck_id" integer NOT NULL,
	"concept_id" integer,
	"ad_name_base" text NOT NULL,
	"fields" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"concept_id" integer NOT NULL,
	"figma_node_id" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"image_url" text,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "metrics_daily" (
	"ad_id" integer NOT NULL,
	"day" date NOT NULL,
	"spend" real DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb,
	"source" text NOT NULL,
	CONSTRAINT "metrics_daily_ad_id_day_pk" PRIMARY KEY("ad_id","day")
);
--> statement-breakpoint
CREATE TABLE "scorecards" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_id" integer NOT NULL,
	"period" text NOT NULL,
	"checks" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_copy_row_id_copy_rows_id_fk" FOREIGN KEY ("copy_row_id") REFERENCES "public"."copy_rows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy_rows" ADD CONSTRAINT "copy_rows_deck_id_copy_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."copy_decks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy_rows" ADD CONSTRAINT "copy_rows_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics_daily" ADD CONSTRAINT "metrics_daily_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creatives_concept_size" ON "creatives" USING btree ("concept_id","width","height");--> statement-breakpoint
CREATE UNIQUE INDEX "scorecards_ad_period" ON "scorecards" USING btree ("ad_id","period");