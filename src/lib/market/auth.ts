/**
 * Sessions (server only). A signed, http-only cookie holds the user id and the account's session
 * version; the account itself (role, status) is read from the database on every request, so a
 * suspension or password reset takes effect immediately.
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

/** Cookie value: userId.version.expiry.signature */
export function encodeSession(userId: string, version = 1, now = Date.now()): string {
  const payload = `${userId}.${version}.${Math.floor(now / 1000) + MAX_AGE}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined, now = Date.now()): { userId: string; version: number } | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i < 0) return null;
  const payload = value.slice(0, i);
  const sig = Buffer.from(value.slice(i + 1));
  const good = Buffer.from(sign(payload));
  if (sig.length !== good.length || !timingSafeEqual(sig, good)) return null;
  const parts = payload.split(".");
  if (parts.length < 3) return null;
  const exp = Number(parts.pop());
  const version = Number(parts.pop());
  const userId = parts.join(".");
  if (!userId || !Number.isInteger(version) || !Number.isFinite(exp) || exp * 1000 < now) return null;
  return { userId, version };
}

interface SessionUser {
  id: string;
  role: Actor["role"];
  name: string;
  manufacturer_slug: string | null;
  status: string;
  session_version: number;
  email_verified_at: string | null;
  email: string;
}

const sessionUser = (id: string) =>
  market().db.prepare("SELECT id, role, name, manufacturer_slug, status, session_version, email_verified_at, email FROM users WHERE id = ?").get(id) as SessionUser | undefined;

/** The account for a session, if the session is still valid (same version, account active). */
export function actorFromSession(s: { userId: string; version: number } | null): Actor | null {
  if (!s) return null;
  const u = sessionUser(s.userId);
  if (!u || u.status !== "active" || u.session_version !== s.version) return null;
  return { id: u.id, role: u.role, name: u.name, manufacturerSlug: u.manufacturer_slug };
}

/** The signed-in user, or null. */
export async function currentActor(): Promise<Actor | null> {
  const jar = await cookies();
  return actorFromSession(decodeSession(jar.get(SESSION_COOKIE)?.value));
}

/** Extra account facts for pages (email confirmed?). */
export async function currentAccount(): Promise<{ actor: Actor; email: string; verified: boolean } | null> {
  const jar = await cookies();
  const s = decodeSession(jar.get(SESSION_COOKIE)?.value);
  const actor = actorFromSession(s);
  if (!actor || !s) return null;
  const u = sessionUser(s.userId)!;
  return { actor, email: u.email, verified: !!u.email_verified_at };
}

export async function startSession(userId: string) {
  const jar = await cookies();
  const u = sessionUser(userId);
  if (!u || u.status !== "active") return;
  jar.set(SESSION_COOKIE, encodeSession(userId, u.session_version), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Demo accounts shown on the sign-in page in TEST mode only. */
export function demoAccounts() {
  return market().db.prepare("SELECT id, role, name, manufacturer_slug FROM users WHERE is_demo = 1 AND status = 'active' ORDER BY CASE role WHEN 'customer' THEN 0 WHEN 'manufacturer' THEN 1 ELSE 2 END, name").all() as {
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
