import type { AdCopy, TextLayer } from "@/db/schema";
import type { BusinessType, Stage } from "./api-types";

export type Template = "meme" | "photo" | "tweet" | "notes" | "art" | "graphic" | "review" | "vs" | "list" | "shots" | "formula";

export type Field = TextLayer["field"];

export type StyleRecipe = {
  key: string;
  name: string;
  template: Template;
  stages: Stage[];
  types: BusinessType[];
  /** Editable text fields, in order. "art" fields are drawn into the image by the AI. */
  fields: { field: Field; label: string; kind: "layer" | "art" }[];
  /** Does this style need an AI image at all? (tweet/notes/list/vs are pure layout) */
  needsImage: boolean;
  /** How the image should look. Joined with the brief's scene. */
  look: string;
  /** Instructions for the copywriter model. */
  copyRules: string;
  funny?: boolean;
};

const REAL = "shot on iPhone, natural light, real skin texture, candid, slightly imperfect framing, no text, no watermark, no logos except the real product";
const ALL: BusinessType[] = ["ecom", "saas", "services"];

export const STYLES: StyleRecipe[] = [
  { key: "meme", name: "Meme", template: "meme", stages: ["cold"], types: ALL, needsImage: true, funny: true,
    fields: [{ field: "headline", label: "Top text", kind: "layer" }, { field: "sub", label: "Bottom text", kind: "layer" }],
    look: `reaction-photo style, expressive face, ${REAL}`,
    copyRules: "Classic meme: top line sets up, bottom line punchline. ALL CAPS. Max 7 words each. Relatable pain, never corporate." },
  { key: "ugc_photo", name: "UGC photo", template: "photo", stages: ["cold", "warm"], types: ALL, needsImage: true,
    fields: [{ field: "headline", label: "Caption", kind: "layer" }],
    look: `user-generated phone photo, person in a real messy home or workplace, ${REAL}`,
    copyRules: "Instagram-story caption. Often starts with 'POV:'. Lowercase ok. Max 14 words." },
  { key: "flash_photo", name: "Flash photo", template: "photo", stages: ["cold"], types: ALL, needsImage: true,
    fields: [{ field: "headline", label: "Caption", kind: "layer" }],
    look: `direct on-camera flash, harsh shadows, late night or indoor, 2000s digicam feel, ${REAL}`,
    copyRules: "Short deadpan caption, lowercase, max 10 words. Funny or brutally honest." },
  { key: "tweet", name: "Tweet", template: "tweet", stages: ["cold"], types: ALL, needsImage: false, funny: true,
    fields: [{ field: "headline", label: "Post text", kind: "layer" }, { field: "handle", label: "Handle", kind: "layer" }],
    look: "",
    copyRules: "A hot take tweet from a real customer voice. lowercase, no hashtags, no emojis, max 25 words. handle like @firstnamething." },
  { key: "notes", name: "Notes app", template: "notes", stages: ["cold"], types: ALL, needsImage: false,
    fields: [{ field: "headline", label: "Note text", kind: "layer" }],
    look: "",
    copyRules: "iPhone Notes screenshot. A short personal list (3-4 lines with - or 1.). lowercase, raw, honest. Mentions the product once." },
  { key: "neon", name: "Neon sign", template: "art", stages: ["cold"], types: ALL, needsImage: true,
    fields: [{ field: "artText", label: "Text in the image", kind: "art" }],
    look: "glowing neon sign on a real wall at night, the sign spells the exact text in quotes, photographed on a phone",
    copyRules: "A 3-6 word lowercase phrase that works as a neon sign. Clever, identity-driven." },
  { key: "handwritten", name: "Handwritten note", template: "art", stages: ["cold"], types: ALL, needsImage: true,
    fields: [{ field: "artText", label: "Text in the image", kind: "art" }],
    look: "handwritten note (sticky note, whiteboard or mirror) photographed on a phone, the handwriting spells the exact text in quotes",
    copyRules: "A 4-10 word handwritten note, lowercase, personal. Max 2 short lines." },
  { key: "bold_claim", name: "Bold claim", template: "graphic", stages: ["cold", "hot"], types: ALL, needsImage: false,
    fields: [{ field: "headline", label: "Headline", kind: "layer" }, { field: "cta", label: "Button", kind: "layer" }],
    look: "flat bold color background with subtle paper texture, lots of empty space, no text",
    copyRules: "One punchy line, max 8 words, sentence case. Provocative but true. cta optional (2-3 words)." },
  { key: "review", name: "Review", template: "review", stages: ["warm"], types: ALL, needsImage: true,
    fields: [{ field: "headline", label: "Quote", kind: "layer" }, { field: "sub", label: "Name", kind: "layer" }],
    look: `happy customer with the product in daily life, ${REAL}`,
    copyRules: "A customer quote with a specific result, max 18 words. sub = first name + last initial (and role for B2B). Use real reviews from the Offer Brain proof when available." },
  { key: "us_vs_them", name: "Us vs them", template: "vs", stages: ["warm"], types: ALL, needsImage: false,
    fields: [{ field: "headline", label: "Left label", kind: "layer" }, { field: "sub", label: "Right label", kind: "layer" }],
    look: "",
    copyRules: "headline = brand name, sub = the old way/competitor category. rows = 3 short contrasts (max 4 words each side)." },
  { key: "listicle", name: "List", template: "list", stages: ["warm"], types: ALL, needsImage: false,
    fields: [{ field: "headline", label: "Title", kind: "layer" }],
    look: "",
    copyRules: "headline like '3 reasons people switch to X'. items = 3 short reasons (max 6 words each)." },
  { key: "screenshot_callouts", name: "Screenshot callouts", template: "shots", stages: ["warm"], types: ["saas", "services"], needsImage: true,
    fields: [{ field: "headline", label: "Callout 1", kind: "layer" }, { field: "sub", label: "Callout 2", kind: "layer" }],
    look: `laptop or phone on a real desk showing a clean app dashboard, ${REAL}`,
    copyRules: "Two short feature callouts, max 5 words each." },
  { key: "founder", name: "Founder UGC", template: "photo", stages: ["warm"], types: ALL, needsImage: true,
    fields: [{ field: "headline", label: "Caption", kind: "layer" }],
    look: `founder talking to the camera, selfie angle, in their office or shop, ${REAL}`,
    copyRules: "First-person founder line, lowercase, max 14 words. Why they built it." },
  { key: "formula", name: "Formula", template: "formula", stages: ["hot"], types: ALL, needsImage: true,
    fields: [
      { field: "big", label: "Number", kind: "layer" },
      { field: "headline", label: "Outcome", kind: "layer" },
      { field: "sub", label: "Guarantee", kind: "layer" },
      { field: "extra", label: "Urgency + result", kind: "layer" },
    ],
    look: "dark moody background photo related to the product or service, heavy shadow, lots of empty space on the left, no text",
    copyRules: "Hot ad formula. big = the number only (e.g. 25). headline = the rest of the quantified outcome. sub = the guarantee/risk reversal. extra = urgency/scarcity + the end result. All four are required." },
  { key: "offer_color", name: "Offer", template: "graphic", stages: ["hot"], types: ALL, needsImage: true,
    fields: [{ field: "headline", label: "Headline", kind: "layer" }, { field: "cta", label: "Button", kind: "layer" }],
    look: "the real product (or a person using the service) photographed on a plain backdrop, product centered, no text",
    copyRules: "The offer in max 10 words including the number outcome and the guarantee. cta 2-3 words." },
  { key: "objection", name: "Objection", template: "graphic", stages: ["hot"], types: ALL, needsImage: false,
    fields: [{ field: "headline", label: "Headline", kind: "layer" }],
    look: "dark matte textured background, no text",
    copyRules: "'Worried about X? ...' answer the top objection with the guarantee. max 14 words." },
];

export const styleByKey = (key: string) => STYLES.find((s) => s.key === key) ?? STYLES[0];

/** Deterministic style mix per stage: rotates through eligible styles. */
export function pickStyles(stage: Stage, type: BusinessType, n: number, opts: { funny?: boolean; seed?: number } = {}) {
  let pool = STYLES.filter((s) => s.stages.includes(stage) && s.types.includes(type));
  if (opts.funny) {
    const f = pool.filter((s) => s.funny);
    if (f.length) pool = f;
  }
  const seed = opts.seed ?? 0;
  return Array.from({ length: n }, (_, i) => pool[(i + seed) % pool.length]);
}

/** Text layers for an ad, from its style + copy. */
export function layersFor(styleKey: string, copy: AdCopy): TextLayer[] {
  const st = styleByKey(styleKey);
  return st.fields
    .filter((f) => f.field === "headline" || f.field === "artText" || (copy[f.field] ?? "") !== "")
    .map((f) => ({ id: f.field, field: f.field, label: f.label, kind: f.kind, text: String(copy[f.field] ?? "") }));
}

/** Tone color per style, deterministic from the ad id so renders are stable. */
export function toneFor(styleKey: string, adId: string) {
  const palettes: Record<string, string[]> = {
    graphic: ["#FFE24A", "#1B4DFF", "#FF5A1F", "#111111", "#0A7A45"],
    formula: ["#0A0A0A", "#1B4DFF", "#111827"],
  };
  const t = styleByKey(styleKey).template;
  const list = palettes[t] ?? ["#3A3F4B", "#5B5145", "#2F3440", "#6A6152"];
  let h = 0;
  for (const c of adId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
