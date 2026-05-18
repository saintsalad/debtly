/** Bundled initial schema (keep in sync with drizzle/migrations/0000_initial.sql). */
export const INITIAL_MIGRATION_SQL = `CREATE TABLE \`app_meta\` (
	\`key\` text PRIMARY KEY NOT NULL,
	\`value\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`profile_settings\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`currency\` text NOT NULL,
	\`appearance\` text NOT NULL,
	\`show_split_bills_in_transactions\` integer DEFAULT false NOT NULL,
	\`receipt_thermal_look\` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`debts\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`person_name\` text NOT NULL,
	\`principal_minor\` integer NOT NULL,
	\`type\` text NOT NULL,
	\`source_type\` text,
	\`source_group_id\` text,
	\`source_member_id\` text,
	\`split_group_id\` text,
	\`note\` text,
	\`due_date\` text,
	\`start_date\` text,
	\`status\` text NOT NULL,
	\`interest_rate_bps\` integer,
	\`interest_type\` text,
	\`interest_start_mode\` text,
	\`interest_accrual_frequency\` text,
	\`interest_start_date\` text,
	\`accrued_interest_minor\` integer,
	\`interest_paid_minor\` integer,
	\`principal_paid_minor\` integer,
	\`paid_at\` text,
	\`is_recurring\` integer,
	\`recurrence_interval\` text,
	\`recurrence_anchor_date\` text,
	\`next_cycle_date\` text,
	\`last_generated_at\` text,
	\`recurring_group_id\` text,
	\`recurring_source_id\` text,
	\`carry_over_balance\` integer,
	\`carry_over_minor\` integer,
	\`instalment_total\` integer,
	\`instalment_count\` integer,
	\`instalment_index\` integer,
	\`currency\` text,
	\`original_amount_minor\` integer,
	\`conversion_rate\` text,
	\`recurrence_frequency\` text,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`debt_payments\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`debt_id\` text NOT NULL,
	\`amount_minor\` integer NOT NULL,
	\`interest_applied_minor\` integer NOT NULL,
	\`principal_applied_minor\` integer NOT NULL,
	\`paid_at\` text NOT NULL,
	\`note\` text,
	FOREIGN KEY (\`debt_id\`) REFERENCES \`debts\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`groups\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`image_uri\` text,
	\`invite_code\` text NOT NULL,
	\`created_by_member_id\` text,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL,
	\`version\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`group_members\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`group_id\` text NOT NULL,
	\`display_name\` text NOT NULL,
	\`is_current_user\` integer NOT NULL,
	\`username\` text,
	\`color\` text,
	\`joined_at\` text NOT NULL,
	FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`group_expenses\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`group_id\` text NOT NULL,
	\`title\` text NOT NULL,
	\`amount_minor\` integer NOT NULL,
	\`currency\` text NOT NULL,
	\`paid_by_member_id\` text NOT NULL,
	\`split_method\` text NOT NULL,
	\`shares_json\` text NOT NULL,
	\`included_member_ids_json\` text NOT NULL,
	\`note\` text,
	\`receipt_uri\` text,
	\`expense_date\` text NOT NULL,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL,
	\`version\` integer NOT NULL,
	\`deleted_at\` text,
	FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`settlements\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`group_id\` text NOT NULL,
	\`from_member_id\` text NOT NULL,
	\`to_member_id\` text NOT NULL,
	\`amount_minor\` integer NOT NULL,
	\`note\` text,
	\`settled_at\` text NOT NULL,
	\`version\` integer NOT NULL,
	FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`activity_log\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`group_id\` text NOT NULL,
	\`kind\` text NOT NULL,
	\`at\` text NOT NULL,
	\`actor_member_id\` text NOT NULL,
	\`expense_id\` text,
	\`settlement_id\` text,
	\`target_member_id\` text,
	\`title\` text NOT NULL,
	\`subtitle\` text,
	\`amount_minor\` integer,
	FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`pending_ops\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`op\` text NOT NULL,
	\`entity_id\` text NOT NULL,
	\`version\` integer NOT NULL,
	\`client_id\` text NOT NULL,
	\`created_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`bill_splits\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`title\` text NOT NULL,
	\`total\` integer NOT NULL,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`bill_split_participants\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`bill_split_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`amount\` integer NOT NULL,
	\`paid\` integer NOT NULL,
	FOREIGN KEY (\`bill_split_id\`) REFERENCES \`bill_splits\`(\`id\`) ON UPDATE no action ON DELETE cascade
);`;
