/**
 * API contract between the UI and the server. Keep in sync with src/app/api/**.
 * All endpoints return JSON. Errors: { error: string, code?: string } with a 4xx/5xx status.
 * 402 { code: "insufficient_credits", needed, balance } when credits run out.
 */
import type { AdCopy, OfferBrain, TextLayer } from "@/db/schema";

export type Stage = "cold" | "warm" | "hot";
export type BusinessType = "ecom" | "saas" | "services";
export type AdStatus = "queued" | "briefing" | "generating" | "judging" | "splitting" | "rendering" | "ready" | "failed";

export type AccountDTO = { id: string; type: "brand" | "agency" | null; plan: string; recommendedPlan: string | null };
export type BrandDTO = { id: string; name: string; url: string; type: BusinessType; offer: OfferBrain };
export type AngleDTO = { id: string; name: string; line: string; tag: "Proven" | "Try this" | "Custom" | "" };
export type Counts = { cold: number; warm: number; hot: number };

export type AdDTO = {
  id: string;
  packId: string;
  brandId: string;
  stage: Stage;
  angle: string;
  style: string; // style key, see src/lib/styles.ts
  status: AdStatus;
  removed: boolean;
  error: string | null;
  version: number;
  canUndo: boolean;
  copy: AdCopy | null;
  layers: TextLayer[];
  imageUrl: string | null; // AI background image (no layer text on it)
  renders: Record<string, string>; // "4x5" | "9x16" -> PNG url, present when ready
};

export type PlanDTO = { name: string; price: number; credits: number; perAd: string; videos: number };

// GET  /api/me                          -> { account: AccountDTO, credits: number, brands: BrandDTO[] }
// POST /api/onboarding                  { type: "brand"|"agency", clients?: "1-5"|"6-20"|"20+" } -> { account: AccountDTO }
// POST /api/brands/read                 { url } -> { brand: BrandDTO }            (reads site, builds Offer Brain; ~5-20s)
// PATCH /api/brands/:id                 { name?, offer?: Partial<OfferBrain>, note?: string } -> { brand: BrandDTO }
// GET  /api/brands/:id/angles           -> { angles: AngleDTO[], recommended: string[] }  (recommended = 3 Proven + 2 Try this)
// POST /api/brands/:id/angles           { name } -> { angle: AngleDTO }           (custom angle)
// POST /api/packs                       { brandId, counts: Counts, angleNames: string[], look?: string, request?: string, funny?: boolean }
//                                        -> { packId: string, ads: AdDTO[] }  (credits reserved; 402 if not enough)
// GET  /api/brands/:id/ads              -> { ads: AdDTO[] }   (poll every 1500ms while any ad is not ready/failed)
// PATCH /api/ads/:id                    { removed?: boolean, layers?: { id: string, text: string }[] } -> { ad: AdDTO }
//                                        (layer text edits are free and instant; server re-renders)
// POST /api/ads/:id/art-edit            { text } -> { ad: AdDTO }   (1 credit; ad goes to "generating" then "ready")
// POST /api/ads/:id/undo                -> { ad: AdDTO }
// POST /api/ads/:id/headline            -> { ad: AdDTO }   (free new headline)
// POST /api/ads/:id/more                -> { ads: AdDTO[] } (3 new variants, 3 credits)
// GET  /api/brands/:id/download         -> application/zip of kept ready ads, named Brand_Stage_Style_Angle_ID_4x5.png
// POST /api/brands/:id/share            -> { url: string }   (agency approval link, page at /s/:token)
// GET  /api/share/:token                -> { brand: { name }, ads: AdDTO[], approvals: Record<adId, { status, comment }> }
// POST /api/share/:token                { adId, status: "approved"|"rejected", comment? } -> { ok: true }
// GET  /api/credits                     -> { balance: number, plan: string, recommendedPlan: string|null, plans: PlanDTO[] }
// POST /api/credits/topup               { plan?: string } -> { balance: number, checkoutUrl?: string }
