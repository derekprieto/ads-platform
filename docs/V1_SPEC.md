# V1 Build Spec

Status: approved direction, 2026-09-28. Source of truth for building V1.
Clickable prototype: https://claude.ai/artifact/41dsaverMc8NmP2Kido5BZ
(prototype source is in `design/prototype/`).

## Goal

Our own agency makes **all** its image ads in the app, every week, without it breaking.
Done when, for 2 weeks straight:
- 200+ ads per week made in the app
- under 2% of ads fail
- over 30% of ads get kept (proves they are not slop)
- a Funnel Pack of 20 ads is ready in under 3 minutes

## Rules

1. **Simple.** One chat + one gallery. No settings pages beyond account and billing.
2. **Reliable.** Every step can fail and retry without losing work or charging twice.
3. **Responsive.** 360px to 1920px, nothing cut off or overlapping (see `CLAUDE.md`).

## In V1

| Area | What ships |
|---|---|
| Onboarding | "My own brand" or "An agency". Agencies: "How many clients?" sets the recommended plan. |
| Brand setup | Paste URL. App reads the site and fills the Offer Brain. User confirms or edits in chat. Product photo upload. |
| Offer Brain | What you sell, offer, who buys, pains, business type, **Hot ad formula** (below). |
| Chat flow | Brand > funnel stage > angles > generate. Clickable options, typing optional. Texting tone. |
| Angles | 3 "Proven" + 2 "Try this" picked by default. Show all, toggle, or type a custom angle. |
| Generation | Funnel Packs (10 Cold, 6 Warm, 4 Hot by default). Best of 4 per ad. Formats 4:5 and 9:16. |
| Gallery | Cold / Warm / Hot tabs, keep or remove, download ZIP named `Brand_Stage_Style_Angle_ID`. |
| Editor | Text layers: edit instantly, free. Text in the image: AI region edit, 1 credit. New headline, undo, make 3 more. |
| Agency | Client switcher, a folder per client, "Share with client" link (client can approve or comment per ad). |
| Billing | Credits, Stripe plans ($39 / $99 / $299), top-ups, 20 free credits on signup. |
| Tooltips | (i) on every section heading with a short line and small diagram. Fixed-position so no panel clips them. |

## Not in V1

- Meta connection and Results page (V2)
- Video via Higgsfield (V3)
- Pushing ads straight to Meta, auto weekly packs (later)

## Hot ad formula (bottom of funnel)

What is working for our agency now. Every Hot ad must contain all 4:

1. **Number outcome**: a specific, quantified result. "25 qualified booked appointments"
2. **Guarantee** (or risk reversal): "in 30 days or you don't pay"
3. **Urgency / scarcity**: "Exclusive. 1 HVAC company per city."
4. **End result they want**: "A full install calendar. No ad spend."

The Offer Brain extracts these 4 fields from the website and the user confirms them.
The copy validator rejects any Hot ad missing one of them and regenerates it.

## Generation pipeline (one ad)

```
brief -> prompt -> 4 images -> judge -> split text -> render sizes -> ready
```

1. **Brief** (Claude): stage + angle + style recipe + Offer Brain -> copy JSON
   (hook, headline, sub, CTA, scene). Validated against a schema and stage rules.
2. **Prompt**: built by code from the style recipe (camera, light, realism rules,
   real product photo as reference). No free-form prompting.
3. **Generate 4 candidates** on the chosen image model (router over fal.ai + OpenAI).
4. **Judge** (vision model): scores "looks like AI", product correct, text readable,
   on-brief. Best one wins. If all 4 fail the bar, regenerate once, then fail.
5. **Split text**: OCR the text and positions, inpaint it out, re-add as editable
   layers with a matched font (from ~30 curated fonts). Text marked "art" in the
   recipe stays in the image.
6. **Render** final PNGs at 4:5 and 9:16 from image + layers.

## Reliability

- **Durable jobs.** Every step runs as a background job (Trigger.dev) with retries,
  exponential backoff and timeouts. Each ad has a state:
  `queued > briefing > generating > judging > splitting > ready | failed`.
- **Idempotent.** Every job has an idempotency key. A retry never double-charges or duplicates.
- **Credits ledger.** Credits are **reserved** when a pack starts, **charged** when an
  ad is ready, **refunded** automatically when it fails. Stored as ledger entries,
  never as one editable balance number.
- **Model fallback.** Each step has a primary and a fallback provider. If the
  primary errors or times out, the fallback runs.
- **Partial results.** Ads show up in the gallery as each one finishes. One failed ad
  never blocks the rest of the pack.
- **Limits.** Concurrency caps per account and globally. Daily spend cap per account.
  A global kill switch for all generation.
- **Nothing is lost.** Every version of every ad (image, layers, copy) is stored, so
  undo always works. Database has point-in-time recovery.
- **Watching it.** Error tracking (Sentry), cost per ad logged, daily cost and
  failure-rate report. Alert if failure rate goes above 5% in any hour.
- **Tests.** Unit tests for the credit ledger, copy validator and prompt builder.
  End-to-end tests of the chat flow at 390px, 1024px and 1440px on every change.

## Data model (V1)

```
Account (type: brand | agency, plan)
 ├─ Member
 ├─ CreditLedger (reserve | charge | refund | purchase | grant)
 └─ Brand (client)
     ├─ OfferBrain (sell, offer, who, pains, type, formula: {number, guarantee, urgency, result})
     ├─ Asset (product photos, logos)
     ├─ Angle (name, line, tag: proven | try | custom)
     ├─ Pack (counts, angles, status)
     │   └─ Ad (stage, angle, style, status, chosen_candidate)
     │       ├─ AdVersion (image_url, layers JSON, copy JSON)  <- undo history
     │       └─ Candidate (image_url, judge_score)            <- best of 4
     └─ ShareLink (token, expires) ── Approval (ad, status, comment)
Job (ad, step, attempt, provider, cost, error)
```

## Build order (each starts when the last is done)

1. **Foundations**: Next.js + TypeScript, Supabase (auth, DB, storage), Drizzle,
   Trigger.dev, Sentry, CI with lint, typecheck and tests. Design tokens from `DESIGN.md`.
2. **Blind image test**: same 10 ads on the top 3 image models. CEO and media buyers
   pick blind. Winner becomes the default model per style.
3. **Chat + brand setup**: onboarding, URL reading, Offer Brain with Hot formula, angles.
4. **Generation pipeline + gallery**: all 6 steps, credits ledger, partial results.
5. **Editor**: text layers, AI region edit, undo, new headline, make 3 more.
6. **Billing + agency**: Stripe, top-ups, client switcher, share links.
7. **Internal launch**: our agency runs on it. Fix everything until the goal above is met.

## What I need to start

| Account | Why | Cost |
|---|---|---|
| Anthropic API key | Offer Brain, hooks, copy | Pay per use |
| OpenAI API key | Image model (GPT Image) | Pay per use |
| fal.ai API key | Image models (Nano Banana, Seedream), editing | Pay per use |
| Supabase project | Database, login, file storage | Free to start |
| Vercel account | Hosting | Free to start |
| Trigger.dev account | Background jobs | Free to start |
| Stripe account | Payments (step 6) | Per transaction |
| Domain + product name | Launch | ~$15/yr |
