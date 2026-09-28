import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { createShare } from "@/lib/service";

export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => createShare(await requireAccount(), (await ctx.params).id, new URL(req.url).origin));
