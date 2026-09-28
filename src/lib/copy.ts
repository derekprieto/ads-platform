import { z } from "zod";
import type { AdCopy, OfferBrain } from "@/db/schema";
import type { Stage } from "./api-types";
import { styleByKey } from "./styles";

export const AdCopySchema = z.object({
  headline: z.string(),
  sub: z.string().optional(),
  cta: z.string().optional(),
  big: z.string().optional(),
  extra: z.string().optional(),
  handle: z.string().optional(),
  items: z.array(z.string()).optional(),
  rows: z.array(z.object({ l: z.string(), r: z.string() })).optional(),
  scene: z.string(),
  artText: z.string().optional(),
});

const BANNED = ["unlock", "elevate", "revolutionize", "game-changer", "game changer", "seamless", "delve", "supercharge", "empower", "—"];
const hasNumber = (s: string) => /\d/.test(s);

/** Returns a list of problems. Empty list = valid. Deterministic, no AI. */
export function validateCopy(styleKey: string, stage: Stage, c: AdCopy, offer?: OfferBrain): string[] {
  const st = styleByKey(styleKey);
  const errs: string[] = [];
  const text = [c.headline, c.sub, c.cta, c.big, c.extra, c.artText, ...(c.items ?? [])].filter(Boolean).join(" ");
  if (!c.scene?.trim() && st.needsImage) errs.push("missing scene");
  for (const f of st.fields) {
    const v = c[f.field];
    if (f.field === "cta") continue;
    if (!v || !String(v).trim()) errs.push(`missing ${f.field}`);
  }
  if (st.template === "vs" && (c.rows?.length ?? 0) < 2) errs.push("need at least 2 rows");
  if (st.template === "list" && (c.items?.length ?? 0) < 3) errs.push("need 3 items");
  const lower = text.toLowerCase();
  for (const b of BANNED) if (lower.includes(b)) errs.push(`banned word: ${b}`);
  if ((c.headline ?? "").length > 220) errs.push("headline too long");

  // Hot ad formula: number outcome + guarantee + urgency + end result, required on Formula style,
  // and every Hot ad must at least carry a number or the guarantee.
  if (stage === "hot") {
    if (st.key === "formula") {
      if (!c.big || !hasNumber(c.big)) errs.push("formula: big must be a number");
      if (!c.sub) errs.push("formula: missing guarantee");
      if (!c.extra) errs.push("formula: missing urgency/result");
    } else if (offer) {
      const g = offer.formula.guarantee.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const mentionsGuarantee = g.some((w) => lower.includes(w)) || /guarantee|or you don't pay|money back|free|refund|risk/.test(lower);
      if (!hasNumber(text) && !mentionsGuarantee) errs.push("hot: needs the number outcome or the guarantee");
    }
  }
  return errs;
}
