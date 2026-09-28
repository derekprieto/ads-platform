import { requireAccount } from "@/lib/auth";
import { body, handle } from "@/lib/http";
import { topUp } from "@/lib/service";

export const POST = (req: Request) => handle(async () => topUp(await requireAccount(), (await body<{ plan?: string }>(req).catch(() => ({} as { plan?: string }))).plan));
