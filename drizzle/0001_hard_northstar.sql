ALTER TABLE "machine_checking_logs" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "machine_checking_logs" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "machine_checking_logs" ADD COLUMN "admin_comment" text;