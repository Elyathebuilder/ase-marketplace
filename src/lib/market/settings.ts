/**
 * Admin-editable settings: commission and Amartani's bank details.
 *
 * Every change is kept in settings_history (append-only). A change only affects orders placed
 * afterwards: each order stores its own commission rate and base when it is placed.
 */
import { tx } from "./db";
import type { Ctx } from "./service";
import { MarketError, type Actor, type CommissionBase } from "./types";

export interface Settings {
  /** Commission in basis points: 500 = 5%. */
  commissionBps: number;
  /** What the commission is taken from: products only (default) or products and delivery. */
  commissionBase: CommissionBase;
  /** Hours the customer has to pay after ordering. 0 = no deadline. */
  paymentDeadlineHours: number;
  bankAccountHolder: string;
  bankName: string;
  bankIban: string;
  bankSwift: string;
  /** When on, a seller's product waits for an admin before it is shown publicly. */
  productModeration: boolean;
  /**
   * Test mode: every new order is a TEST order. Customers see test bank details that are not a
   * real account, and test orders are left out of the financial totals. On unless ASE_TEST_MODE=0.
   * Not editable in the admin pages, so it can't be switched off by accident.
   */
  testMode: boolean;
}

/** Demo defaults. The bank details are clearly placeholders until the owner enters the real ones. */
export const DEFAULT_SETTINGS: Settings = {
  commissionBps: 500,
  commissionBase: "products",
  paymentDeadlineHours: 72,
  bankAccountHolder: "Amartani LLC (demo)",
  bankName: "Demo Bank of Georgia",
  bankIban: "GE00 DEMO 0000 0000 0000 00",
  bankSwift: "DEMOGE22",
  productModeration: false,
  testMode: true,
};

export { TEST_BANK } from "./test-bank";

export const isTestMode = () => process.env.ASE_TEST_MODE !== "0";

type EditableKey = Exclude<keyof Settings, "testMode">;
const KEYS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is EditableKey => k !== "testMode");

export function getSettings(ctx: Ctx): Settings {
  const rows = ctx.db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const out: Settings = { ...DEFAULT_SETTINGS, testMode: ctx.testMode ?? isTestMode() };
  for (const { key, value } of rows) {
    if (!KEYS.includes(key as EditableKey)) continue;
    const k = key as EditableKey;
    (out as unknown as Record<string, unknown>)[k] = typeof DEFAULT_SETTINGS[k] === "number" ? Number(value) : typeof DEFAULT_SETTINGS[k] === "boolean" ? value === "1" : value;
  }
  return out;
}

function validate(k: EditableKey, v: unknown): string {
  switch (k) {
    case "commissionBps": {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 5000) throw new MarketError("invalid_input", "commission must be 0–50%");
      return String(n);
    }
    case "paymentDeadlineHours": {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 24 * 30) throw new MarketError("invalid_input", "deadline must be 0–720 hours");
      return String(n);
    }
    case "productModeration":
      return v === true || v === "1" || v === "on" || v === "true" ? "1" : "0";
    case "commissionBase":
      if (v !== "products" && v !== "products_and_delivery") throw new MarketError("invalid_input", "invalid commission base");
      return v;
    default: {
      const s = typeof v === "string" ? v.trim() : "";
      if (!s || s.length > 120) throw new MarketError("invalid_input", `invalid ${k}`);
      return s;
    }
  }
}

/** Only an admin can change settings. Unknown keys are ignored. */
export function updateSettings(ctx: Ctx, actor: Actor | null, patch: Partial<Record<keyof Settings, unknown>>) {
  if (!actor || actor.role !== "admin") throw new MarketError("forbidden");
  const current = getSettings(ctx);
  const stored = (v: unknown) => (typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  const changes = KEYS.filter((k) => k in patch).map((k) => [k, validate(k, patch[k]), stored(current[k])] as const);
  const at = ctx.now().toISOString();
  tx(ctx.db, () => {
    for (const [k, value, old] of changes) {
      if (value === old) continue;
      ctx.db
        .prepare("INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by")
        .run(k, value, at, actor.id);
      ctx.db.prepare("INSERT INTO settings_history (key, old_value, new_value, changed_at, changed_by) VALUES (?,?,?,?,?)").run(k, old, value, at, actor.id);
    }
  });
}

export function settingsHistory(ctx: Ctx, actor: Actor | null) {
  if (!actor || actor.role !== "admin") throw new MarketError("forbidden");
  return ctx.db.prepare("SELECT * FROM settings_history ORDER BY id DESC LIMIT 100").all() as {
    id: number;
    key: string;
    old_value: string | null;
    new_value: string;
    changed_at: string;
    changed_by: string | null;
  }[];
}
