"use server";

/**
 * Form actions for accounts: sign-in, registration, email verification, password reset, profile
 * and addresses. All checks happen in accounts.ts on the server.
 */
import { redirect } from "next/navigation";
import { href, isLang, type Lang } from "@/i18n/config";
import { PLACES } from "../places";
import * as acc from "./accounts";
import { errorCode, isSafePath, run, safeBack, str, withParam } from "./action-kit";
import { endSession, startSession } from "./auth";
import { deliverOutbox } from "./mailer";
import { market } from "./server";
import { MarketError } from "./types";

const langOf = (f: FormData): Lang => (isLang(str(f, "lang")) ? (str(f, "lang") as Lang) : "ka");

/** Where each kind of account goes after signing in. */
function home(lang: Lang, role: string) {
  return href(lang, role === "customer" ? "/account" : role === "manufacturer" ? "/seller" : "/admin");
}

export async function signInWithPassword(f: FormData) {
  const lang = langOf(f);
  const back = safeBack(f, href(lang, "/signin"));
  let target: string;
  try {
    const u = acc.authenticate(market(), str(f, "email"), str(f, "password"));
    await startSession(u.id);
    const next = str(f, "next");
    target = isSafePath(next) ? next : home(lang, u.role);
  } catch (e) {
    target = withParam(back, "error", errorCode(e));
  }
  redirect(target);
}

export async function signOutAction(f: FormData) {
  await endSession();
  redirect(safeBack(f));
}

export async function registerCustomerAction(f: FormData) {
  const lang = langOf(f);
  const back = safeBack(f, href(lang, "/register/customer"));
  let target: string;
  try {
    const id = acc.registerCustomer(market(), {
      firstName: str(f, "firstName"),
      lastName: str(f, "lastName"),
      email: str(f, "email"),
      password: str(f, "password"),
      confirm: str(f, "confirm"),
    });
    await startSession(id);
    const next = str(f, "next");
    target = `${href(lang, "/account/verify")}${isSafePath(next) ? `?next=${encodeURIComponent(next)}` : ""}`;
  } catch (e) {
    target = withParam(back, "error", errorCode(e));
  }
  await deliverOutbox(market()).catch(() => {});
  redirect(target);
}

export async function registerSellerAction(f: FormData) {
  const lang = langOf(f);
  const back = safeBack(f, href(lang, "/register/seller"));
  let target: string;
  try {
    const { userId } = acc.registerSeller(market(), {
      firstName: str(f, "firstName"),
      lastName: str(f, "lastName"),
      email: str(f, "email"),
      phone: str(f, "phone"),
      password: str(f, "password"),
      confirm: str(f, "confirm"),
      sellerType: str(f, "sellerType"),
      storeName: str(f, "storeName"),
    });
    await startSession(userId);
    target = href(lang, "/seller/application?step=2");
  } catch (e) {
    target = withParam(back, "error", errorCode(e));
  }
  await deliverOutbox(market()).catch(() => {});
  redirect(target);
}

export async function forgotPasswordAction(f: FormData) {
  const lang = langOf(f);
  acc.requestPasswordReset(market(), str(f, "email"));
  await deliverOutbox(market()).catch(() => {});
  redirect(`${href(lang, "/forgot-password")}?sent=1`);
}

export async function resetPasswordAction(f: FormData) {
  const lang = langOf(f);
  const token = str(f, "token");
  let target: string;
  try {
    acc.resetPassword(market(), token, str(f, "password"), str(f, "confirm"));
    await endSession();
    target = `${href(lang, "/signin")}?reset=1`;
  } catch (e) {
    target = `${href(lang, "/reset-password")}?token=${encodeURIComponent(token)}&error=${errorCode(e)}`;
  }
  redirect(target);
}

/** Profile, password, addresses and resending the confirmation email. */
export async function accountAction(f: FormData) {
  const op = str(f, "op");
  await run(f, async (actor) => {
    const ctx = market();
    if (!actor) throw new MarketError("forbidden");
    switch (op) {
      case "profile":
        return acc.updateProfile(ctx, actor, { firstName: str(f, "firstName"), lastName: str(f, "lastName"), phone: str(f, "phone") });
      case "password": {
        acc.changePassword(ctx, actor, str(f, "current"), str(f, "password"), str(f, "confirm"));
        // The password change signed out every session; start a fresh one here.
        await startSession(actor.id);
        return;
      }
      case "resend":
        return acc.resendVerification(ctx, actor);
      case "saveAddress":
        acc.saveAddress(
          ctx,
          actor,
          {
            id: str(f, "id"),
            label: str(f, "label"),
            recipient: str(f, "recipient"),
            phone: str(f, "phone"),
            city: str(f, "city"),
            address: str(f, "address"),
            note: str(f, "note"),
            isDefault: str(f, "isDefault") === "1",
          },
          (c) => !!PLACES[c],
        );
        return;
      case "deleteAddress":
        return acc.deleteAddress(ctx, actor, str(f, "id"));
      default:
        throw new MarketError("invalid_input");
    }
  });
}

/** Admin: suspend or reactivate any account. */
export async function adminAccountAction(f: FormData) {
  await run(f, (actor) => {
    const status = str(f, "status") === "suspended" ? "suspended" : "active";
    acc.setUserStatus(market(), actor, str(f, "id"), status, str(f, "reason"));
  });
}

