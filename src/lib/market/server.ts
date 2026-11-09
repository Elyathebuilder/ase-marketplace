/**
 * The app's single connection to the marketplace database (server only).
 * File: data/ase.db, or ASE_DB_PATH. Created and filled with demo data on first use.
 */
import path from "node:path";
import { openDb } from "./db";
import { seedOrders, seedUsers } from "./seed";
import type { Ctx } from "./service";

const g = globalThis as unknown as { __aseMarket?: Ctx };

export function market(): Ctx {
  if (typeof window !== "undefined") throw new Error("market() is server-only");
  if (!g.__aseMarket) {
    const file = process.env.ASE_DB_PATH || path.join(process.cwd(), "data", "ase.db");
    const ctx: Ctx = { db: openDb(file), now: () => new Date() };
    seedUsers(ctx);
    if (process.env.ASE_SEED_DEMO !== "0") seedOrders(ctx);
    g.__aseMarket = ctx;
  }
  return g.__aseMarket;
}

/** Fresh in-memory database, for tests. */
export function memoryMarket(now: () => Date = () => new Date()): Ctx {
  const ctx: Ctx = { db: openDb(":memory:"), now };
  seedUsers(ctx);
  return ctx;
}
