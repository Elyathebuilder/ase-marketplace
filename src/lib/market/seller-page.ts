/**
 * For seller pages (server only): the signed-in seller and its own store, or null.
 * Each page calls this itself, because a page's content is sent separately from its layout.
 */
import { currentAccount } from "./auth";
import type { MakerRow } from "./catalog-store";
import { getMaker } from "./sellers";
import { market } from "./server";
import type { Actor } from "./types";

export interface SellerSession {
  actor: Actor & { manufacturerSlug: string };
  email: string;
  verified: boolean;
  store: MakerRow;
}

export async function sellerSession(): Promise<SellerSession | null> {
  const acct = await currentAccount();
  if (!acct || acct.actor.role !== "manufacturer" || !acct.actor.manufacturerSlug) return null;
  const store = getMaker(market(), acct.actor.manufacturerSlug);
  if (!store) return null;
  return { ...acct, actor: acct.actor as SellerSession["actor"], store };
}
