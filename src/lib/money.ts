import type { Lang } from "@/i18n/config";
import { numberFormat } from "./format";

/**
 * Money is stored and calculated in whole tetri (1 ₾ = 100 tetri) as integers,
 * so sums and commissions are exact. Never add or multiply lari as floating-point numbers.
 */
export type Tetri = number;

/** Lari amount from a catalog price or a form ("12.5", "1,080.00") → whole tetri. Throws on bad input. */
export function toTetri(value: number | string): Tetri {
  const s = typeof value === "number" ? value.toFixed(2) : value.replace(/[\s,₾]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: ${value}`);
  const [whole, frac = ""] = s.split(".");
  const t = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(t)) throw new Error(`Amount too large: ${value}`);
  return t;
}

/** Tetri → lari number, only for display. */
export const toLari = (t: Tetri): number => t / 100;

/** Percentage in basis points (500 = 5%) of an amount, rounded half up to the tetri. Integer maths only. */
export function percentOf(amount: Tetri, basisPoints: number): Tetri {
  if (!Number.isSafeInteger(amount) || !Number.isInteger(basisPoints) || basisPoints < 0) throw new Error("Invalid percentage input");
  return Math.floor((amount * basisPoints + 5000) / 10000);
}

/** "1,080.00 ₾" in English, "1 080,00 ₾" in Russian … Only the display changes by language, never the amount. */
export const formatTetri = (t: Tetri, lang?: Lang): string => `${t < 0 ? "−" : ""}${numberFormat(lang, 2, 2).format(Math.abs(t) / 100)} ₾`;

/** "5%" or "7,5%" from basis points; Turkish writes the sign first ("%5"). */
export const formatBps = (bps: number, lang?: Lang): string => {
  const n = numberFormat(lang, 0, 2).format(bps / 100);
  return lang === "tr" ? `%${n}` : `${n}%`;
};
