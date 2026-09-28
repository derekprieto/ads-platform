import { requireAccount } from "@/lib/auth";
import { body, handle } from "@/lib/http";
import { HttpError, onboard } from "@/lib/service";

export const POST = (req: Request) => handle(async () => {
  const b = await body<{ type: "brand" | "agency"; clients?: string }>(req);
  if (b.type !== "brand" && b.type !== "agency") throw new HttpError(400, "type must be brand or agency");
  return onboard(await requireAccount(), b.type, b.clients);
});
