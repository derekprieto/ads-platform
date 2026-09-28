import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { getCredits } from "@/lib/service";

export const GET = () => handle(async () => getCredits(await requireAccount()));
