/**
 * The app's single connection to the marketplace database (server only).
 * File: data/ase.db, or ASE_DB_PATH. Created and filled with demo data on first use.
 */
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { bootstrapAdmin } from "./accounts";
import { openDb } from "./db";
import { seedOrders, seedUsers } from "./seed";
import { seedCatalog } from "./seed-catalog";
import type { Ctx } from "./service";

const g = globalThis as unknown as { __aseMarket?: Ctx };

export function market(): Ctx {
  if (typeof window !== "undefined") throw new Error("market() is server-only");
  if (!g.__aseMarket) {
    const file = process.env.ASE_DB_PATH || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "ase.db");
    // Several processes can start at once (build workers, a restart): a lock on a side file makes them
    // migrate and seed one after the other, so demo data is never inserted twice.
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    const lock = new DatabaseSync(file === ":memory:" ? ":memory:" : `${file}.lock`);
    lock.exec("PRAGMA busy_timeout = 60000; BEGIN EXCLUSIVE");
    try {
      const ctx: Ctx = { db: openDb(file), now: () => new Date() };
      // ASE_SEED_DEMO=0 (the live site): no demo accounts, sellers, products or orders.
      if (process.env.ASE_SEED_DEMO !== "0") {
        seedUsers(ctx);
        seedCatalog(ctx);
        seedOrders(ctx);
      }
      // The live site's first administrator comes from ASE_ADMIN_EMAIL / ASE_ADMIN_PASSWORD.
      bootstrapAdmin(ctx);
      g.__aseMarket = ctx;
    } finally {
      lock.exec("COMMIT");
      lock.close();
    }
  }
  return g.__aseMarket;
}

/** Fresh in-memory database, for tests. */
export function memoryMarket(now: () => Date = () => new Date(), testMode = false): Ctx {
  const ctx: Ctx = { db: openDb(":memory:"), now, testMode };
  seedUsers(ctx);
  seedCatalog(ctx);
  return ctx;
}
