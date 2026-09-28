# Master Plan

Status: v2, 2026-09-28. Owner: head of engineering. Approver: CEO.

**Rule #1: Simplicity scales.** One job per page. One main button per page.
If a feature adds a choice the user must make, it needs a very good reason.

## 1. The problem

- Meta ads now wear out in 2 to 4 weeks. Accounts need 5 to 15 new ads per week.
- Meta merges ads that look too alike. Variety beats volume.
- ChatGPT ads look corporate or like AI slop. Teams prompt for hours. One creative
  person becomes the bottleneck for fulfillment and sales.
- Most teams do not build ads for the **whole funnel**. They make random ads.

## 2. What we build

Paste your website. Get a full funnel of scroll-stopping Meta ads that look native to
the feed, not like corporate ads. Then see which ones win and make more like them.

Like Arcads in ease of use, but for the whole funnel, images and video, with a
results loop.

## 3. The two rules for the output

1. **The software is deterministic.** The same inputs always follow the same recipe:
   funnel stage → style → slots → render. No open prompt box. No guessing.
2. **The creative is wild.** Inside each recipe, the AI writes hooks and picks scenes
   based on formats that are winning on social right now. Memes, lo-fi, funny, direct.

## 4. The funnel (the core system)

Every ad belongs to exactly one stage. Each stage has one job.

| Stage | Who sees it | Job of the ad | What it looks like |
|---|---|---|---|
| **Cold** (top) | Never heard of you | Stop the scroll. Make them feel seen. | Memes, POV posts, funny, bold claims, lo-fi phone photos, tweet/Notes screenshots |
| **Warm** (middle) | Knows you, not sold | Prove it works | Reviews, before/after, us vs them, listicles, testimonials |
| **Hot** (bottom) | Ready, needs a push | Close the sale | Plain colored background + short offer text, guarantee, urgency, objection answers |

A **Funnel Pack** = one click makes ads for all 3 stages (default: 10 cold, 6 warm,
4 hot). Every ad is saved with its parts (stage, angle, hook, style), so later we know
exactly which part won.

## 5. The flow (one thing per page)

| Page | The one thing the user does | Main button |
|---|---|---|
| 1. **Brand** | Paste website URL (optional: upload product photos) | "Build my brand" |
| 2. **Offer** | Read what we understood (offer, price, audience, pains). Fix anything wrong. | "Looks right" |
| 3. **Make** | Choose how many ads (default: one Funnel Pack) | "Make ads" |
| 4. **Review** | Keep or delete each ad. Click text to edit. | "Download kept ads" |
| 5. **Results** (Phase 2) | See winners by stage, angle, hook | "Make more like winners" |

That is the whole app. Nav: Brands, Make, Results. Settings live in one menu.

## 6. How the ads stay native, not slop

- **Real social look on purpose.** Lo-fi, phone quality, native fonts (iOS Notes,
  X/Twitter posts, Instagram story text, classic meme text). Ugly is allowed if it works.
- **Text is added by our renderer, not drawn by the AI.** No typos, always editable.
- **Real product photos** are used when the product is shown.
- **Winning-formats library.** We keep a list of formats that are working on Meta right
  now (seeded from our agency's winners and long-running ads in the Meta Ad Library).
  The AI fills these formats with the user's offer. We copy the format, never the ad.
- **Auto check.** A vision model hides broken images before the user sees them.

## 7. Phases (no dates: each starts when the previous one is done)

**Phase 1: Image Funnel Packs.** Done when our agency uses it for real clients.
- Login, brands, Offer page, Funnel Pack generator, Review page, download, billing.

**Phase 2: Results loop.** Done when "Make more like winners" beats random new ads.
- Connect Meta (read only). Results page. Fatigue flag on dying ads. "Make more like winners."
- Optional input on Make page: "Paste an ad you like" → we copy its format for your offer.

**Phase 3: Video with Higgsfield.**
- Same flow, same pages. The Make page gets one toggle: Image / Video.
- Video styles: UGC talking, interview, review, meme/skit, trending formats.

**Later:** push ads straight to Meta, weekly auto-pack from last week's winners.

## 8. Pricing

Goal: a no-brainer for performance marketers and agencies.

**One plan: $97 per brand per month.**
- Unlimited image ads (fair use).
- Video (Phase 3) uses credits, sold at a small markup over cost.
- 7-day free trial, cancel anytime.

Why this price:
- A creative hire costs $4K to $6K/month. Arcads costs ~$110/month for 10 videos.
- Our cost per image ad is well under $1 (image models $0.01 to $0.15 each).
- Per-brand pricing grows with agencies naturally: 10 clients = $970/month, still tiny
  vs. one hire. One plan = no pricing page confusion.
- Video on Higgsfield costs about $0.10 per second (about $1.50 for a 15s ad), so video
  is credits, not unlimited, to protect margin.

## 9. Tech stack (minimal)

| Part | Choice | Why |
|---|---|---|
| App | Next.js + TypeScript | One language everywhere. Fast to build. |
| Database, login, files | Supabase | Three needs, one service. |
| Background jobs | Trigger.dev | Ad generation takes time. Needs retries. |
| Brain (offer, angles, hooks, copy) | Claude API | Best at following strict recipes and writing human copy. |
| Images | fal.ai (one API, many models) | Swap models anytime without code changes. |
| Ad text + layout | Our own renderer (HTML to PNG) | Crisp, native-looking, editable text. |
| Video (Phase 3) | Higgsfield API | Pay per use, REST + webhooks, many top video models in one API. |
| Payments | Stripe | Standard. |
| Hosting | Vercel | Zero ops. |

Seven services. Nothing extra.

## 10. Data (simplified)

```
Account ── Brand ── Offer (price, audience, pains, proof)
                └── Ad (stage, angle, hook, style, image, text, status: kept/deleted)
                └── AdResult (Phase 2: Meta metrics per ad)
Style (our recipe library, shared)
```

## 11. How we measure success

- URL pasted → first Funnel Pack on screen: **under 3 minutes**
- Share of ads users keep: **above 30%**
- Phase 2: winners from "Make more like winners" vs random new ads: **higher hit rate**

## 12. Risks

| Risk | Plan |
|---|---|
| Meta approval for reading ad data takes weeks | Apply during Phase 1. Test on our own agency accounts. |
| Output looks like AI or corporate | Native formats, renderer text, real photos, auto check, weekly review with our media buyers. |
| Heavy users on unlimited images | Fair use cap in terms, cheap models for volume. |
| Copying ads | Copy format only. Never reuse someone's images, text, or brand. |

## 13. Open questions for the CEO

1. Product name and domain.
2. 2 or 3 agency clients to use as first test brands.
3. Send 20 to 50 of your agency's best winning ads (any quality). They seed the
   winning-formats library. This is the most valuable input you can give.
