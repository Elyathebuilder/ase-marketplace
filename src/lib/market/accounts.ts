/**
 * Accounts: registration, email verification, sign-in, password reset, profile, addresses and
 * account suspension (server only).
 *
 * - Passwords are stored only as scrypt hashes with a random salt (node:crypto, no extra dependency).
 * - Verification and reset links carry a random token; only its SHA-256 hash is stored, it expires
 *   and works once.
 * - The role comes from which registration form was used and is stored in the database. The browser
 *   can't choose or change it later.
 * - Every session cookie carries the account's session version: resetting the password or
 *   suspending the account signs the account out everywhere.
 */
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { tx } from "./db";
import { queueEmail } from "./mailer";
import { getDict, type Lang } from "@/i18n";
import type { Ctx } from "./service";
import { MarketError, type Actor } from "./types";

/* ------------------------------------------------------------------ */
/* Passwords and tokens                                                 */
/* ------------------------------------------------------------------ */

const N = 16384;
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N, r: 8, p: 1 });
  return `scrypt$${N}$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function checkPassword(pw: string, stored: string | null): boolean {
  if (!stored) return false;
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64");
  const got = scryptSync(pw, Buffer.from(salt, "base64"), want.length, { N: Number(n), r: Number(r), p: Number(p) });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** At least 8 characters with a letter and a digit. */
export function validatePassword(pw: unknown, confirm: unknown): string {
  if (typeof pw !== "string" || pw.length < 8 || pw.length > 200 || !/\p{L}/u.test(pw) || !/\d/.test(pw)) throw new MarketError("weak_password");
  if (pw !== confirm) throw new MarketError("password_mismatch");
  return pw;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function issueToken(ctx: Ctx, userId: string, purpose: "verify_email" | "reset_password", hours: number): string {
  const token = randomBytes(32).toString("base64url");
  const now = ctx.now();
  // A new link replaces older unused ones for the same purpose.
  ctx.db.prepare("UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND purpose = ? AND used_at IS NULL").run(now.toISOString(), userId, purpose);
  ctx.db
    .prepare("INSERT INTO auth_tokens (token_hash, user_id, purpose, created_at, expires_at) VALUES (?,?,?,?,?)")
    .run(sha(token), userId, purpose, now.toISOString(), new Date(now.getTime() + hours * 3600_000).toISOString());
  return token;
}

function useToken(ctx: Ctx, token: unknown, purpose: "verify_email" | "reset_password"): string {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) throw new MarketError("token_invalid");
  const row = ctx.db.prepare("SELECT * FROM auth_tokens WHERE token_hash = ? AND purpose = ?").get(sha(token), purpose) as
    | { user_id: string; expires_at: string; used_at: string | null }
    | undefined;
  if (!row || row.used_at || row.expires_at < ctx.now().toISOString()) throw new MarketError("token_invalid");
  ctx.db.prepare("UPDATE auth_tokens SET used_at = ? WHERE token_hash = ?").run(ctx.now().toISOString(), sha(token));
  return row.user_id;
}

/* ------------------------------------------------------------------ */
/* Users                                                                */
/* ------------------------------------------------------------------ */

export interface UserRow {
  id: string;
  role: Actor["role"];
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string;
  manufacturer_slug: string | null;
  password_hash: string | null;
  email_verified_at: string | null;
  status: "active" | "suspended";
  status_reason: string | null;
  created_at: string | null;
  session_version: number;
  is_demo: number;
}

export const getUser = (ctx: Ctx, id: string) => ctx.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as UserRow | undefined;
const userByEmail = (ctx: Ctx, email: string) => ctx.db.prepare("SELECT * FROM users WHERE lower(email) = ?").get(email) as unknown as UserRow | undefined;

export function normalizeEmail(v: unknown): string {
  const e = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (e.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new MarketError("invalid_input", "invalid email");
  return e;
}

export function cleanName(v: unknown, max = 80): string {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  if (!s || s.length > max) throw new MarketError("invalid_input", "name");
  return s;
}

const cleanPhone = (v: unknown, required = false) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) {
    if (required) throw new MarketError("invalid_input", "phone");
    return null;
  }
  if (s.length > 40 || !/^[+\d][\d\s()-]{5,}$/.test(s)) throw new MarketError("invalid_input", "phone");
  return s;
};

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  phone?: string;
  lang?: Lang;
}

function createUser(ctx: Ctx, role: "customer" | "manufacturer", input: RegisterInput, manufacturerSlug: string | null) {
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password, input.confirm);
  const phone = cleanPhone(input.phone);
  if (userByEmail(ctx, email)) throw new MarketError("email_taken");
  const id = `${role === "customer" ? "cus" : "sel"}-${randomUUID()}`;
  ctx.db
    .prepare(
      "INSERT INTO users (id, role, name, first_name, last_name, phone, email, manufacturer_slug, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    )
    .run(id, role, `${firstName} ${lastName}`, firstName, lastName, phone, email, manufacturerSlug, hashPassword(password), ctx.now().toISOString());
  return { id, email };
}

/** Email in both languages: the reader may use either. */
function bilingual(fn: (lang: Lang) => { subject: string; text: string }) {
  const ka = fn("ka");
  const en = fn("en");
  return { subject: `${ka.subject} / ${en.subject}`, text: `${ka.text}\n\n---\n\n${en.text}` };
}

export function sendVerification(ctx: Ctx, userId: string) {
  const u = getUser(ctx, userId);
  if (!u || u.email_verified_at) return;
  const token = issueToken(ctx, u.id, "verify_email", 48);
  const mail = bilingual((l) => getDict(l).acc.mail.verify(u.first_name ?? u.name));
  queueEmail(ctx, { userId: u.id, to: u.email, kind: "verify_email", ...mail, link: `/api/auth/verify?token=${token}` });
}

/** Customer registration. Returns the new user's id; the account must confirm its email before ordering. */
export function registerCustomer(ctx: Ctx, input: RegisterInput): string {
  return tx(ctx.db, () => {
    const { id } = createUser(ctx, "customer", input, null);
    sendVerification(ctx, id);
    return id;
  });
}

/** Seller registration, step 1: the account and an empty draft application for the store. */
export function registerSeller(ctx: Ctx, input: RegisterInput & { sellerType: string; storeName: string }): { userId: string; slug: string } {
  const sellerType = input.sellerType === "independent" ? "independent" : input.sellerType === "company" ? "company" : null;
  if (!sellerType) throw new MarketError("invalid_input", "seller type");
  const storeName = cleanName(input.storeName, 120);
  cleanPhone(input.phone, true); // sellers must give a phone number: Amartani calls them to arrange collection
  return tx(ctx.db, () => {
    const slug = uniqueSlug(ctx, storeName);
    const { id, email } = createUser(ctx, "manufacturer", { ...input, phone: input.phone }, slug);
    const now = ctx.now().toISOString();
    ctx.db
      .prepare(
        `INSERT INTO manufacturers (slug, owner_user_id, seller_type, name, contact_first_name, contact_last_name, contact_email, contact_phone, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(slug, id, sellerType, storeName, cleanName(input.firstName), cleanName(input.lastName), email, cleanPhone(input.phone) ?? "", now, now);
    ctx.db
      .prepare("INSERT INTO seller_status_history (manufacturer_slug, track, from_status, to_status, at, by_user, reason) VALUES (?,?,?,?,?,?,?)")
      .run(slug, "account", null, "draft", now, id, null);
    sendVerification(ctx, id);
    return { userId: id, slug };
  });
}

export function slugify(s: string) {
  const ascii = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return ascii || "store";
}

function uniqueSlug(ctx: Ctx, name: string) {
  const base = slugify(name);
  for (let i = 0; i < 1000; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!ctx.db.prepare("SELECT 1 FROM manufacturers WHERE slug = ?").get(slug)) return slug;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function verifyEmail(ctx: Ctx, token: unknown): string {
  return tx(ctx.db, () => {
    const userId = useToken(ctx, token, "verify_email");
    ctx.db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?").run(ctx.now().toISOString(), userId);
    return userId;
  });
}

export function resendVerification(ctx: Ctx, actor: Actor | null) {
  if (!actor) throw new MarketError("forbidden");
  tx(ctx.db, () => sendVerification(ctx, actor.id));
}

/* ------------------------------------------------------------------ */
/* Sign-in                                                              */
/* ------------------------------------------------------------------ */

const WINDOW_MIN = 15;
const MAX_FAILS = 8;

/** Checks email and password. Too many failures for one email lock it for 15 minutes. */
export function authenticate(ctx: Ctx, emailRaw: unknown, password: unknown): UserRow {
  let email: string;
  try {
    email = normalizeEmail(emailRaw);
  } catch {
    throw new MarketError("bad_credentials");
  }
  const since = new Date(ctx.now().getTime() - WINDOW_MIN * 60_000).toISOString();
  const fails = (ctx.db.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND ok = 0 AND at > ?").get(email, since) as { n: number }).n;
  if (fails >= MAX_FAILS) throw new MarketError("too_many_attempts");
  const u = userByEmail(ctx, email);
  const ok = !!u && typeof password === "string" && checkPassword(password, u.password_hash);
  ctx.db.prepare("INSERT INTO login_attempts (email, at, ok) VALUES (?,?,?)").run(email, ctx.now().toISOString(), ok ? 1 : 0);
  if (!ok || !u) throw new MarketError("bad_credentials");
  if (u.status === "suspended") throw new MarketError("account_suspended");
  return u;
}

/** Always looks the same to the visitor, whether or not the email has an account. */
export function requestPasswordReset(ctx: Ctx, emailRaw: unknown) {
  let email: string;
  try {
    email = normalizeEmail(emailRaw);
  } catch {
    return;
  }
  const u = userByEmail(ctx, email);
  if (!u || !u.password_hash || u.status === "suspended") return;
  tx(ctx.db, () => {
    const token = issueToken(ctx, u.id, "reset_password", 1);
    const mail = bilingual((l) => getDict(l).acc.mail.reset(u.first_name ?? u.name));
    queueEmail(ctx, { userId: u.id, to: u.email, kind: "reset_password", ...mail, link: `/reset-password?token=${token}` });
  });
}

export function resetPassword(ctx: Ctx, token: unknown, password: unknown, confirm: unknown): string {
  const pw = validatePassword(password, confirm);
  return tx(ctx.db, () => {
    const userId = useToken(ctx, token, "reset_password");
    // The link proves the person controls the email, so it also confirms the address.
    ctx.db
      .prepare("UPDATE users SET password_hash = ?, session_version = session_version + 1, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?")
      .run(hashPassword(pw), ctx.now().toISOString(), userId);
    return userId;
  });
}

export function changePassword(ctx: Ctx, actor: Actor | null, current: unknown, password: unknown, confirm: unknown) {
  if (!actor) throw new MarketError("forbidden");
  const u = getUser(ctx, actor.id);
  if (!u || typeof current !== "string" || !checkPassword(current, u.password_hash)) throw new MarketError("bad_credentials");
  const pw = validatePassword(password, confirm);
  ctx.db.prepare("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?").run(hashPassword(pw), u.id);
}

/* ------------------------------------------------------------------ */
/* Profile and addresses                                                */
/* ------------------------------------------------------------------ */

export function updateProfile(ctx: Ctx, actor: Actor | null, input: { firstName: unknown; lastName: unknown; phone: unknown }) {
  if (!actor) throw new MarketError("forbidden");
  const first = cleanName(input.firstName);
  const last = cleanName(input.lastName);
  ctx.db.prepare("UPDATE users SET first_name = ?, last_name = ?, name = ?, phone = ? WHERE id = ?").run(first, last, `${first} ${last}`, cleanPhone(input.phone), actor.id);
}

export interface AddressRow {
  id: number;
  user_id: string;
  label: string | null;
  recipient: string;
  phone: string;
  city: string;
  address: string;
  note: string | null;
  is_default: number;
}

export const addressesOf = (ctx: Ctx, actor: Actor | null) =>
  actor ? (ctx.db.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id").all(actor.id) as unknown as AddressRow[]) : [];

const text = (v: unknown, max: number, required: boolean) => {
  const s = typeof v === "string" ? v.trim() : "";
  if ((required && !s) || s.length > max) throw new MarketError("invalid_input");
  return s || null;
};

export function saveAddress(
  ctx: Ctx,
  actor: Actor | null,
  input: { id?: unknown; label?: unknown; recipient: unknown; phone: unknown; city: unknown; address: unknown; note?: unknown; isDefault?: unknown },
  knownCity: (c: string) => boolean,
): number {
  if (!actor || actor.role !== "customer") throw new MarketError("forbidden");
  const city = text(input.city, 80, true)!;
  if (!knownCity(city)) throw new MarketError("invalid_input", "city");
  const row = {
    label: text(input.label, 60, false),
    recipient: text(input.recipient, 120, true)!,
    phone: cleanPhone(input.phone, true)!,
    city,
    address: text(input.address, 300, true)!,
    note: text(input.note, 500, false),
  };
  const now = ctx.now().toISOString();
  return tx(ctx.db, () => {
    const count = (ctx.db.prepare("SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?").get(actor.id) as { n: number }).n;
    const makeDefault = !!input.isDefault || count === 0;
    if (makeDefault) ctx.db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(actor.id);
    const id = Number(input.id);
    if (id) {
      // Only the owner's own address can be changed.
      const r = ctx.db
        .prepare("UPDATE addresses SET label=?, recipient=?, phone=?, city=?, address=?, note=?, is_default = CASE WHEN ? THEN 1 ELSE is_default END, updated_at=? WHERE id = ? AND user_id = ?")
        .run(row.label, row.recipient, row.phone, row.city, row.address, row.note, makeDefault ? 1 : 0, now, id, actor.id);
      if (!r.changes) throw new MarketError("not_found");
      return id;
    }
    if (count >= 20) throw new MarketError("invalid_input", "too many addresses");
    const r = ctx.db
      .prepare("INSERT INTO addresses (user_id, label, recipient, phone, city, address, note, is_default, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(actor.id, row.label, row.recipient, row.phone, row.city, row.address, row.note, makeDefault ? 1 : 0, now, now);
    return Number(r.lastInsertRowid);
  });
}

export function deleteAddress(ctx: Ctx, actor: Actor | null, id: unknown) {
  if (!actor) throw new MarketError("forbidden");
  tx(ctx.db, () => {
    const r = ctx.db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(Number(id), actor.id);
    if (!r.changes) throw new MarketError("not_found");
    if (!ctx.db.prepare("SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1").get(actor.id))
      ctx.db.prepare("UPDATE addresses SET is_default = 1 WHERE id = (SELECT MIN(id) FROM addresses WHERE user_id = ?)").run(actor.id);
  });
}

/* ------------------------------------------------------------------ */
/* Admin: accounts                                                      */
/* ------------------------------------------------------------------ */

export function adminAction(ctx: Ctx, actorId: string, action: string, targetType: string, targetId: string, reason?: string | null) {
  ctx.db.prepare("INSERT INTO admin_actions (actor_id, action, target_type, target_id, reason, at) VALUES (?,?,?,?,?,?)").run(actorId, action, targetType, targetId, reason ?? null, ctx.now().toISOString());
}

function requireAdmin(actor: Actor | null): Actor {
  if (!actor || actor.role !== "admin") throw new MarketError("forbidden");
  return actor;
}

export function adminUsers(ctx: Ctx, actor: Actor | null, role?: string) {
  requireAdmin(actor);
  const where = role === "customer" || role === "manufacturer" || role === "admin" ? "WHERE u.role = ?" : "";
  const sql = `SELECT u.id, u.role, u.name, u.email, u.phone, u.status, u.status_reason, u.email_verified_at, u.created_at, u.is_demo, u.manufacturer_slug,
      (SELECT COUNT(*) FROM orders o WHERE o.customer_id = u.id) AS orders
    FROM users u ${where} ORDER BY u.created_at DESC, u.name`;
  return (where ? ctx.db.prepare(sql).all(role!) : ctx.db.prepare(sql).all()) as unknown as (Pick<UserRow, "id" | "role" | "name" | "email" | "phone" | "status" | "status_reason" | "email_verified_at" | "created_at" | "is_demo" | "manufacturer_slug"> & { orders: number })[];
}

export function setUserStatus(ctx: Ctx, actor: Actor | null, userId: string, status: "active" | "suspended", reason: unknown) {
  const admin = requireAdmin(actor);
  const u = getUser(ctx, userId);
  if (!u) throw new MarketError("not_found");
  if (u.id === admin.id) throw new MarketError("invalid_state", "can't suspend yourself");
  const why = text(reason, 500, status === "suspended");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE users SET status = ?, status_reason = ?, session_version = session_version + 1 WHERE id = ?").run(status, why, u.id);
    adminAction(ctx, admin.id, status === "suspended" ? "suspend_account" : "reactivate_account", "user", u.id, why);
  });
}

/** The newest email of a kind for this user (the TEST-mode "check your email" page shows it when nothing was really sent). */
export function latestEmail(ctx: Ctx, userId: string, kind: string) {
  return ctx.db.prepare("SELECT * FROM email_outbox WHERE user_id = ? AND kind = ? ORDER BY id DESC LIMIT 1").get(userId, kind) as unknown as import("./mailer").OutboxRow | undefined;
}
