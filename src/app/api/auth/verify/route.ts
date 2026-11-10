/**
 * The link in the confirmation email: /api/auth/verify?token=…
 * Confirms the email address (the token works once and expires), then shows the result page
 * in the account's language. It does not sign anyone in.
 */
import { NextResponse } from "next/server";
import { href, isLang, type Lang } from "@/i18n/config";
import { userLang, verifyEmail } from "@/lib/market/accounts";
import { market } from "@/lib/market/server";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const url = new URL(req.url);
  const asked = url.searchParams.get("lang");
  let lang: Lang = isLang(asked) ? asked : "ka";
  let ok = true;
  try {
    const userId = verifyEmail(market(), url.searchParams.get("token"));
    if (!isLang(asked)) lang = userLang(market(), userId) ?? lang;
  } catch {
    ok = false;
  }
  return NextResponse.redirect(new URL(`${href(lang, "/account/verified")}?${ok ? "ok=1" : "error=token_invalid"}`, url), 303);
}
