import {
  pgTable, text, integer, timestamp, jsonb, uuid, pgEnum, real, index, uniqueIndex, boolean,
} from "drizzle-orm/pg-core";

export const accountType = pgEnum("account_type", ["brand", "agency"]);
export const businessType = pgEnum("business_type", ["ecom", "saas", "services"]);
export const stage = pgEnum("stage", ["cold", "warm", "hot"]);
export const adStatus = pgEnum("ad_status", ["queued", "briefing", "generating", "judging", "splitting", "rendering", "ready", "failed"]);
export const ledgerKind = pgEnum("ledger_kind", ["grant", "purchase", "reserve", "charge", "refund", "release"]);
export const jobStatus = pgEnum("job_status", ["pending", "running", "done", "failed"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const accounts = pgTable("accounts", {
  id: id(),
  type: accountType("type"),
  plan: text("plan").notNull().default("free"),
  recommendedPlan: text("recommended_plan"),
  dailySpendCapCents: integer("daily_spend_cap_cents").notNull().default(5000),
  createdAt: created(),
});

export const members = pgTable("members", {
  id: id(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  authUserId: text("auth_user_id"),
  createdAt: created(),
}, (t) => [uniqueIndex("members_email_idx").on(t.email)]);

/** Credits are never a single balance number. Balance = sum(delta). */
export const creditLedger = pgTable("credit_ledger", {
  id: id(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  kind: ledgerKind("kind").notNull(),
  delta: integer("delta").notNull(),
  /** Idempotency: the same key can only be written once. */
  key: text("key").notNull(),
  ref: text("ref"),
  createdAt: created(),
}, (t) => [uniqueIndex("credit_ledger_key_idx").on(t.key), index("credit_ledger_account_idx").on(t.accountId)]);

export const brands = pgTable("brands", {
  id: id(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: businessType("type").notNull(),
  offer: jsonb("offer").$type<OfferBrain>().notNull(),
  createdAt: created(),
}, (t) => [index("brands_account_idx").on(t.accountId)]);

export const assets = pgTable("assets", {
  id: id(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // product | logo
  url: text("url").notNull(),
  createdAt: created(),
});

export const angles = pgTable("angles", {
  id: id(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  line: text("line").notNull(),
  tag: text("tag").notNull().default(""), // Proven | Try this | Custom | ""
  createdAt: created(),
});

export const packs = pgTable("packs", {
  id: id(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  counts: jsonb("counts").$type<{ cold: number; warm: number; hot: number }>().notNull(),
  angleNames: jsonb("angle_names").$type<string[]>().notNull(),
  look: text("look").notNull().default("Mix it up"),
  request: text("request"),
  createdAt: created(),
});

export const ads = pgTable("ads", {
  id: id(),
  packId: uuid("pack_id").notNull().references(() => packs.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  stage: stage("stage").notNull(),
  angle: text("angle").notNull(),
  style: text("style").notNull(),
  status: adStatus("status").notNull().default("queued"),
  removed: boolean("removed").notNull().default(false),
  error: text("error"),
  currentVersion: integer("current_version").notNull().default(0),
  costCents: real("cost_cents").notNull().default(0),
  createdAt: created(),
}, (t) => [index("ads_pack_idx").on(t.packId), index("ads_brand_idx").on(t.brandId)]);

/** Every edit is a new version, so undo always works and nothing is lost. */
export const adVersions = pgTable("ad_versions", {
  id: id(),
  adId: uuid("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  copy: jsonb("copy").$type<AdCopy>().notNull(),
  layers: jsonb("layers").$type<TextLayer[]>().notNull(),
  imageUrl: text("image_url"),
  renders: jsonb("renders").$type<Record<string, string>>().notNull().default({}),
  createdAt: created(),
}, (t) => [uniqueIndex("ad_versions_ad_version_idx").on(t.adId, t.version)]);

export const candidates = pgTable("candidates", {
  id: id(),
  adId: uuid("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  score: real("score"),
  notes: text("notes"),
  createdAt: created(),
});

export const shareLinks = pgTable("share_links", {
  id: id(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [uniqueIndex("share_links_token_idx").on(t.token)]);

export const approvals = pgTable("approvals", {
  id: id(),
  shareLinkId: uuid("share_link_id").notNull().references(() => shareLinks.id, { onDelete: "cascade" }),
  adId: uuid("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // approved | rejected
  comment: text("comment"),
  createdAt: created(),
});

/** Postgres-backed durable job queue. Workers claim with SKIP LOCKED. */
export const jobs = pgTable("jobs", {
  id: id(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: jobStatus("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(4),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  key: text("key").notNull(),
  lastError: text("last_error"),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("jobs_key_idx").on(t.key), index("jobs_claim_idx").on(t.status, t.runAt)]);

export const jobLogs = pgTable("job_logs", {
  id: id(),
  jobId: uuid("job_id").notNull(),
  adId: uuid("ad_id"),
  step: text("step").notNull(),
  provider: text("provider"),
  costCents: real("cost_cents").notNull().default(0),
  ms: integer("ms"),
  ok: boolean("ok").notNull(),
  error: text("error"),
  createdAt: created(),
}, (t) => [index("job_logs_created_idx").on(t.createdAt)]);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

// ---- JSON shapes ----
export type OfferBrain = {
  sell: string;
  offer: string;
  who: string;
  pains: string[];
  proof: string;
  formula: { number: string; guarantee: string; urgency: string; result: string };
};

export type AdCopy = {
  headline: string;
  sub?: string;
  cta?: string;
  big?: string;
  extra?: string;
  handle?: string;
  items?: string[];
  rows?: { l: string; r: string }[];
  /** What the AI image should show. */
  scene: string;
  /** Text meant to be drawn into the picture (neon sign, handwriting). */
  artText?: string;
};

export type TextLayer = {
  id: string;
  field: "headline" | "sub" | "cta" | "big" | "extra" | "handle" | "artText";
  label: string;
  text: string;
  kind: "layer" | "art";
};
