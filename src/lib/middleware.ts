import { getSessionFromRequest, getUserBySession } from "./auth";

/**
 * Middleware to require authentication
 */
export async function requireAuth(req: Request): Promise<number> {
	const sessionId = getSessionFromRequest(req);
	if (!sessionId) {
		throw new Error("Not authenticated");
	}

	const user = getUserBySession(sessionId);
	if (!user) {
		throw new Error("Invalid session");
	}

	return user.id;
}
