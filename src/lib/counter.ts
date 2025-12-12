import { eq } from "drizzle-orm";
import db from "../db/db";
import { counters } from "../db/schema";

export function getCounterForUser(userId: number): number {
	const counter = db
		.select()
		.from(counters)
		.where(eq(counters.user_id, userId))
		.get();

	return counter?.count ?? 0;
}

export function incrementCounter(userId: number): number {
	// Try to update existing counter
	const existing = db
		.select()
		.from(counters)
		.where(eq(counters.user_id, userId))
		.get();

	if (existing) {
		const newCount = existing.count + 1;
		db.update(counters)
			.set({ count: newCount, updated_at: new Date() })
			.where(eq(counters.user_id, userId))
			.run();
		return newCount;
	}

	// Create new counter starting at 1
	db.insert(counters).values({ user_id: userId, count: 1 }).run();
	return 1;
}

export function decrementCounter(userId: number): number {
	const existing = db
		.select()
		.from(counters)
		.where(eq(counters.user_id, userId))
		.get();

	if (existing) {
		const newCount = existing.count - 1;
		db.update(counters)
			.set({ count: newCount, updated_at: new Date() })
			.where(eq(counters.user_id, userId))
			.run();
		return newCount;
	}

	// Create new counter starting at -1
	db.insert(counters).values({ user_id: userId, count: -1 }).run();
	return -1;
}

export function resetCounter(userId: number): void {
	db.update(counters)
		.set({ count: 0, updated_at: new Date() })
		.where(eq(counters.user_id, userId))
		.run();
}
