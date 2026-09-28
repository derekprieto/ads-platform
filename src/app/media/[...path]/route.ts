import { readFile } from "node:fs/promises";
import { mediaPath } from "@/lib/storage";

/** Serves locally stored media in dev. In production media is served from Supabase Storage/CDN. */
export async function GET(_: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const rel = (await ctx.params).path.join("/");
  try {
    const bytes = await readFile(mediaPath(rel));
    const type = rel.endsWith(".jpg") ? "image/jpeg" : rel.endsWith(".webp") ? "image/webp" : "image/png";
    return new Response(bytes, { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
