CREATE TABLE "KanbanBoard" (
	"id" text PRIMARY KEY NOT NULL,
	"teamId" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "KanbanCard" (
	"id" text PRIMARY KEY NOT NULL,
	"columnId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "KanbanColumn" (
	"id" text PRIMARY KEY NOT NULL,
	"boardId" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "KanbanBoard" ADD CONSTRAINT "KanbanBoard_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_columnId_KanbanColumn_id_fk" FOREIGN KEY ("columnId") REFERENCES "public"."KanbanColumn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_boardId_KanbanBoard_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."KanbanBoard"("id") ON DELETE no action ON UPDATE no action;