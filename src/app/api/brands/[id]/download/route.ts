import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { download } from "@/lib/service";

export const maxDuration = 60;
export const GET = (_: Request, ctx: { params: Promise<{ id: string }> }) => handle(async () => {
  const z = await download(await requireAccount(), (await ctx.params).id);
  return new Response(Buffer.from(z.bytes), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${z.name}"` } });
});
