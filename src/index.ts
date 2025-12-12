import indexHTML from "./pages/index.html";
import {
	createSession,
	createUser,
	deleteSession,
	getUserBySession,
	getUserByUsername,
	getSessionFromRequest,
} from "./lib/auth";
import {
	createAuthenticationOptions,
	createRegistrationOptions,
	deletePasskey,
	getPasskeysForUser,
	updatePasskeyName,
	verifyAndAuthenticatePasskey,
	verifyAndCreatePasskey,
} from "./lib/passkey";
import { requireAuth } from "./lib/middleware";
import {
	decrementCounter,
	getCounterForUser,
	incrementCounter,
	resetCounter,
} from "./lib/counter";

const port = 3000;

Bun.serve({
	port,
	routes: {
		"/": indexHTML,

		// Auth endpoints
		"/api/auth/me": {
			GET: (req) => {
				try {
					const sessionId = getSessionFromRequest(req);
					if (!sessionId) {
						return new Response(JSON.stringify({ error: "Not authenticated" }), {
							status: 401,
						});
					}

					const user = getUserBySession(sessionId);
					if (!user) {
						return new Response(JSON.stringify({ error: "Invalid session" }), {
							status: 401,
						});
					}

					return new Response(JSON.stringify(user), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500 },
					);
				}
			},
		},

		"/api/auth/check-email": {
			GET: (req) => {
				try {
					const url = new URL(req.url);
					const username = url.searchParams.get("username");

					if (!username) {
						return new Response(JSON.stringify({ error: "Username required" }), {
							status: 400,
						});
					}

					const existing = getUserByUsername(username);
					if (existing) {
						return new Response(
							JSON.stringify({ error: "Username already taken" }),
							{ status: 400 },
						);
					}

					return new Response(JSON.stringify({ available: true }), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500 },
					);
				}
			},
		},

		"/api/auth/register": {
			POST: async (req) => {
				try {
					const body = await req.json();
					const { username, credential, challenge } = body;

					if (!username || !credential || !challenge) {
						return new Response(
							JSON.stringify({ error: "Username, credential, and challenge required" }),
							{ status: 400 },
						);
					}

					// Check if user already exists
					const existing = getUserByUsername(username);
					if (existing) {
						return new Response(
							JSON.stringify({ error: "Username already taken" }),
							{ status: 400 },
						);
					}

					// Create user
					const user = await createUser(username);

					// Verify and create passkey
					await verifyAndCreatePasskey(user.id, credential, challenge);

					// Create session
					const sessionId = createSession(user.id);

					return new Response(JSON.stringify(user), {
						headers: {
							"Content-Type": "application/json",
							"Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
						},
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500 },
					);
				}
			},
		},

		"/api/auth/logout": {
			POST: (req) => {
				try {
					const sessionId = getSessionFromRequest(req);
					if (sessionId) {
						deleteSession(sessionId);
					}

					return new Response(JSON.stringify({ success: true }), {
						headers: {
							"Content-Type": "application/json",
							"Set-Cookie":
								"session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
						},
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500 },
					);
				}
			},
		},

		// Passkey endpoints
		"/api/auth/passkey/register/options": {
			GET: async (req) => {
				try {
					// For registration, we need username from query params (no session yet)
					const url = new URL(req.url);
					const username = url.searchParams.get("username");

					if (!username) {
						return new Response(JSON.stringify({ error: "Username required" }), {
							status: 400,
						});
					}

					// Create temporary user object for registration options
					const tempUser = {
						id: 0, // Temporary ID
						username,
						name: null,
						avatar: "temp",
						created_at: Math.floor(Date.now() / 1000),
					};

					const options = await createRegistrationOptions(tempUser);

					return new Response(JSON.stringify(options), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500 },
					);
				}
			},
		},



		"/api/auth/passkey/authenticate/options": {
			GET: async (req) => {
				try {
					const options = await createAuthenticationOptions();

					return new Response(JSON.stringify(options), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500 },
					);
				}
			},
		},

		"/api/auth/passkey/authenticate/verify": {
			POST: async (req) => {
				try {
					const body = await req.json();
					const { credential, challenge } = body;

					if (!credential || !challenge) {
						return new Response(
							JSON.stringify({ error: "Credential and challenge required" }),
							{ status: 400 },
						);
					}

					const { userId } = await verifyAndAuthenticatePasskey(credential, challenge);

					const user = getUserBySession(
						createSession(userId, req.headers.get("x-forwarded-for") || undefined),
					);

					if (!user) {
						return new Response(JSON.stringify({ error: "User not found" }), {
							status: 404,
						});
					}

					const sessionId = createSession(userId);

					return new Response(JSON.stringify(user), {
						headers: {
							"Content-Type": "application/json",
							"Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
						},
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500 },
					);
				}
			},
		},

		// Counter endpoints
		"/api/counter": {
			GET: async (req) => {
				try {
					const userId = await requireAuth(req);
					const count = getCounterForUser(userId);

					return new Response(JSON.stringify({ count }), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Not authenticated",
						}),
						{ status: 401 },
					);
				}
			},
		},

		"/api/counter/increment": {
			POST: async (req) => {
				try {
					const userId = await requireAuth(req);
					const count = incrementCounter(userId);

					return new Response(JSON.stringify({ count }), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Not authenticated",
						}),
						{ status: 401 },
					);
				}
			},
		},

		"/api/counter/decrement": {
			POST: async (req) => {
				try {
					const userId = await requireAuth(req);
					const count = decrementCounter(userId);

					return new Response(JSON.stringify({ count }), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Not authenticated",
						}),
						{ status: 401 },
					);
				}
			},
		},

		"/api/counter/reset": {
			POST: async (req) => {
				try {
					const userId = await requireAuth(req);
					resetCounter(userId);

					return new Response(JSON.stringify({ count: 0 }), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: error instanceof Error ? error.message : "Not authenticated",
						}),
						{ status: 401 },
					);
				}
			},
		},
	},
	development: {
		hmr: true,
		console: true,
	},
});

console.log(`🥞 Tacy Stack running at http://localhost:${port}`);
