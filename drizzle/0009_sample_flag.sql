ALTER TABLE "ads" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Existing demo rows: seeded creatives are named "sample:...", seeded batches were created by these four people.
UPDATE "ads" SET "is_sample" = true WHERE "creative_id" IN (SELECT "id" FROM "creatives" WHERE "figma_node_id" LIKE 'sample:%');--> statement-breakpoint
UPDATE "batches" SET "is_sample" = true WHERE "created_by" IN ('Alex Rivera', 'Priya Shah', 'Marcus Lee', 'Dana Whitfield');
