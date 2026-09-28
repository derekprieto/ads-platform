import { requireAccount } from "@/lib/auth";
import { handle } from "@/lib/http";
import { getMe } from "@/lib/service";

export const GET = () => handle(async () => getMe(await requireAccount()));
