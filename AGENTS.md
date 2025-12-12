# Tacy Stack - Agent Guidelines

This is a minimal full-stack web application starter built on the Bun fullstack pattern. It demonstrates passkey authentication, user-specific data storage, and reactive web components.

## Project Overview

**What is Tacy Stack?**
A TypeScript-based web stack using:
- **Bun** - Fast JavaScript runtime and bundler
- **TypeScript** - Strict typing with decorators enabled
- **Lit** - Lightweight (~8-10KB) web components library
- **Drizzle ORM** - Type-safe SQLite database access
- **Passkeys (WebAuthn)** - Passwordless authentication

**Demo Application Features:**
- User registration and login via passkeys (no passwords!)
- User-specific click counter stored in database
- Reactive UI with Lit web components
- Session management with cookies

## Commands

```bash
# Install dependencies
bun install

# Development server with hot reload (default: localhost:3000)
bun dev

# Database management
bun run db:generate    # Generate migration files from schema changes
bun run db:push        # Push schema directly to database (for development)
bun run db:studio      # Open Drizzle Studio (visual database browser)

# Testing
bun test              # Run all tests
```

**IMPORTANT:** Never run `bun dev` yourself - the user always has it running already with HMR enabled.

## Tech Stack Philosophy

### NO FRAMEWORKS

**Explicitly forbidden:**
- React, React DOM
- Vue
- Svelte
- Angular
- Any framework with virtual DOM or large runtime

**Why?** This project prioritizes:
- **Speed:** Minimal JavaScript, fast load times
- **Small bundles:** Keep total JS under 50KB
- **Native web platform:** Web standards over framework abstractions
- **Simplicity:** Vanilla HTML, CSS, and TypeScript

**Allowed:**
- Lit (~8-10KB) for reactive web components
- Native Web Components API
- Plain JavaScript/TypeScript
- Native DOM APIs

### When to use Lit

**Use Lit for:**
- Components with reactive properties (auto-updates on data changes)
- Complex components needing scoped styles
- Form controls with internal state
- Components with lifecycle needs

**Skip Lit for:**
- Static content (use plain HTML)
- Simple one-off interactions (use vanilla JS)
- Anything without reactive state

## Project Structure

Based on Bun's fullstack pattern where HTML files are imported as modules:

```
src/
  index.ts              # Server entry point, imports HTML routes
  db/
    db.ts               # Drizzle database instance
    schema.ts           # Database schema (Drizzle tables)
  lib/
    auth.ts             # User/session management
    passkey.ts          # WebAuthn passkey logic
    counter.ts          # Counter business logic
    middleware.ts       # Auth middleware
    client-passkey.ts   # Client-side passkey helpers
  pages/
    index.html          # Route entry point (imports components)
  components/
    auth.ts             # Login/register Lit component
    counter.ts          # Counter Lit component
  styles/
    main.css            # Global styles
public/                 # Static assets (if needed)
```

**File flow:**
1. `src/index.ts` imports HTML: `import indexHTML from "./pages/index.html"`
2. HTML imports components: `<script type="module" src="../components/auth.ts"></script>`
3. HTML links styles: `<link rel="stylesheet" href="../styles/main.css">`
4. Components self-register via `@customElement` decorator
5. Bun bundles everything automatically during development

## Database (Drizzle ORM)

**Database file:** `tacy-stack.db` (SQLite, auto-created)

**Schema location:** `src/db/schema.ts`

**Tables:**
- `users` - User accounts (id, email, name, avatar, created_at)
- `sessions` - Active sessions (id, user_id, ip, user_agent, expires_at)
- `passkeys` - WebAuthn credentials (id, user_id, credential_id, public_key, counter, etc.)
- `counters` - User click counters (user_id, count, updated_at)

**Making schema changes:**
1. Edit `src/db/schema.ts` (modify tables using Drizzle syntax)
2. Run `bun run db:push` to apply changes to database
3. For production, use `bun run db:generate` to create migrations
4. Schema changes are type-safe and auto-complete in your IDE

**Querying patterns:**
```typescript
import { eq } from "drizzle-orm";
import db from "../db/db";
import { users } from "../db/schema";

// Select with where clause
const user = db.select().from(users).where(eq(users.id, userId)).get();

// Insert
db.insert(users).values({ email, name, avatar }).run();

// Update
db.update(users).set({ name: "New Name" }).where(eq(users.id, userId)).run();

// Delete
db.delete(users).where(eq(users.id, userId)).run();
```

**Important:** Use `.get()` for single results, `.all()` for arrays, `.run()` for mutations.

## TypeScript Configuration

**Strict mode enabled:**
- `strict: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`

**Decorators:**
- `experimentalDecorators: true` (required for Lit's `@customElement`, `@property`, etc.)
- `useDefineForClassFields: false` (required for Lit decorators)

**Module system:**
- `moduleResolution: "bundler"`
- `module: "Preserve"`
- Can import `.ts` extensions directly
- JSX: `preserve` (NOT react-jsx - we don't use React!)

**Deliberately disabled:**
- `noUnusedLocals: false`
- `noUnusedParameters: false`
- `noPropertyAccessFromIndexSignature: false`

## Bun Usage

**Always use Bun instead of Node.js:**
- ✅ `bun <file>` NOT `node <file>` or `ts-node <file>`
- ✅ `bun test` NOT `jest` or `vitest`
- ✅ `bun build <file>` NOT `webpack` or `esbuild`
- ✅ `bun install` NOT `npm install`
- ✅ `bun run <script>` NOT `npm run <script>`

**Bun built-in APIs (prefer over npm packages):**
- `Bun.serve()` for HTTP server (don't use Express)
- `bun:sqlite` for SQLite (but we use Drizzle which wraps it)
- `Bun.file()` for file I/O (prefer over `node:fs`)
- `.env` auto-loads (no dotenv package needed)

## Server Setup (Bun.serve)

Use `Bun.serve()` with the `routes` pattern:

```typescript
import indexHTML from "./pages/index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": indexHTML,                    // HTML route
    "/api/users/:id": {                // API route with params
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  development: {
    hmr: true,      // Hot module reloading
    console: true,  // Enhanced console output
  },
});
```

**Route params:** Access via `req.params.paramName`

**Request helpers:**
- `await req.json()` - Parse JSON body
- `req.headers.get("cookie")` - Get header
- `req.url` - Full URL

## Frontend Pattern

**HTML files import TypeScript modules directly:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - Tacy Stack</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🥞</text></svg>">
  <link rel="stylesheet" href="../styles/main.css">
</head>
<body>
  <header>
    <nav>
      <h1>🥞 Tacy Stack</h1>
      <auth-component></auth-component>
    </nav>
  </header>

  <main>
    <h1>Page Title</h1>
    <counter-component count="0"></counter-component>
  </main>

  <script type="module" src="../components/auth.ts"></script>
  <script type="module" src="../components/counter.ts"></script>
</body>
</html>
```

**Standard HTML template parts:**
- Pancake emoji favicon
- Proper meta tags (charset, viewport)
- Auth component in header nav
- Main content area
- Module scripts at end of body

**No build step needed:** Bun transpiles and bundles automatically during development.

## Lit Web Components

**Basic component structure:**

```typescript
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("my-component")
export class MyComponent extends LitElement {
  // Public reactive properties (can be set via HTML attributes)
  @property({ type: String }) name = "World";

  // Private reactive state (internal only)
  @state() private count = 0;

  // Scoped styles using css tagged template
  static override styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
    .greeting {
      color: var(--primary);
    }
  `;

  // Render using html tagged template
  override render() {
    return html`
      <div class="greeting">
        Hello, ${this.name}!
        <button @click=${() => this.count++}>
          Clicked ${this.count} times
        </button>
      </div>
    `;
  }
}
```

**Key Lit features:**
- `@customElement("tag-name")` - Register component
- `@property()` - Public reactive property (triggers re-render)
- `@state()` - Private reactive state (triggers re-render)
- `html` - Template literal for rendering
- `css` - Scoped styles (don't leak out)
- Event handlers: `@click=${handler}` or `@click=${() => ...}`
- Automatic re-rendering when properties/state change

## Design System

**Color palette (CSS variables):**
```css
:root {
  /* Named colors */
  --yale-blue: #033f63ff;      /* dark blue */
  --stormy-teal: #28666eff;    /* medium teal */
  --muted-teal: #7c9885ff;     /* soft teal */
  --dry-sage: #b5b682ff;       /* sage green */
  --soft-peach: #fedc97ff;     /* warm peach */

  /* Semantic assignments */
  --text: var(--yale-blue);
  --background: var(--soft-peach);
  --primary: var(--stormy-teal);
  --secondary: var(--muted-teal);
  --accent: var(--dry-sage);
}
```

**CRITICAL COLOR RULES:**
- ❌ NEVER hardcode colors: `#4f46e5`, `white`, `red`, etc.
- ✅ ALWAYS use CSS variables: `var(--primary)`, `var(--accent)`, `var(--text)`, etc.

**Dimension rules:**
- Use `rem` for all sizes (not `px`)
- Base: 16px = 1rem
- Common values: `0.5rem`, `1rem`, `1.5rem`, `2rem`, `3rem`
- Max widths: `48rem` (content), `56rem` (forms/data)
- Spacing scale: `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem`, `3rem`

## Authentication & Sessions

**Flow:**
1. User enters email/name and clicks "Register"
2. `POST /api/auth/register` creates user and session
3. `GET /api/auth/passkey/register/options` gets WebAuthn options
4. Client calls `startRegistration()` from `@simplewebauthn/browser`
5. `POST /api/auth/passkey/register/verify` stores passkey
6. Session cookie set, user logged in

**Login flow:**
1. User clicks "Sign In"
2. `GET /api/auth/passkey/authenticate/options` gets WebAuthn challenge
3. Client calls `startAuthentication()` from `@simplewebauthn/browser`
4. `POST /api/auth/passkey/authenticate/verify` verifies and creates session
5. Session cookie set, user logged in

**Session management:**
- Sessions stored in `sessions` table
- Cookie name: `session`
- Duration: 7 days
- HTTPOnly, SameSite=Strict

**Auth helpers:**
- `getSessionFromRequest(req)` - Extract session ID from cookie
- `getUserBySession(sessionId)` - Get user from session
- `requireAuth(req)` - Middleware that throws if not authenticated

## API Response Patterns

**Success:**
```typescript
return new Response(JSON.stringify({ count: 42 }), {
  headers: { "Content-Type": "application/json" },
});
```

**Error:**
```typescript
return new Response(JSON.stringify({ error: "Not authenticated" }), {
  status: 401,
});
```

**With cookie:**
```typescript
return new Response(JSON.stringify(user), {
  headers: {
    "Content-Type": "application/json",
    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
  },
});
```

## Code Conventions

**Naming:**
- PascalCase: Components, classes (`AuthComponent`, `CounterComponent`)
- camelCase: Functions, variables (`getUserByEmail`, `sessionId`)
- kebab-case: File names, custom element tags (`auth.ts`, `counter-component`)

**File organization:**
- Place tests next to code: `foo.ts` → `foo.test.ts`
- Keep related code together (e.g., all auth logic in `lib/auth.ts`)
- Components are self-contained (logic + styles + template)

**Before writing code:**
1. Check if library exists (look at imports, package.json)
2. Read similar code for patterns
3. Match existing style
4. Never assume libraries are available - verify first

## Testing

Use `bun test` with Bun's built-in test runner:

```typescript
import { test, expect } from "bun:test";

test("creates user with avatar", async () => {
  const user = await createUser("test@example.com", "Test User");
  expect(user.email).toBe("test@example.com");
  expect(user.avatar).toBeTruthy();
});
```

**What to test:**
- ✅ Security-critical functions (auth, sessions, passkeys)
- ✅ Complex business logic (counter operations)
- ✅ Edge cases (empty inputs, missing data)
- ❌ Simple getters/setters
- ❌ Framework/library code
- ❌ One-line utilities

**Test file naming:** `*.test.ts` (auto-discovered by Bun)

## Environment Variables

Copy `.env.example` to `.env`:

```bash
# WebAuthn/Passkey Configuration
RP_ID=localhost              # Your domain (localhost for dev)
ORIGIN=http://localhost:3000 # Full app URL

# Environment
NODE_ENV=development
```

**Production values:**
- `RP_ID` - Your domain (e.g., `tacy-stack.app`)
- `ORIGIN` - Full public URL (e.g., `https://tacy-stack.app`)

**Important:** Bun auto-loads `.env`, no dotenv package needed.

## Common Tasks

### Adding a new route
1. Create HTML file in `src/pages/` (e.g., `about.html`)
2. Import in `src/index.ts`: `import aboutHTML from "./pages/about.html"`
3. Add to routes: `"/about": aboutHTML`

### Adding a new API endpoint
Add to `routes` object in `src/index.ts`:
```typescript
"/api/my-endpoint": {
  GET: async (req) => {
    const userId = await requireAuth(req);
    // ... your logic
    return new Response(JSON.stringify({ data }));
  },
},
```

### Adding a new component
1. Create `src/components/my-component.ts`
2. Use `@customElement("my-component")` decorator
3. Import in HTML: `<script type="module" src="../components/my-component.ts"></script>`
4. Use in HTML: `<my-component></my-component>`

### Adding a database table
1. Edit `src/db/schema.ts`:
```typescript
export const myTable = sqliteTable("my_table", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});
```
2. Run `bun run db:push` (pushes schema to database)
3. Query: `db.select().from(myTable).all()`

### Adding styles
- Global styles: Edit `src/styles/main.css`
- Component-scoped: Use `static styles = css\`...\`` in Lit component
- Always use CSS variables for colors

## Formatting & Linting

**Biome** is configured for formatting and linting:
- Indent style: Tabs
- Quote style: Double quotes
- Auto-organize imports enabled

**LSP support:** Biome provides IDE integration for formatting/linting.

## Gotchas

1. **Don't use Node.js commands** - Use `bun` not `node`, `npm`, `npx`
2. **Don't install Express/Vite** - Bun has built-in equivalents
3. **NEVER use React** - Explicitly forbidden, use Lit or vanilla JS
4. **Import .ts extensions** - Bun allows direct `.ts` imports
5. **No dotenv needed** - Bun loads `.env` automatically
6. **HTML imports are special** - They trigger Bun's bundler
7. **Bundle size matters** - Measure impact before adding libraries
8. **Drizzle queries** - Use `.get()` for single row, `.all()` for array, `.run()` for mutations
9. **Decorators required** - Must enable `experimentalDecorators` for Lit
10. **Session from cookies** - Use `getSessionFromRequest(req)` to extract session ID

## Development Workflow

1. Make changes to `.ts`, `.html`, or `.css` files
2. Bun's HMR automatically reloads in browser
3. Write tests in `*.test.ts` files
4. Run `bun test` to verify
5. Check database with `bun run db:studio` if needed

**Never run `bun dev` yourself** - user has it running with hot reload already.

## Resources

- [Bun Fullstack Documentation](https://bun.com/docs/bundler/fullstack)
- [Lit Documentation](https://lit.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [Web Components MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- Bun API docs: `node_modules/bun-types/docs/**.md`

## Key Differences from Thistle

This project is based on Thistle but simplified:
- ✅ **Drizzle ORM** instead of raw `bun:sqlite` queries
- ✅ **Simpler demo** (just counter, no transcription service)
- ❌ **No subscriptions** (no Polar integration)
- ❌ **No email** (no MailChannels, verification codes)
- ❌ **No admin system** (no roles, no admin panel)
- ❌ **No rate limiting** (simplified for demo)
- ❌ **No password auth** (passkeys only)

Focus is on demonstrating the core pattern: Bun + TypeScript + Lit + Drizzle + Passkeys.
