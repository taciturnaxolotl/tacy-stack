import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	type VerifiedAuthenticationResponse,
	type VerifiedRegistrationResponse,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { eq } from "drizzle-orm";
import db from "../db/db";
import { passkeys } from "../db/schema";
import type { User } from "./auth";

export interface Passkey {
	id: string;
	user_id: number;
	credential_id: string;
	public_key: string;
	counter: number;
	transports: string | null;
	name: string | null;
	created_at: number;
	last_used_at: number | null;
}

export interface RegistrationChallenge {
	challenge: string;
	user_id: number;
	expires_at: number;
}

export interface AuthenticationChallenge {
	challenge: string;
	expires_at: number;
}

// In-memory challenge storage
const registrationChallenges = new Map<string, RegistrationChallenge>();
const authenticationChallenges = new Map<string, AuthenticationChallenge>();

// Challenge TTL: 5 minutes
const CHALLENGE_TTL = 5 * 60 * 1000;

// Cleanup expired challenges every minute
setInterval(() => {
	const now = Date.now();
	for (const [challenge, data] of registrationChallenges.entries()) {
		if (data.expires_at < now) {
			registrationChallenges.delete(challenge);
		}
	}
	for (const [challenge, data] of authenticationChallenges.entries()) {
		if (data.expires_at < now) {
			authenticationChallenges.delete(challenge);
		}
	}
}, 60 * 1000);

/**
 * Get RP ID and origin based on environment
 */
function getRPConfig(): { rpID: string; rpName: string; origin: string } {
	return {
		rpID: process.env.RP_ID || "localhost",
		rpName: "Tacy Stack",
		origin: process.env.ORIGIN || "http://localhost:3000",
	};
}

/**
 * Generate registration options for a user
 */
export async function createRegistrationOptions(user: User) {
	const { rpID, rpName } = getRPConfig();

	// Get existing credentials to exclude
	const existingCredentials = getPasskeysForUser(user.id);

	const options = await generateRegistrationOptions({
		rpName,
		rpID,
		userName: user.username,
		userDisplayName: user.name || user.username,
		attestationType: "none",
		excludeCredentials: existingCredentials.map((cred) => ({
			id: cred.credential_id,
			transports: cred.transports?.split(",") as
				| ("usb" | "nfc" | "ble" | "internal" | "hybrid")[]
				| undefined,
		})),
		authenticatorSelection: {
			residentKey: "preferred",
			userVerification: "preferred",
		},
	});

	// Store challenge
	registrationChallenges.set(options.challenge, {
		challenge: options.challenge,
		user_id: user.id,
		expires_at: Date.now() + CHALLENGE_TTL,
	});

	return options;
}

/**
 * Verify registration response and create passkey
 */
export async function verifyAndCreatePasskey(
	userId: number,
	response: RegistrationResponseJSON,
	expectedChallenge: string,
): Promise<Passkey> {
	const { rpID, origin } = getRPConfig();

	// Get and validate challenge
	const challengeData = registrationChallenges.get(expectedChallenge);
	if (!challengeData) {
		throw new Error("Invalid or expired challenge");
	}

	if (challengeData.expires_at < Date.now()) {
		registrationChallenges.delete(expectedChallenge);
		throw new Error("Challenge expired");
	}

	// For new registrations, user_id will be 0 (temporary), so skip this check
	if (challengeData.user_id !== 0 && challengeData.user_id !== userId) {
		throw new Error("User ID mismatch");
	}

	// Verify the registration
	const verification: VerifiedRegistrationResponse =
		await verifyRegistrationResponse({
			response,
			expectedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
		});

	if (!verification.verified || !verification.registrationInfo) {
		throw new Error("Registration verification failed");
	}

	// Remove used challenge
	registrationChallenges.delete(expectedChallenge);

	const { credential } = verification.registrationInfo;

	// Store the passkey
	const passkeyId = crypto.randomUUID();
	const credentialIdBase64 = credential.id; // Already base64url in v13
	const publicKeyBase64 = Buffer.from(credential.publicKey).toString(
		"base64url",
	);
	const transports = response.response.transports?.join(",") || null;

	db.insert(passkeys)
		.values({
			id: passkeyId,
			user_id: userId,
			credential_id: credentialIdBase64,
			public_key: publicKeyBase64,
			counter: credential.counter,
			transports,
			name: null,
		})
		.run();

	const passkey = db
		.select()
		.from(passkeys)
		.where(eq(passkeys.id, passkeyId))
		.get();

	if (!passkey) {
		throw new Error("Failed to create passkey");
	}

	return {
		id: passkey.id,
		user_id: passkey.user_id,
		credential_id: passkey.credential_id,
		public_key: passkey.public_key,
		counter: passkey.counter,
		transports: passkey.transports,
		name: passkey.name,
		created_at: Math.floor(passkey.created_at.getTime() / 1000),
		last_used_at: passkey.last_used_at
			? Math.floor(passkey.last_used_at.getTime() / 1000)
			: null,
	};
}

/**
 * Generate authentication options
 */
export async function createAuthenticationOptions() {
	const { rpID } = getRPConfig();

	const options = await generateAuthenticationOptions({
		rpID,
		userVerification: "preferred",
	});

	// Store challenge
	authenticationChallenges.set(options.challenge, {
		challenge: options.challenge,
		expires_at: Date.now() + CHALLENGE_TTL,
	});

	return options;
}

/**
 * Verify authentication response and return user
 */
export async function verifyAndAuthenticatePasskey(
	response: AuthenticationResponseJSON,
	expectedChallenge: string,
): Promise<{ userId: number; passkeyId: string }> {
	const { rpID, origin } = getRPConfig();

	// Get challenge
	const challengeData = authenticationChallenges.get(expectedChallenge);
	if (!challengeData) {
		throw new Error("Invalid or expired challenge");
	}

	if (challengeData.expires_at < Date.now()) {
		authenticationChallenges.delete(expectedChallenge);
		throw new Error("Challenge expired");
	}

	// Get passkey by credential ID
	const credentialIdBase64 = response.id; // Already base64url in v13
	const passkey = db
		.select()
		.from(passkeys)
		.where(eq(passkeys.credential_id, credentialIdBase64))
		.get();

	if (!passkey) {
		throw new Error("Passkey not found");
	}

	// Verify the authentication
	const publicKey = Buffer.from(passkey.public_key, "base64url");
	const verification: VerifiedAuthenticationResponse =
		await verifyAuthenticationResponse({
			response,
			expectedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			credential: {
				id: passkey.credential_id,
				publicKey,
				counter: passkey.counter,
			},
		});

	if (!verification.verified) {
		throw new Error("Authentication verification failed");
	}

	// Remove used challenge
	authenticationChallenges.delete(expectedChallenge);

	// Update counter and last used
	db.update(passkeys)
		.set({
			counter: verification.authenticationInfo.newCounter,
			last_used_at: new Date(),
		})
		.where(eq(passkeys.id, passkey.id))
		.run();

	return {
		userId: passkey.user_id,
		passkeyId: passkey.id,
	};
}

/**
 * Get all passkeys for a user
 */
export function getPasskeysForUser(userId: number): Passkey[] {
	const results = db
		.select()
		.from(passkeys)
		.where(eq(passkeys.user_id, userId))
		.all();

	return results.map((p) => ({
		id: p.id,
		user_id: p.user_id,
		credential_id: p.credential_id,
		public_key: p.public_key,
		counter: p.counter,
		transports: p.transports,
		name: p.name,
		created_at: Math.floor(p.created_at.getTime() / 1000),
		last_used_at: p.last_used_at
			? Math.floor(p.last_used_at.getTime() / 1000)
			: null,
	}));
}

/**
 * Delete a passkey
 */
export function deletePasskey(passkeyId: string, userId: number): boolean {
	const result = db.delete(passkeys).where(eq(passkeys.id, passkeyId)).run();

	return result.changes > 0;
}

/**
 * Update passkey name
 */
export function updatePasskeyName(
	passkeyId: string,
	userId: number,
	name: string,
): boolean {
	const result = db
		.update(passkeys)
		.set({ name })
		.where(eq(passkeys.id, passkeyId))
		.run();

	return result.changes > 0;
}
