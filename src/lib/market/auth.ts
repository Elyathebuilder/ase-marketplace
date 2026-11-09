/**
 * Demo sign-in (server only). A signed, http-only cookie holds the user id.
 * It is replaced by Supabase Auth in Phase 2; the roles and permission checks stay the same.
 *
 * The signing secret comes from ASE_SESSION_SECRET. Without it, a random secret is created
 * once in data/.session-secret (never committed, never sent to the browser).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { market } from "./server";
import type { Actor } from "./types";

export const SESSION_COOKIE = "ase_session";
const MAX_AGE = 60 * 60 * 24 * 7;

let cached: string | undefined;
function secret(): string {
  if (process.env.ASE_SESSION_SECRET) return process.env.ASE_SESSION_SECRET;
  if (cached) return cached;
  const file = path.join(/* turbopackIgnore: true */ process.cwd(), "data", ".session-secret");
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  cached = readFileSync(file, "utf8").trim();
  return cached;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(userId: string, now = Date.now()): string {
  const payload = `${userId}.${Math.floor(now / 1000) + MAX_AGE}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i < 0) return null;
  const payload = value.slice(0, i);
  const sig = Buffer.from(value.slice(i + 1));
  const good = Buffer.from(sign(payload));
  if (sig.length !== good.length || !timingSafeEqual(sig, good)) return null;
  const [userId, exp] = [payload.slice(0, payload.lastIndexOf(".")), Number(payload.slice(payload.lastIndexOf(".") + 1))];
  if (!userId || !Number.isFinite(exp) || exp * 1000 < now) return null;
  return userId;
}

export function actorById(id: string | null): Actor | null {
  if (!id) return null;
  const u = market().db.prepare("SELECT id, role, name, manufacturer_slug FROM users WHERE id = ?").get(id) as
    | { id: string; role: Actor["role"]; name: string; manufacturer_slug: string | null }
    | undefined;
  return u ? { id: u.id, role: u.role, name: u.name, manufacturerSlug: u.manufacturer_slug } : null;
}

/** The signed-in user, or null. */
export async function currentActor(): Promise<Actor | null> {
  const jar = await cookies();
  return actorById(decodeSession(jar.get(SESSION_COOKIE)?.value));
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(userId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Demo accounts shown on the sign-in page. */
export function demoAccounts() {
  return market().db.prepare("SELECT id, role, name, manufacturer_slug FROM users ORDER BY CASE role WHEN 'customer' THEN 0 WHEN 'manufacturer' THEN 1 ELSE 2 END, name").all() as {
    id: string;
    role: Actor["role"];
    name: string;
    manufacturer_slug: string | null;
  }[];
}

/**
 * For admin pages: the admin, or null. Each page checks this itself (not only the layout),
 * because a page's content is sent separately from its layout.
 */
export async function adminOrNull(): Promise<Actor | null> {
  const a = await currentActor();
  return a?.role === "admin" ? a : null;
}
