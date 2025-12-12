import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users table
export const users = sqliteTable("users", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	username: text("username").unique().notNull(),
	name: text("name"),
	avatar: text("avatar").default("d"),
	created_at: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
});

// Sessions table
export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	user_id: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	ip_address: text("ip_address"),
	user_agent: text("user_agent"),
	created_at: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
	expires_at: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// Passkeys table
export const passkeys = sqliteTable("passkeys", {
	id: text("id").primaryKey(),
	user_id: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	credential_id: text("credential_id").notNull().unique(),
	public_key: text("public_key").notNull(),
	counter: integer("counter").notNull().default(0),
	transports: text("transports"),
	name: text("name"),
	created_at: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
	last_used_at: integer("last_used_at", { mode: "timestamp" }),
});

// Click counter table (user-specific counter values)
export const counters = sqliteTable("counters", {
	user_id: integer("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	count: integer("count").notNull().default(0),
	updated_at: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
});
