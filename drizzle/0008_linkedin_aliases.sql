CREATE TABLE "ad_aliases" (
	"platform" text NOT NULL,
	"external_key" text NOT NULL,
	"ad_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ad_aliases_platform_external_key_pk" PRIMARY KEY("platform","external_key")
);
--> statement-breakpoint
ALTER TABLE "ad_aliases" ADD CONSTRAINT "ad_aliases_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;