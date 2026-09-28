import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { listAds } from "@/lib/service";

export const GET = (_: Request, ctx: { params: Promise<{ id: string }> }) => handle(async () => listAds(await requireAccount(), (await ctx.params).id));
