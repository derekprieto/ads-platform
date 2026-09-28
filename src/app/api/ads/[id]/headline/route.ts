import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { headline } from "@/lib/service";

export const POST = (_: Request, ctx: { params: Promise<{ id: string }> }) => handle(async () => headline(await requireAccount(), (await ctx.params).id));
