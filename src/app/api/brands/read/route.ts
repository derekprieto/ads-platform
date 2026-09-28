import { requireAccount } from "@/lib/auth";
import { body, handle } from "@/lib/http";
import { readBrand } from "@/lib/service";

export const maxDuration = 60;
export const POST = (req: Request) => handle(async () => readBrand(await requireAccount(), (await body<{ url: string }>(req)).url ?? ""));
