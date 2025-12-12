# Tacy Stack

This is (in my very biased opinion) the absolute best and most enjoyable way to build detailed web apps on top of Bun.

It uses Lit, Bun, and Drizzle as the main stack and they all work together to make a wonderful combo.

## Quick Start

```bash
bunx tacy-stack
```

The CLI will guide you through creating a new project with an interactive prompt.

**Manual setup:**

```bash
git clone <this-repo> my-app
cd my-app
bun run setup
bun dev
```

Your server will be running at `http://localhost:3000` with hot module reloading. Just edit any `.ts`, `.html`, or `.css` file and watch it update in the browser.

## How does it work?

The development flow is really nice in my opinion. The server imports HTML files as route handlers. Those HTML files import TypeScript components using `<script type="module">`. The components are just Lit web components that self-register as custom elements. Bun sees all this and bundles everything automatically including linked styles.

```typescript
// src/index.ts - Server imports HTML as routes
import indexHTML from "./pages/index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": indexHTML,
  },
  development: {
    hmr: true,
    console: true,
  },
});
```

```html
<!-- src/pages/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="../styles/main.css" />
  </head>
  <body>
    <counter-component count="0"></counter-component>
    <script type="module" src="../components/counter.ts"></script>
  </body>
</html>
```

```typescript
// src/components/counter.ts
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("counter-component")
export class CounterComponent extends LitElement {
  @property({ type: Number }) count = 0;

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
  `;

  render() {
    return html`
      <div>${this.count}</div>
      <button @click=${() => this.count++}>+</button>
    `;
  }
}
```

The database uses Drizzle ORM for type-safe SQLite access. Schema changes are handled through migrations:

```bash
# Make changes to src/db/schema.ts, then:
bun run db:push       # Push schema to database
bun run db:studio    # Visual database browser
```

## Commands

```bash
bun dev              # Development server with hot reload
bun test             # Run tests
bun run db:generate  # Generate migrations from schema
bun run db:push      # Push schema to database
bun run db:studio    # Open Drizzle Studio
```

The canonical repo for this is hosted on tangled over at [`dunkirk.sh/tacy-stack`](https://tangled.org/@dunkirk.sh/tacy-stack)

<p align="center">
    <img src="https://raw.githubusercontent.com/taciturnaxolotl/carriage/main/.github/images/line-break.svg" />
</p>

<p align="center">
    <i><code>&copy 2025-present <a href="https://dunkirk.sh">Kieran Klukas</a></code></i>
</p>

<p align="center">
    <a href="https://tangled.org/dunkirk.sh/tacy-stack/raw/main/README.md"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=MIT&logoColor=d9e0ee&colorA=363a4f&colorB=b7bdf8"/></a>
</p>
