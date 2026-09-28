import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { more } from "@/lib/service";

export const POST = (_: Request, ctx: { params: Promise<{ id: string }> }) => handle(async () => more(await requireAccount(), (await ctx.params).id));
