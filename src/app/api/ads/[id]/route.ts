import { requireAccount } from "@/lib/auth";
import { body, handle } from "@/lib/http";
import { patchAd } from "@/lib/service";

export const PATCH = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => patchAd(await requireAccount(), (await ctx.params).id, await body(req)));
