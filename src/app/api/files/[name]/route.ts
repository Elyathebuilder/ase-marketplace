import { currentActor } from "@/lib/market/auth";
import { canReadFile } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { readUpload } from "@/lib/market/uploads";

/** Serves a receipt or transfer confirmation only to someone allowed to see it. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const actor = await currentActor();
  if (!actor || !canReadFile(market(), actor, name)) return new Response("Not found", { status: 404 });
  const f = readUpload(name);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.body), {
    headers: { "Content-Type": f.type, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" },
  });
}
