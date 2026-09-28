import { requireAccount } from "@/lib/auth";
import { body, handle } from "@/lib/http";
import { artEdit } from "@/lib/service";

export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => artEdit(await requireAccount(), (await ctx.params).id, (await body<{ text: string }>(req)).text ?? ""));
