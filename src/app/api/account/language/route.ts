/**
 * The language switcher calls this (fire and forget) so a signed-in person's choice is saved in
 * their profile: the site opens in it after sign-in, and notifications and emails use it.
 * Visitors who are not signed in only keep the cookie the switcher sets.
 */
import { isLang } from "@/i18n/config";
import { setPreferredLang } from "@/lib/market/accounts";
import { currentActor } from "@/lib/market/auth";
import { market } from "@/lib/market/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { lang?: unknown } | null;
  if (!isLang(body?.lang)) return new Response(null, { status: 400 });
  const actor = await currentActor();
  if (actor) setPreferredLang(market(), actor.id, body.lang);
  return new Response(null, { status: 204 });
}
