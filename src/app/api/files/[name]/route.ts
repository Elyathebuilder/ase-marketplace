import { currentActor } from "@/lib/market/auth";
import { canReadFile, isPublicFile } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { readUpload } from "@/lib/market/uploads";

/** Serves an uploaded file only to someone allowed to see it. Public photos may be cached by browsers. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const ctx = market();
  const pub = isPublicFile(ctx, name);
  if (!pub && !canReadFile(ctx, await currentActor(), name)) return new Response("Not found", { status: 404 });
  const f = readUpload(name);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.body), {
    headers: {
      "Content-Type": f.type,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": pub ? "public, max-age=3600" : "private, no-store",
    },
  });
}
