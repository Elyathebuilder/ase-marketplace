/**
 * Shared helpers for form actions (server only). Not a "use server" file: only the action files
 * themselves are callable from the browser.
 */
import { redirect } from "next/navigation";
import { currentActor } from "./auth";
import { deliverOutbox } from "./mailer";
import { market } from "./server";
import { MarketError, type Actor } from "./types";

export const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

/** Only same-site paths are allowed as a return address. */
export function safeBack(f: FormData, fallback = "/") {
  const b = str(f, "back");
  return b.startsWith("/") && !b.startsWith("//") && !b.includes("\\") ? b : fallback;
}

export function withParam(path: string, k: string, v: string) {
  const [base, hash] = path.split("#");
  const clean = base.replace(new RegExp(`([?&])(ok|error)=[^&]*&?`, "g"), "$1").replace(/[?&]$/, "");
  return `${clean}${clean.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(v)}${hash ? `#${hash}` : ""}`;
}

export function errorCode(e: unknown): string {
  if (e instanceof MarketError) return e.message.includes("file") ? "file" : e.code;
  console.error(e);
  return "invalid_input";
}

/** Runs one action, then goes to "next" (or back with ?ok=1); on failure back with ?error=<code>. */
export async function run(f: FormData, fn: (actor: Actor | null) => void | string | Promise<void | string>) {
  const back = safeBack(f);
  const next = str(f, "next");
  let target: string;
  try {
    // An action may return its own destination (for example the page of something it created).
    const dest = await fn(await currentActor());
    target = typeof dest === "string" ? dest : isSafePath(next) ? next : withParam(back, "ok", "1");
  } catch (e) {
    target = withParam(back, "error", errorCode(e));
  }
  // Emails queued by the action are sent now (or marked not sent when no provider is configured).
  await deliverOutbox(market()).catch((e) => console.error("email delivery", e));
  redirect(target);
}

export const isSafePath = (p: string) => p.startsWith("/") && !p.startsWith("//") && !p.includes("\\");

