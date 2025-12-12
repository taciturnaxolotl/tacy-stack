/**
 * Client-side passkey utilities using SimpleWebAuthn browser
 */

import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import type {
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

/**
 * Check if passkeys are supported in this browser
 */
export function isPasskeySupported(): boolean {
	return (
		window?.PublicKeyCredential !== undefined &&
		typeof window.PublicKeyCredential === "function"
	);
}

/**
 * Register a new passkey
 */
export async function registerPasskey(
	options: PublicKeyCredentialCreationOptionsJSON,
) {
	return await startRegistration({ optionsJSON: options });
}

/**
 * Authenticate with a passkey
 */
export async function authenticateWithPasskey(
	options: PublicKeyCredentialRequestOptionsJSON,
) {
	return await startAuthentication({ optionsJSON: options });
}
