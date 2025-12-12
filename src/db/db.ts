import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

// Use test database when NODE_ENV is test
const dbPath =
	process.env.NODE_ENV === "test" ? "tacy-stack.test.db" : "tacy-stack.db";

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

console.log(`[Database] Using database: ${dbPath}`);

export default db;
