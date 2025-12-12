import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("counter-component")
export class CounterComponent extends LitElement {
	@property({ type: Number }) count = 0;
	@state() loading = false;
	@state() error = "";

	static override styles = css`
		:host {
			display: block;
			margin: 2rem 0;
			padding: 2rem;
			border: 2px solid var(--secondary);
			border-radius: 12px;
			text-align: center;
			background: white;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}

		h3 {
			margin: 0 0 1rem;
			color: var(--text);
			font-size: 1.5rem;
		}

		.counter-display {
			font-size: 4rem;
			font-weight: bold;
			margin: 1.5rem 0;
			color: var(--primary);
			font-variant-numeric: tabular-nums;
		}

		button {
			font-size: 1.25rem;
			padding: 0.75rem 1.5rem;
			margin: 0 0.5rem;
			border: 2px solid var(--primary);
			background: var(--background);
			color: var(--text);
			cursor: pointer;
			border-radius: 8px;
			transition: all 0.2s ease;
			font-weight: 500;
			font-family: inherit;
		}

		button:hover:not(:disabled) {
			background: var(--primary);
			color: var(--background);
			transform: translateY(-2px);
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		}

		button:active:not(:disabled) {
			transform: translateY(0);
		}

		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		button.reset {
			border-color: var(--accent);
		}

		button.reset:hover:not(:disabled) {
			background: var(--accent);
			color: var(--background);
		}

		.error {
			color: var(--accent);
			margin-top: 1rem;
			font-size: 0.875rem;
		}

		.loading {
			opacity: 0.6;
		}
	`;

	async updateCounter(action: "increment" | "decrement" | "reset") {
		this.loading = true;
		this.error = "";

		try {
			const response = await fetch(`/api/counter/${action}`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to update counter");
			}

			const data = await response.json();
			this.count = data.count;
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : "Failed to update counter";
		} finally {
			this.loading = false;
		}
	}

	override render() {
		return html`
			<div class=${this.loading ? "loading" : ""}>
				<h3>Your Counter</h3>
				<div class="counter-display">${this.count}</div>
				<div>
					<button
						@click=${() => this.updateCounter("decrement")}
						?disabled=${this.loading}
					>
						-
					</button>
					<button
						class="reset"
						@click=${() => this.updateCounter("reset")}
						?disabled=${this.loading}
					>
						Reset
					</button>
					<button
						@click=${() => this.updateCounter("increment")}
						?disabled=${this.loading}
					>
						+
					</button>
				</div>
				${this.error ? html`<div class="error">${this.error}</div>` : ""}
			</div>
		`;
	}
}
