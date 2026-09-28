# Master Plan

Status: v1 draft, 2026-09-28. Owner: head of engineering. Approver: CEO.

## 1. The problem (from agency experience + market data)

1. **Ads die faster now.** Since Meta's Andromeda update, an ad's useful life dropped
   from 6 to 8 weeks down to 2 to 4 weeks.
2. **Volume needed is high.** Accounts spending $5K+/month need about 5 to 15 new
   creatives per week. Benchmark: about 1 new ad per $3K of spend.
3. **Variety matters, not just volume.** Meta groups ads that look too similar
   (similarity above ~60%) and treats them as one ad. 20 near-copies = 1 ad.
4. **Most ads lose.** Typical "hit rate" (share of new ads that become winners) is 5 to 15%.
5. **Current workflow is broken.** Teams use ChatGPT, get generic "AI slop", prompt for
   hours, and still depend on one creative person. That person is the bottleneck for
   both fulfillment and sales.

So the job is: **produce many *different* good ads fast, and know exactly which part of
a winner made it win.**

## 2. The market (who exists and the gap)

| Tool | What it does | What it lacks |
|---|---|---|
| Arcads | AI actor UGC videos. ~$110/mo for 10 videos. | Only talking-head video. No strategy, no statics, no performance loop. API only on top tier. |
| Foreplay | Swipe file of competitor ads, briefs. | Does not make ads. No performance analysis. |
| Motion | Creative analytics on your own account. | Does not make ads. No "what to make next". |
| AdCreative.ai | High-volume static generation. | Generic templates, cannot tell you what to make or why. |
| Atria | Ideation, competitor intel, some image gen. | Closest competitor. Weak on video and on precise iteration. |

**Gap we own:** one loop that goes *offer → angles → styles → generate (image + video)
→ performance → iterate on the exact winning variable*. Nobody closes this loop well.

## 3. The product in one sentence

A "creative brain" that learns your offer, writes angles, builds ads from proven style
formulas (not random prompts), and uses your Meta results to tell you what to make next.

## 4. The core idea that makes us better: ads are made of parts

Every ad we create is stored as a set of labeled parts (we call it the **Ad DNA**):

- **Offer** (what is sold, price, guarantee)
- **Angle** (why someone buys: save time, status, fear, etc.)
- **Audience / avatar** (who it speaks to)
- **Hook** (first line or first 3 seconds)
- **Style** (the format, e.g. "Us vs Them", "Notes app", "UGC testimonial")
- **Visual** (product shot, person, background, scene)
- **Copy** (headline, body, CTA)
- **Format** (1:1, 4:5, 9:16, image vs video)

Because every ad has labeled parts, when Meta data comes back we can say
"the *Fear of missing out* angle wins, the *Notes app* style wins, *Hook B* wins"
instead of just "Ad #47 won". That is the **pinpoint accuracy** the CEO asked for.

Iteration then means: keep the winning parts, change **one** part at a time.
That is how a real media buyer tests, and we automate it.

## 5. How we avoid AI slop (key technical decisions)

1. **Text is never drawn by the AI model.** Headlines, prices, reviews and logos are
   rendered by our own layout engine on top of the image. Result: sharp, correct,
   on-brand text, and every word is editable after generation.
2. **Real product photos are always the anchor.** The user uploads product images once.
   Image models edit/place the real product into scenes instead of inventing it.
3. **Style formulas, not free prompts.** Each style is a tested recipe (layout + copy
   slots + photo direction + rules). See `STYLES.md`. The user picks a style, not a prompt.
4. **Photo direction bans the "AI look".** Recipes ask for phone-camera realism, natural
   light, imperfect framing. No cartoon, no 3D render, no glossy plastic look by default.
5. **Automatic quality check.** A vision model scores every output for artifacts, extra
   fingers, wrong product, off-brand color, and hides failures before the user sees them.
6. **Brand kit.** Fonts, colors, logo, tone of voice, banned words. Applied to everything.

## 6. User flow (the full experience)

1. **Sign up → create workspace** (agency) → **add a brand** (client).
2. **Offer Brain setup (5 min):** paste website URL + upload product photos + optional
   docs, reviews, past winning ads. The app extracts: offer, price, guarantee, benefits,
   objections, proof, audiences, tone. User edits and confirms.
3. **Angle Board:** app proposes 15 to 30 angles, each with target audience and 3 hooks.
   User stars the good ones. One click adds more.
4. **Create:** pick angles × styles × formats. Example: 3 angles × 5 styles × 2 formats
   = 30 ads in one batch. Preview grid appears in about 1 to 2 minutes.
5. **Edit:** click any ad. Change text directly, swap image, "make 5 more like this",
   "change only the hook", "try another style". No prompting needed.
6. **Export or Launch:** download ZIP with naming convention, or push to Meta as paused ads.
7. **Learn:** connect Meta ad account. App pulls results, matches them to Ad DNA, shows
   a simple **Winners** page: winning angles, styles, hooks, and fatigue warnings.
8. **Iterate:** "Refresh this winner" makes new versions that keep the winning parts and
   change the rest, spread out enough that Meta sees them as different ads.

Design principle: minimal. Three main screens: **Brain** (offer + angles),
**Studio** (create + edit), **Results** (winners + what to make next).

## 7. Feature scope by phase

### Phase 1: Static ad engine (weeks 1 to 6). Goal: our own agency uses it daily.
- Auth, workspaces, brands, team members
- Offer Brain (URL scrape + uploads → structured offer profile)
- Angle Board (angles, audiences, hooks)
- 15 static style formulas (list in `STYLES.md`)
- Batch generation, preview grid, in-place text editor, variations
- Brand kit, export ZIP in 1:1, 4:5, 9:16
- Quality check filter
- Credits + Stripe billing (so we can charge the first outside agencies)

### Phase 2: Performance loop (weeks 7 to 10). Goal: the "which did best" answer.
- Connect Meta ad account (read-only first)
- Sync ad results daily, match to Ad DNA (auto-tag old ads we did not create with a vision model)
- Winners page: results by angle, style, hook, format
- Fatigue alerts (frequency above 3, CTR down 10%+ week over week, CPA up 15%+)
- "Refresh winner" and "What to make next" suggestions
- Swipe import: paste a competitor ad, we extract its *structure* (style + angle + hook
  pattern) and rebuild it for your offer. We copy the formula, never the asset.

### Phase 3: Video (weeks 11 to 16).
Order chosen by cost and proven performance:
1. Text-on-video over B-roll / product clips (cheap, very common winner)
2. Slideshow / carousel-to-video
3. AI voiceover + captions
4. UGC talking-head with AI actors (via a provider API, not built in-house)
5. Short generated scenes (Veo / Kling / Seedance class models) for hooks and B-roll

### Phase 4: Autopilot (after week 16).
- Push ads to Meta directly (create paused ads in chosen ad set)
- Weekly auto-batch: app builds next week's test ads from last week's winners, human approves
- TikTok Ads integration
- Client share links for approval (agencies send batches to clients)

## 8. Tech stack (and why)

| Part | Choice | Why |
|---|---|---|
| App | Next.js + TypeScript | One language front to back, fast to build, huge hiring pool. |
| Database + auth + files | Supabase (Postgres) | Auth, storage, database in one. Standard Postgres, no lock-in. |
| ORM | Drizzle | Typed, simple, fast. |
| Background jobs | Trigger.dev (or Inngest) | Generation takes 10s to minutes. Needs retries and queues. |
| "Brain" (strategy, angles, copy) | Claude via Anthropic API | Best at following detailed brand rules and writing non-generic copy. |
| Image models | Model router over fal.ai + direct APIs | Top models change every few months. Router lets us swap without rewrites. Current picks: GPT Image 2.5 (layouts), Nano Banana Pro (editing real product into scenes), Seedream (cheap volume). |
| Static layout render | Our own templates rendered to PNG (HTML/Satori) | Crisp editable text, pixel-exact brand control. This is the anti-slop core. |
| Video render | Remotion | Video built from code templates, same idea as statics. |
| Voice | ElevenLabs | Market standard for natural voice. |
| Payments | Stripe | Subscriptions + credit packs. |
| Hosting | Vercel (app) + Cloudflare R2 (media) | Cheap media storage with no download fees. |

## 9. Data model (simplified)

```
Workspace ─┬─ Member
           └─ Brand ─┬─ BrandKit (fonts, colors, logo, voice rules)
                     ├─ Offer (price, guarantee, benefits, objections, proof)
                     ├─ Audience
                     ├─ Angle ── Hook
                     ├─ Asset (product photos, logos, clips)
                     ├─ Creative ── CreativeVersion (Ad DNA: angle, hook, style, visual, copy, format)
                     └─ AdAccount ── AdResult (daily metrics per Meta ad, linked to Creative)
Style (global formula library)
GenerationJob (status, model used, cost, quality score)
```

## 10. Business model

- **Arcads reference:** ~$110/mo for 10 videos (~$11 per video).
- **Our unit cost:** static image ~$0.01 to $0.15 per generation, plus LLM cost. Even with
  3 tries per final ad, a static costs us well under $1.
- **Plan (to validate with our agency and 5 friend agencies):**

| Plan | Price/mo | Who | Includes |
|---|---|---|---|
| Starter | $99 | Solo brand/freelancer | 1 brand, ~300 statics, 10 videos |
| Agency | $399 | Small agency | 10 brands, ~2,000 statics, 60 videos, Meta sync |
| Scale | $999+ | Larger agency | Unlimited brands, high credits, autopilot, API |

- Target gross margin: 75%+. Credits cap heavy video usage so margin stays safe.
- **Pitch to agencies:** replaces part of a $4K to $6K/month creative hire, and makes
  "we will deliver 50 new ads per month" a sellable promise.

## 11. Success metrics

- Time from signup to first 20 usable ads: **under 10 minutes**
- Share of generated ads that users export or launch: **above 30%** (proves no slop)
- Hit rate of launched ads vs. user's previous ads: **higher** (proves the loop works)
- Weekly active agencies, and credits used per brand per week

## 12. Risks and how we handle them

| Risk | Plan |
|---|---|
| Meta API approval takes weeks (business verification + app review for ad account access) | Start the application in week 1. Use our own agency's accounts in development mode meanwhile. |
| Output looks like AI | Text by our renderer, real product photos, style formulas, quality filter. Test weekly with real media buyers. |
| Model prices/quality change | Model router. No single vendor lock. |
| Copying competitor ads (legal) | We extract structure only, never reuse their images, text, or brand. |
| AI actor likeness rights | Use only licensed avatar providers. |
| Video cost eats margin | Video uses more credits. Cheap video styles first. |

## 13. First 2 weeks of engineering

1. Repo setup: Next.js, Supabase, Drizzle, CI, lint, tests
2. Auth, workspaces, brands
3. Offer Brain v1 (URL → offer profile)
4. Render engine v1 with 3 styles (Us vs Them, Testimonial card, Headline + product hero)
5. Submit Meta developer app + business verification

## 14. Open questions for the CEO

1. Product name and domain.
2. Meta only at launch? (Recommended yes. TikTok in Phase 4.)
3. Which 2 to 3 agency clients can we use as the first real test brands?
4. Monthly budget for AI model costs during build (recommend ~$500/mo).
5. Rank the 15 styles in `STYLES.md` by what you see winning right now.
