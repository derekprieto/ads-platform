import { requireAccount } from "@/lib/auth";
import { body, handle } from "@/lib/http";
import { addAngle, getAngles } from "@/lib/service";

type Ctx = { params: Promise<{ id: string }> };
export const GET = (_: Request, ctx: Ctx) => handle(async () => getAngles(await requireAccount(), (await ctx.params).id));
export const POST = (req: Request, ctx: Ctx) => handle(async () => addAngle(await requireAccount(), (await ctx.params).id, (await body<{ name: string }>(req)).name ?? ""));
