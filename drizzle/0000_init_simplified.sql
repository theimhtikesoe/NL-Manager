CREATE TYPE "public"."check_log_status" AS ENUM('PENDING', 'COMPLETED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."machine_status" AS ENUM('active', 'maintenance', 'offline');--> statement-breakpoint
CREATE TYPE "public"."shift_type" AS ENUM('DAY', 'NIGHT');--> statement-breakpoint
CREATE TYPE "public"."worker_role" AS ENUM('admin', 'worker');--> statement-breakpoint
CREATE TABLE "machine_checking_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"worker_id" integer NOT NULL,
	"machine_id" integer NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"media_url" text NOT NULL,
	"status" "check_log_status" DEFAULT 'COMPLETED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_code" varchar(50) NOT NULL,
	"machine_name" varchar(255) NOT NULL,
	"location" varchar(255),
	"status" "machine_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "machines_machine_code_unique" UNIQUE("machine_code")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"machine_id" integer NOT NULL,
	"assigned_date" date NOT NULL,
	"shift_type" "shift_type" DEFAULT 'DAY' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "worker_role" DEFAULT 'worker' NOT NULL,
	CONSTRAINT "workers_worker_code_unique" UNIQUE("worker_code"),
	CONSTRAINT "workers_username_unique" UNIQUE("username")
);
