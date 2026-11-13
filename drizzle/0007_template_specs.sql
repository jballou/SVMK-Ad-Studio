ALTER TABLE "templates" ADD COLUMN "intent" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "campaign" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "funnels" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "personas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "icps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "geos" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "offers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "platforms" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "figma_url" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "figma_file_key" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "figma_node_id" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "spec" jsonb;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "thumb" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;