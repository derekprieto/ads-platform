/**
 * The "brain": reads a site into an Offer Brain, writes ad copy per style recipe,
 * and judges image candidates. Real mode uses Claude; mock mode is deterministic and free.
 */
import * as cheerio from "cheerio";
import { z } from "zod";
import type { AdCopy, OfferBrain } from "@/db/schema";
import type { BusinessType, Stage } from "./api-types";
import { AdCopySchema } from "./copy";
import { llm } from "./providers";
import { styleByKey } from "./styles";

type Out<T> = { data: T; costCents: number; provider: string };

const OfferSchema = z.object({
  name: z.string(),
  type: z.enum(["ecom", "saas", "services"]),
  sell: z.string(),
  offer: z.string(),
  who: z.string(),
  pains: z.array(z.string()),
  proof: z.string(),
  formula: z.object({ number: z.string(), guarantee: z.string(), urgency: z.string(), result: z.string() }),
  angleLines: z.array(z.object({ name: z.string(), line: z.string() })),
});
export type OfferRead = z.infer<typeof OfferSchema>;

const VOICE = `You write Meta ads for doomscrollers. Sound like a real person texting, not a brand.
Rules: specific numbers beat adjectives. No corporate words (unlock, elevate, seamless, revolutionize, empower, game-changer). No em dashes. No emojis. No hashtags.
Never invent reviews, stats, prices or guarantees that are not in the offer; if missing, write [PLACEHOLDER] instead.`;

export async function fetchSiteText(url: string): Promise<string> {
  if (process.env.PROVIDERS === "mock" && process.env.NODE_ENV === "test") return "";
  const full = /^https?:\/\//.test(url) ? url : `https://${url}`;
  try {
    const res = await fetch(full, { signal: AbortSignal.timeout(12_000), headers: { "user-agent": "Mozilla/5.0 (AdsPlatformBot)" } });
    if (!res.ok) return "";
    const $ = cheerio.load(await res.text());
    $("script,style,noscript,svg").remove();
    const parts = [
      $("title").text(),
      $('meta[name="description"]').attr("content") ?? "",
      ...$("h1,h2,h3,p,li,button").map((_, el) => $(el).text().trim()).get(),
    ];
    return parts.filter((s) => s && s.length > 2).join("\n").replace(/\n{2,}/g, "\n").slice(0, 20_000);
  } catch {
    return "";
  }
}

export function guessType(url: string): BusinessType {
  if (/(lead|agency|market|media|hvac|roof|plumb|law|dental|clinic|service)/i.test(url)) return "services";
  if (/(\.io|\.ai|\.app|app|soft|flow|desk|cloud|hq)/i.test(url)) return "saas";
  return "ecom";
}

export function nameFromUrl(url: string) {
  const host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const core = host.split(".")[0] || "New brand";
  return core.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function mockOffer(url: string, siteText: string): OfferRead {
  const type = guessType(url);
  const name = nameFromUrl(url);
  const desc = siteText.split("\n")[1] || "";
  const base: Record<BusinessType, Omit<OfferRead, "name" | "type" | "angleLines">> = {
    ecom: { sell: desc || `${name} products that fix one annoying daily problem.`, offer: "[Main offer, e.g. 40% off first order]. [Guarantee].", who: "[Who buys it and why]", pains: ["[Pain 1]", "[Pain 2]", "[Pain 3]"], proof: "[Reviews, ratings]", formula: { number: "[Number outcome]", guarantee: "[Guarantee]", urgency: "[Urgency]", result: "[End result]" } },
    saas: { sell: desc || `${name} saves teams hours every week.`, offer: "Free for 14 days, no card. [Price] after.", who: "[Role] at teams of [size]", pains: ["Too many meetings", "Nobody knows project status", "Info spread across tools"], proof: "[Customer logos, reviews]", formula: { number: "[Hours saved per week]", guarantee: "Free 14 days, cancel anytime", urgency: "[Deadline offer]", result: "[What work feels like after]" } },
    services: { sell: desc || `${name} gets clients booked appointments.`, offer: "[Number] qualified booked appointments in [days] days or you don't pay.", who: "[Niche] owners doing $[X] a year", pains: ["Slow seasons", "Shared leads", "Paying for clicks that never book"], proof: "[Case studies]", formula: { number: "[25] booked appointments in [30] days", guarantee: "Or you don't pay", urgency: "Exclusive: 1 client per city", result: "A full calendar with no ad spend" } },
  };
  return { name, type, ...base[type], angleLines: [] };
}

export async function readOffer(url: string): Promise<Out<OfferRead>> {
  const siteText = await fetchSiteText(url);
  const model = llm();
  if (!model) return { data: mockOffer(url, siteText), costCents: 0, provider: "mock" };
  const r = await model.json({
    system: `You are a direct-response strategist. Extract the business's offer from its website text for Meta ad creation. ${VOICE}`,
    prompt: `Website: ${url}\n\nWebsite text:\n${siteText || "(could not load the site; infer only from the URL and use [PLACEHOLDER] for unknowns)"}\n\n` +
      `Return: name, type (ecom = physical/online products, saas = software, services = agencies, local services, coaching), sell (1 sentence), offer (the main offer incl. price/guarantee), who (ideal buyer), pains (3-5 short), proof (real reviews/results found, verbatim where possible), ` +
      `formula (the bottom-of-funnel formula: number = quantified outcome, guarantee = guarantee or risk reversal, urgency = urgency/scarcity, result = the end result they want), ` +
      `angleLines: for each of these angles write one specific line for THIS business: Pain, Result, Us vs them, Enemy, Cost of waiting, Identity, Contrarian, Curiosity, Founder story, Time saved, Look good to the boss, Risk reversal, Scarcity, Gift.`,
    schema: OfferSchema,
  });
  return { data: r.data, costCents: r.costCents, provider: r.provider };
}

export async function applyNote(offer: OfferBrain, note: string): Promise<Out<OfferBrain>> {
  const model = llm();
  if (!model) return { data: { ...offer, offer: offer.offer + (note ? ` (${note})` : "") }, costCents: 0, provider: "mock" };
  const r = await model.json({
    system: `Update the Offer Brain JSON using the user's correction. Change only what the note implies. ${VOICE}`,
    prompt: `Current:\n${JSON.stringify(offer)}\n\nUser note: ${note}`,
    schema: OfferSchema.omit({ name: true, type: true, angleLines: true }),
  });
  return { data: r.data, costCents: r.costCents, provider: r.provider };
}

// ---------- copy ----------

export type CopyInput = { styleKey: string; stage: Stage; angle: string; angleLine: string; brandName: string; type: BusinessType; offer: OfferBrain; request?: string | null; avoid: string[]; seed: number };

const STAGE_JOB: Record<Stage, string> = {
  cold: "COLD (never heard of the brand). Job: stop the scroll. Funny, relatable, pattern-interrupt. Do not sell hard.",
  warm: "WARM (knows the brand, not sold). Job: prove it works. Specific results, proof, comparisons.",
  hot: "HOT (ready to buy). Job: close. Use the Hot ad formula: number outcome + guarantee + urgency + end result.",
};

export async function writeCopy(i: CopyInput): Promise<Out<AdCopy>> {
  const st = styleByKey(i.styleKey);
  const model = llm();
  if (!model) return { data: mockCopy(i), costCents: 0, provider: "mock" };
  const r = await model.json({
    system: `You are an elite performance creative strategist. ${VOICE}`,
    prompt: [
      `Brand: ${i.brandName} (${i.type})`,
      `Offer Brain: ${JSON.stringify(i.offer)}`,
      `Funnel stage: ${STAGE_JOB[i.stage]}`,
      `Angle: ${i.angle} - ${i.angleLine}`,
      `Style: ${st.name}. ${st.copyRules}`,
      `Fields to fill: ${st.fields.map((f) => f.field).join(", ")}${st.template === "vs" ? ", rows" : ""}${st.template === "list" ? ", items" : ""}. Always fill scene: one sentence describing the photo${st.needsImage ? "" : " (unused for this style, keep short)"}.`,
      st.fields.some((f) => f.kind === "art") ? "artText is drawn into the image by the image model, keep it very short." : "",
      i.request ? `User request: ${i.request}` : "",
      i.avoid.length ? `Do not repeat these existing hooks: ${i.avoid.slice(0, 20).join(" | ")}` : "",
    ].filter(Boolean).join("\n"),
    schema: AdCopySchema,
  });
  return { data: r.data as AdCopy, costCents: r.costCents, provider: r.provider };
}

function mockCopy(i: CopyInput): AdCopy {
  const f = i.offer.formula;
  const pain = i.offer.pains[i.seed % Math.max(1, i.offer.pains.length)] ?? "the old way";
  const n = i.brandName;
  const scene = `${i.type === "saas" ? "person at a laptop" : i.type === "services" ? "business owner at work" : "person using the product at home"}, ${i.angle.toLowerCase()} angle`;
  const byStyle: Record<string, AdCopy> = {
    meme: { headline: `ME DEALING WITH ${pain.toUpperCase()}`, sub: `BEFORE ${n.toUpperCase()}`, scene: `frustrated person, ${scene}` },
    ugc_photo: { headline: `POV: you finally fixed ${pain.toLowerCase()}`, scene },
    flash_photo: { headline: `this was us before ${n.toLowerCase()}. never again.`, scene: `messy real room, ${scene}` },
    tweet: { headline: `nobody talks about how ${pain.toLowerCase()} quietly ruins your whole week`, handle: "@realcustomer", scene: "" },
    notes: { headline: `stuff that actually helped:\n- ${n}\n- saying no to ${pain.toLowerCase()}\n- sleeping 8 hours`, scene: "" },
    neon: { headline: "", artText: `${i.angle.toLowerCase()} era`, scene: "neon sign on a bedroom wall" },
    handwritten: { headline: "", artText: `fix ${pain.toLowerCase()}. today.`, scene: "sticky note on a mirror" },
    bold_claim: { headline: i.stage === "hot" ? `${f.number}. ${f.guarantee}.` : `${pain} isn't your fault.`, cta: i.stage === "hot" ? "Claim it" : undefined, scene: "flat color backdrop" },
    review: { headline: `Honestly didn't think it would work. ${f.result}.`, sub: "Sam R.", scene: `happy customer, ${scene}` },
    us_vs_them: { headline: n, sub: "The old way", rows: [{ l: "Works fast", r: "Takes forever" }, { l: "Real results", r: "Guesswork" }, { l: f.guarantee.slice(0, 24), r: "No guarantee" }], scene: "" },
    listicle: { headline: `3 reasons people switch to ${n}`, items: [f.result.slice(0, 40), "No more " + pain.toLowerCase(), f.guarantee.slice(0, 40)], scene: "" },
    screenshot_callouts: { headline: "Everything in one place", sub: "Updates itself", scene: "laptop showing the dashboard" },
    founder: { headline: `i built ${n.toLowerCase()} because i was sick of ${pain.toLowerCase()}`, scene: "founder selfie in the office" },
    formula: { big: (f.number.match(/\d+/)?.[0]) ?? "30", headline: f.number.replace(/^\D*\d+\s*/, "") || f.number, sub: f.guarantee, extra: `${f.urgency} · ${f.result}`, scene: "dark moody backdrop" },
    offer_color: { headline: `${f.number}. ${f.guarantee}.`, cta: "Get started", scene: "product on bright color" },
    objection: { headline: `Worried it won't work for you? ${f.guarantee}.`, scene: "dark texture" },
  };
  return byStyle[i.styleKey] ?? { headline: `${i.angle}: ${i.angleLine}`, scene };
}

export async function newHeadline(i: CopyInput & { current: string }): Promise<Out<string>> {
  const model = llm();
  if (!model) {
    const options = [`${i.offer.formula.result}.`, `No more ${i.offer.pains[0] ?? "guesswork"}.`, `${i.offer.formula.number}.`, `${i.brandName}. Finally.`];
    return { data: options[(options.indexOf(i.current) + 1) % options.length] ?? options[0], costCents: 0, provider: "mock" };
  }
  const r = await model.json({
    system: `Rewrite one ad headline. ${VOICE}`,
    prompt: `Style: ${styleByKey(i.styleKey).copyRules}\nStage: ${STAGE_JOB[i.stage]}\nAngle: ${i.angle}\nOffer: ${JSON.stringify(i.offer)}\nCurrent headline: ${i.current}\nWrite one new, different headline of similar length.`,
    schema: z.object({ headline: z.string() }),
  });
  return { data: r.data.headline, costCents: r.costCents, provider: r.provider };
}

// ---------- judge ----------

const JudgeSchema = z.object({ scores: z.array(z.object({ index: z.number(), score: z.number(), notes: z.string() })) });

/** Score candidates 0-10. Anything under 5 is rejected (AI look, wrong product, broken hands, unreadable art text). */
export async function judge(candidateUrls: string[], copy: AdCopy, styleKey: string): Promise<Out<{ index: number; score: number; notes: string }[]>> {
  const model = llm();
  if (!model) return { data: candidateUrls.map((_, i) => ({ index: i, score: 7 - i * 0.1, notes: "mock" })), costCents: 0, provider: "mock" };
  const st = styleByKey(styleKey);
  const r = await model.json({
    system: "You are a strict creative director judging AI images for Meta ads. Real-looking beats pretty. Penalize: plastic skin, extra fingers, warped text, fake-looking product, stock-photo vibe, any text in the image (unless required).",
    prompt: `There are ${candidateUrls.length} images, in order (index 0..${candidateUrls.length - 1}). Intended scene: ${copy.scene}. Style: ${st.name} (${st.look}).` +
      (copy.artText ? ` The image MUST show this exact text, spelled correctly: "${copy.artText}". Score 0 if the text is wrong.` : " The image must contain NO text.") +
      " Score each 0-10 and give a short note.",
    images: candidateUrls,
    schema: JudgeSchema,
  });
  return { data: r.data.scores, costCents: r.costCents, provider: r.provider };
}
