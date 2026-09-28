import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { grant, SIGNUP_CREDITS } from "./credits";
import { env } from "./env";

const COOKIE = "acct";

/**
 * Returns the current account id, creating one on first visit.
 * dev: an account per browser (cookie). supabase: replace with Supabase Auth session -> members.authUserId.
 */
export async function requireAccount(): Promise<string> {
  if (env.authMode !== "dev") throw new Error("AUTH_MODE=supabase not wired yet: add Supabase keys (see docs/V1_SPEC.md)");
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) {
    const [a] = await db.select({ id: schema.accounts.id }).from(schema.accounts).where(eq(schema.accounts.id, existing));
    if (a) return a.id;
  }
  const [a] = await db.insert(schema.accounts).values({}).returning({ id: schema.accounts.id });
  await grant(a.id, SIGNUP_CREDITS, `signup:${a.id}`);
  jar.set(COOKIE, a.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return a.id;
}
