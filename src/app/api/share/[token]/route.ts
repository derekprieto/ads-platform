import { body, handle } from "@/lib/http";
import { getShare, postApproval } from "@/lib/service";

type Ctx = { params: Promise<{ token: string }> };
export const GET = (_: Request, ctx: Ctx) => handle(async () => getShare((await ctx.params).token));
export const POST = (req: Request, ctx: Ctx) => handle(async () => postApproval((await ctx.params).token, await body(req)));
