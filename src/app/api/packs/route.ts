import { requireAccount } from "@/lib/auth";
import { body, handle } from "@/lib/http";
import { createPack } from "@/lib/service";

export const POST = (req: Request) => handle(async () => createPack(await requireAccount(), await body(req)));
