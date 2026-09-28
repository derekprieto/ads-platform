import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { undo } from "@/lib/service";

export const POST = (_: Request, ctx: { params: Promise<{ id: string }> }) => handle(async () => undo(await requireAccount(), (await ctx.params).id));
