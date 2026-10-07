CREATE TABLE "activity" (
	"id" serial PRIMARY KEY,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"detail" text NOT NULL,
	"frame_id" integer,
	"branch_id" integer,
	"from_qty" integer,
	"to_qty" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
