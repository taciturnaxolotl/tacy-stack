import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
	authenticateWithPasskey,
	isPasskeySupported,
	registerPasskey,
} from "../lib/client-passkey";

interface User {
	username: string;
	name: string | null;
	avatar: string;
}

@customElement("auth-component")
export class AuthComponent extends LitElement {
	@state() user: User | null = null;
	@state() loading = true;
	@state() showModal = false;
	@state() username = "";
	@state() error = "";
	@state() isSubmitting = false;
	@state() passkeySupported = false;
	@state() showRegisterForm = false;

	static override styles = css`
		:host {
			display: block;
		}

		.auth-container {
			position: relative;
		}

		.auth-button {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			background: var(--primary);
			color: white;
			border: 2px solid var(--primary);
			border-radius: 8px;
			cursor: pointer;
			font-size: 1rem;
			font-weight: 500;
			transition: all 0.2s;
			font-family: inherit;
		}

		.auth-button:hover {
			background: transparent;
			color: var(--primary);
		}

		.user-info {
			display: flex;
			align-items: center;
			gap: 0.75rem;
		}

		.email {
			font-weight: 500;
			color: white;
			font-size: 0.875rem;
			transition: all 0.2s;
		}

		.auth-button:hover .email {
			color: var(--primary);
		}

		.modal-overlay {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 1000;
		}

		.modal {
			background: white;
			padding: 2rem;
			border-radius: 12px;
			max-width: 400px;
			width: 90%;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		}

		.modal h2 {
			margin: 0 0 1.5rem;
			color: var(--text);
		}

		.form-group {
			margin-bottom: 1rem;
		}

		label {
			display: block;
			margin-bottom: 0.5rem;
			color: var(--text);
			font-weight: 500;
		}

		input {
			width: 100%;
			padding: 0.75rem;
			border: 2px solid var(--secondary);
			border-radius: 8px;
			font-size: 1rem;
			font-family: inherit;
			box-sizing: border-box;
		}

		input:focus {
			outline: none;
			border-color: var(--primary);
		}

		.error {
			color: var(--accent);
			margin-bottom: 1rem;
			font-size: 0.875rem;
		}

		.button-group {
			display: flex;
			gap: 0.5rem;
			margin-top: 1.5rem;
		}

		button {
			flex: 1;
			padding: 0.75rem;
			border: 2px solid var(--primary);
			background: var(--primary);
			color: white;
			border-radius: 8px;
			cursor: pointer;
			font-size: 1rem;
			font-weight: 500;
			transition: all 0.2s;
			font-family: inherit;
		}

		button:hover {
			background: transparent;
			color: var(--primary);
		}

		button.secondary {
			background: transparent;
			color: var(--primary);
		}

		button.secondary:hover {
			background: var(--primary);
			color: white;
		}

		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.avatar {
			width: 32px;
			height: 32px;
			border-radius: 50%;
		}

		.loading {
			text-align: center;
			color: var(--text);
		}
	`;

	override connectedCallback() {
		super.connectedCallback();
		this.checkAuth();
		this.passkeySupported = isPasskeySupported();
	}

	async checkAuth() {
		try {
			const response = await fetch("/api/auth/me");
			if (response.ok) {
				this.user = await response.json();
			}
		} catch (error) {
			console.error("Auth check failed:", error);
		} finally {
			this.loading = false;
		}
	}

	async handleLogin() {
		this.isSubmitting = true;
		this.error = "";

		try {
			// Get authentication options
			const optionsRes = await fetch("/api/auth/passkey/authenticate/options");
			if (!optionsRes.ok) {
				throw new Error("Failed to get authentication options");
			}
			const options = await optionsRes.json();

			// Start authentication
			const credential = await authenticateWithPasskey(options);

			// Verify authentication
			const verifyRes = await fetch("/api/auth/passkey/authenticate/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ credential, challenge: options.challenge }),
			});

			if (!verifyRes.ok) {
				throw new Error("Authentication failed");
			}

			const user = await verifyRes.json();
			this.user = user;
			this.showModal = false;
			this.username = "";

			// Reload to update counter
			window.location.reload();
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : "Authentication failed";
		} finally {
			this.isSubmitting = false;
		}
	}

	async handleRegister() {
		this.isSubmitting = true;
		this.error = "";

		try {
			if (!this.username.trim()) {
				throw new Error("Username required");
			}

			// Get passkey registration options
			const optionsRes = await fetch(
				`/api/auth/passkey/register/options?username=${encodeURIComponent(this.username)}`,
			);
			if (!optionsRes.ok) {
				throw new Error("Failed to get registration options");
			}
			const options = await optionsRes.json();

			// Create passkey (this can be cancelled by user)
			const credential = await registerPasskey(options);

			// Register user with passkey atomically
			const registerRes = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: this.username,
					credential,
					challenge: options.challenge,
				}),
			});

			if (!registerRes.ok) {
				const data = await registerRes.json();
				throw new Error(data.error || "Registration failed");
			}

			const user = await registerRes.json();
			this.user = user;
			this.showModal = false;
			this.username = "";

			// Reload to update counter
			window.location.reload();
		} catch (error) {
			this.error = error instanceof Error ? error.message : "Registration failed";
		} finally {
			this.isSubmitting = false;
		}
	}

	async handleLogout() {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			this.user = null;
			window.location.reload();
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}

	override render() {
		if (this.loading) {
			return html`<div class="loading">Loading...</div>`;
		}

		return html`
			<div class="auth-container">
				${this.user
					? html`
							<button class="auth-button" @click=${this.handleLogout}>
								<div class="user-info">
									<img
										class="avatar"
										src="https://api.dicebear.com/7.x/shapes/svg?seed=${this.user.avatar}"
										alt="Avatar"
									/>
									<span class="email">${this.user.username}</span>
								</div>
							</button>
						`
					: html`
							<button class="auth-button" @click=${() => (this.showModal = true)}>
								Sign In
							</button>
						`}
				${this.showModal
					? html`
							<div class="modal-overlay" @click=${() => {
								this.showModal = false;
								this.showRegisterForm = false;
							}}>
								<div class="modal" @click=${(e: Event) => e.stopPropagation()}>
									<h2>Welcome</h2>
									${this.error ? html`<div class="error">${this.error}</div>` : ""}
									${!this.passkeySupported
										? html`
												<div class="error">
													Passkeys are not supported in this browser.
												</div>
											`
										: ""}
									${this.showRegisterForm
										? html`
												<div class="form-group">
													<label for="username">Username</label>
													<input
														type="text"
														id="username"
														placeholder="Choose a username"
														.value=${this.username}
														@input=${(e: Event) =>
															(this.username = (e.target as HTMLInputElement).value)}
														?disabled=${this.isSubmitting}
													/>
												</div>
												<div class="button-group">
													<button
														class="secondary"
														@click=${() => {
															this.showRegisterForm = false;
															this.username = "";
															this.error = "";
														}}
														?disabled=${this.isSubmitting}
													>
														Back
													</button>
													<button
														@click=${this.handleRegister}
														?disabled=${this.isSubmitting ||
														!this.username.trim() ||
														!this.passkeySupported}
													>
														Register
													</button>
												</div>
											`
										: html`
												<div class="button-group">
													<button
														@click=${this.handleLogin}
														?disabled=${this.isSubmitting || !this.passkeySupported}
													>
														Sign In
													</button>
													<button
														class="secondary"
														@click=${() => (this.showRegisterForm = true)}
														?disabled=${this.isSubmitting || !this.passkeySupported}
													>
														Register
													</button>
												</div>
											`}
								</div>
							</div>
						`
					: ""}
			</div>
		`;
	}
}
