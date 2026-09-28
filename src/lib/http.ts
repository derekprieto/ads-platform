import { InsufficientCredits } from "./credits";
import { HttpError } from "./service";

/** Wrap a route: JSON errors with the right status, never leak stack traces. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    const out = await fn();
    return out instanceof Response ? out : Response.json(out);
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message, ...e.extra }, { status: e.status });
    if (e instanceof InsufficientCredits) return Response.json({ error: "insufficient_credits", code: "insufficient_credits", needed: e.needed, balance: e.balance }, { status: 402 });
    console.error("[api]", e);
    return Response.json({ error: "something went wrong, try again" }, { status: 500 });
  }
}

export async function body<T>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new HttpError(400, "invalid JSON body"); }
}
