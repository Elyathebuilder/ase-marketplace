/**
 * The link in the confirmation email: /api/auth/verify?token=…
 * Confirms the email address (the token works once and expires), then shows the result page.
 * It does not sign anyone in.
 */
import { NextResponse } from "next/server";
import { verifyEmail } from "@/lib/market/accounts";
import { market } from "@/lib/market/server";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const url = new URL(req.url);
  const en = url.searchParams.get("lang") === "en";
  let ok = true;
  try {
    verifyEmail(market(), url.searchParams.get("token"));
  } catch {
    ok = false;
  }
  return NextResponse.redirect(new URL(`${en ? "/en" : ""}/account/verified?${ok ? "ok=1" : "error=token_invalid"}`, url), 303);
}
