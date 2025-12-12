import { eq } from "drizzle-orm";
import db from "../db/db";
import { users, sessions, type User } from "../db/schema";

const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface User {
	id: number;
	username: string;
	name: string | null;
	avatar: string;
	created_at: number;
}

export interface Session {
	id: string;
	user_id: number;
	ip_address: string | null;
	user_agent: string | null;
	created_at: number;
	expires_at: number;
}

export function createSession(
	userId: number,
	ipAddress?: string,
	userAgent?: string,
): string {
	const sessionId = crypto.randomUUID();
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;

	db.insert(sessions)
		.values({
			id: sessionId,
			user_id: userId,
			ip_address: ipAddress ?? null,
			user_agent: userAgent ?? null,
			expires_at: new Date(expiresAt * 1000),
		})
		.run();

	return sessionId;
}

export function getSession(sessionId: string): Session | null {
	const now = Math.floor(Date.now() / 1000);

	const session = db
		.select()
		.from(sessions)
		.where(eq(sessions.id, sessionId))
		.get();

	if (!session || Math.floor(session.expires_at.getTime() / 1000) <= now) {
		return null;
	}

	return {
		id: session.id,
		user_id: session.user_id,
		ip_address: session.ip_address,
		user_agent: session.user_agent,
		created_at: Math.floor(session.created_at.getTime() / 1000),
		expires_at: Math.floor(session.expires_at.getTime() / 1000),
	};
}

export function getUserBySession(sessionId: string): User | null {
	const session = getSession(sessionId);
	if (!session) return null;

	const user = db
		.select()
		.from(users)
		.where(eq(users.id, session.user_id))
		.get();

	if (!user) return null;

	return {
		id: user.id,
		username: user.username,
		name: user.name,
		avatar: user.avatar,
		created_at: Math.floor(user.created_at.getTime() / 1000),
	};
}

export function getUserByUsername(username: string): User | null {
	const user = db
		.select()
		.from(users)
		.where(eq(users.username, username))
		.get();

	if (!user) return null;

	return {
		id: user.id,
		username: user.username,
		name: user.name,
		avatar: user.avatar,
		created_at: Math.floor(user.created_at.getTime() / 1000),
	};
}

export function deleteSession(sessionId: string): void {
	db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export async function createUser(
	username: string,
	name?: string,
): Promise<User> {
	// Generate deterministic avatar from username
	const encoder = new TextEncoder();
	const data = encoder.encode(username.toLowerCase());
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const avatar = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.substring(0, 16);

	const result = db
		.insert(users)
		.values({
			username,
			name: name ?? null,
			avatar,
		})
		.run();

	const user = db
		.select()
		.from(users)
		.where(eq(users.id, Number(result.lastInsertRowid)))
		.get();

	if (!user) {
		throw new Error("Failed to create user");
	}

	return {
		id: user.id,
		username: user.username,
		name: user.name,
		avatar: user.avatar,
		created_at: Math.floor(user.created_at.getTime() / 1000),
	};
}

export function getSessionFromRequest(req: Request): string | null {
	const cookie = req.headers.get("cookie");
	if (!cookie) return null;

	const sessionMatch = cookie.match(/session=([^;]+)/);
	return sessionMatch ? sessionMatch[1] : null;
}
