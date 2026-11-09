import { currentActor } from "@/lib/market/auth";
import { unreadCount } from "@/lib/market/queries";
import { market } from "@/lib/market/server";

/** Who is signed in and how many unread notifications they have (for the header). */
export async function GET() {
  const actor = await currentActor();
  return Response.json(
    actor ? { user: { name: actor.name, role: actor.role }, unread: unreadCount(market(), actor) } : { user: null, unread: 0 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
