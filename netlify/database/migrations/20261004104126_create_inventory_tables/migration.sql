CREATE TABLE "branches" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frames" (
	"id" serial PRIMARY KEY,
	"sku" text DEFAULT '' NOT NULL,
	"brand" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Optical' NOT NULL,
	"price" numeric(10,2),
	"photo_key" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"frame_id" integer,
	"branch_id" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_pkey" PRIMARY KEY("frame_id","branch_id")
);
--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_frame_id_frames_id_fkey" FOREIGN KEY ("frame_id") REFERENCES "frames"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_branch_id_branches_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE;