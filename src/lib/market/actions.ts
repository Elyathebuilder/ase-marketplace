"use server";

/**
 * Form actions. Each one reads the signed-in user from the session cookie and calls the
 * workflow service, which checks permissions again. Nothing the browser sends about prices,
 * roles or statuses is trusted.
 */
import { redirect } from "next/navigation";
import { href, isLang } from "@/i18n/config";
import { toTetri } from "../money";
import { currentActor, endSession, startSession, actorById } from "./auth";
import { markNotificationsRead } from "./queries";
import { market } from "./server";
import * as svc from "./service";
import { updateSettings } from "./settings";
import { MarketError, type Actor } from "./types";
import { saveUpload } from "./uploads";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

/** Only same-site paths are allowed as a return address. */
function safeBack(f: FormData, fallback = "/") {
  const b = str(f, "back");
  return b.startsWith("/") && !b.startsWith("//") && !b.includes("\\") ? b : fallback;
}

function withParam(path: string, k: string, v: string) {
  const [base, hash] = path.split("#");
  const clean = base.replace(new RegExp(`([?&])(ok|error)=[^&]*&?`, "g"), "$1").replace(/[?&]$/, "");
  return `${clean}${clean.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(v)}${hash ? `#${hash}` : ""}`;
}

function errorCode(e: unknown): string {
  if (e instanceof MarketError) return e.message.includes("file") ? "file" : e.code;
  console.error(e);
  return "invalid_input";
}

/** Runs one action, then goes to "next" (or back with ?ok=1); on failure back with ?error=<code>. */
async function run(f: FormData, fn: (actor: Actor | null) => void | Promise<void>) {
  const back = safeBack(f);
  const next = str(f, "next");
  let target: string;
  try {
    await fn(await currentActor());
    target = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : withParam(back, "ok", "1");
  } catch (e) {
    target = withParam(back, "error", errorCode(e));
  }
  redirect(target);
}

/* ---------------- Sign in ---------------- */

export async function signInAs(f: FormData) {
  const user = actorById(str(f, "user"));
  if (!user) redirect(safeBack(f));
  await startSession(user.id);
  const lang = isLang(str(f, "lang")) ? (str(f, "lang") as "ka" | "en") : "ka";
  const home = user.role === "customer" ? "/account/orders" : user.role === "manufacturer" ? "/seller/orders" : "/admin";
  const next = str(f, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : href(lang, home));
}

export async function signOut(f: FormData) {
  await endSession();
  redirect(safeBack(f));
}

/* ---------------- Customer ---------------- */

export async function placeOrderAction(f: FormData) {
  const lang = isLang(str(f, "lang")) ? (str(f, "lang") as "ka" | "en") : "ka";
  let id: string | null = null;
  let error = "";
  try {
    const parsed = JSON.parse(str(f, "lines") || "[]") as unknown;
    const lines = Array.isArray(parsed)
      ? parsed.slice(0, 100).map((l) => ({ slug: String((l as { slug?: unknown }).slug ?? ""), qty: Number((l as { qty?: unknown }).qty) }))
      : [];
    id = svc.placeOrder(market(), await currentActor(), {
      lines,
      city: str(f, "city"),
      name: str(f, "name"),
      phone: str(f, "phone"),
      address: str(f, "address"),
      email: str(f, "email"),
      note: str(f, "note"),
    });
  } catch (e) {
    error = errorCode(e);
  }
  redirect(id ? href(lang, `/account/orders/${id}/payment?placed=1`) : withParam(href(lang, "/checkout"), "error", error));
}

/* ---------------- Everything else ---------------- */

const date = (f: FormData, k: string) => str(f, k).slice(0, 10);

/** One entry point for the order, payment and settlement buttons. The service checks who may do what. */
export async function marketAction(f: FormData) {
  const op = str(f, "op");
  await run(f, async (actor) => {
    const ctx = market();
    const id = str(f, "id");
    switch (op) {
      case "submitPayment": {
        if (!actor || actor.role !== "customer") throw new MarketError("forbidden");
        const receipt = await saveUpload(f.get("receipt"));
        svc.submitPayment(ctx, actor, id, { amount: str(f, "amount"), date: date(f, "date"), reference: str(f, "reference"), receipt });
        return;
      }
      case "completeOrder":
        return void svc.completeOrder(ctx, actor, id);
      case "markRead":
        return void markNotificationsRead(ctx, actor);
      case "makerStep":
        return void svc.manufacturerStep(ctx, actor, id, str(f, "step") as "accept");
      case "makerReject":
        return void svc.manufacturerReject(ctx, actor, id, str(f, "reason"));
      case "startVerification":
        return void svc.startVerification(ctx, actor, id);
      case "recordPayment":
        return void svc.recordIncomingPayment(ctx, actor, id, { received: str(f, "received"), bankReference: str(f, "bankReference"), note: str(f, "note") });
      case "rejectPayment":
        return void svc.rejectPayment(ctx, actor, id, str(f, "reason"));
      case "requestMore":
        return void svc.requestAdditionalPayment(ctx, actor, id, str(f, "note"));
      case "addNote":
        return void svc.addNote(ctx, actor, id, str(f, "body"), str(f, "payment") || null);
      case "adminStep":
        return void svc.adminFulfillmentStep(ctx, actor, id, str(f, "step") as "collect", str(f, "note"));
      case "flag":
        return void svc.flagOrder(ctx, actor, id, str(f, "flag") === "delivery_issue" ? "delivery_issue" : "preparation_delayed", str(f, "reason"));
      case "clearFlag":
        return void svc.clearFlag(ctx, actor, id);
      case "hold":
        return void svc.holdOrder(ctx, actor, id, str(f, "kind") === "dispute" ? "dispute" : "hold", str(f, "reason"));
      case "release":
        return void svc.releaseOrder(ctx, actor, id, str(f, "reason"));
      case "cancel":
        return void svc.cancelOrder(ctx, actor, id, str(f, "reason"));
      case "refund":
        return void svc.createRefund(ctx, actor, id, { amount: str(f, "amount"), reason: str(f, "reason"), fulfillmentId: str(f, "fulfillment") || null });
      case "completeRefund":
        return void svc.completeRefund(ctx, actor, id, { reference: str(f, "reference"), date: date(f, "date") });
      case "authorizePayout":
        return void svc.authorizePayout(ctx, actor, id);
      case "recordTransfer": {
        if (!actor || actor.role !== "admin") throw new MarketError("forbidden");
        const confirmation = await saveUpload(f.get("confirmation"));
        return void svc.recordPayoutTransfer(ctx, actor, id, { reference: str(f, "reference"), date: date(f, "date"), confirmation });
      }
      case "confirmPayout":
        return void svc.confirmPayoutCompleted(ctx, actor, id);
      case "failPayout":
        return void svc.markPayoutFailed(ctx, actor, id, str(f, "reason"));
      case "holdPayout":
        return void svc.holdPayout(ctx, actor, id, str(f, "reason"));
      case "releasePayout":
        return void svc.releasePayout(ctx, actor, id);
      case "settings": {
        let bps: number;
        try {
          bps = toTetri(str(f, "commissionPercent"));
        } catch {
          throw new MarketError("invalid_input");
        }
        return void updateSettings(ctx, actor, {
          commissionBps: bps,
          commissionBase: str(f, "commissionBase"),
          paymentDeadlineHours: str(f, "paymentDeadlineHours"),
          bankAccountHolder: str(f, "bankAccountHolder"),
          bankName: str(f, "bankName"),
          bankIban: str(f, "bankIban"),
          bankSwift: str(f, "bankSwift"),
        });
      }
      default:
        throw new MarketError("invalid_input");
    }
  });
}
