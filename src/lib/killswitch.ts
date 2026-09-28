import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "./env";

/** Global kill switch: env GENERATION_ENABLED=false or settings row generation_enabled=false stops all generation. */
export async function generationEnabled() {
  if (!env.generationEnabled) return false;
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "generation_enabled"));
  return row ? row.value !== false : true;
}
