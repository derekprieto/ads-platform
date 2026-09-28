# Decisions Log

Each entry: decision, why, evidence. Newest first.

## 2026-09-28 (v4): For agencies and brands, all AI images, guided chat
- One app for agencies and in-house brands (ecommerce, SaaS, services, info). Signup
  asks "Brand or agency?" to set defaults only. Offer Brain detects business type.
- All image ads fully AI generated with style recipes + real product reference +
  best-of-4 AI judge. Exact text stays an editable layer. Replaces "text never by AI".
- Guided chat (one question, clickable options) + gallery replaces page-per-step UI.
- Open: image ad may cost 2 credits if best-of-4 costs exceed margin. Decide after
  the blind model test.

## 2026-09-28 (v3): Credit-based pricing replaces flat per-brand price
- 1 image ad = 1 credit, 1 video ad = 10 credits. Plans $39 / $99 / $299 for
  100 / 300 / 1,000 credits. 20 free credits on signup.
- **Why:** Revenue scales with usage, small first purchase, same model users know from
  Arcads and Higgsfield. Brands are unlimited so agencies never hit a wall.
- Supersedes the v2 "$97 per brand" entry.

## 2026-09-28 (v2): Simplicity rules
- One page, one job, one main button. 5 pages total. No timelines: phases run back to back.
- No open prompt box. Users never pick styles; the Funnel Pack does.
- Stack cut to 7 services (dropped separate media storage and in-house video rendering).

## 2026-09-28 (v2): Funnel Packs (Cold / Warm / Hot)
- **Why:** Building ads for the whole funnel is what makes creative a system. Each
  audience temperature needs its own angle and offer.
- **Evidence:** [mainstreetroi](https://www.mainstreetroi.com/the-key-to-success-with-facebook-ads-audience-temperature/),
  [stackmatix](https://www.stackmatix.com/blog/facebook-ads-funnel-strategy).
  Hormozi: the hook is ~80% of an ad's effect, so every style starts from a hook slot.
  His data also shows entertainment viewers rarely turn into education viewers, so
  each stage ad must work alone, not depend on the one before
  ([Shortform](https://www.shortform.com/podcast/episode/the-game-w-alex-hormozi-2025-06-02-episode-summary-the-funnel-we-use-to-make-250m-ep-898)).

## 2026-09-28 (v2): Native lo-fi look over polished design
- **Why:** In the feed, ads that look like posts beat ads that look like ads. This
  matches what wins for our agency.

## 2026-09-28 (v2): Pricing $97 per brand per month, unlimited images
- **Why:** No-brainer next to a $4K to $6K creative hire or Arcads at ~$110 for 10 videos.
  Image cost is cents. Video is credits because it costs about $0.10 per second.
- **Evidence:** [eesel](https://www.eesel.ai/blog/arcads-ai-pricing),
  [MindStudio on Higgsfield API](https://www.mindstudio.ai/blog/higgsfield-api-pricing-pay-per-use).

## 2026-09-28 (v2): Video through Higgsfield API
- **Why:** Pay per use, REST + webhooks, many top video models in one API. We don't build video models or rendering.

## 2026-09-28 (v2): Black and white UI on Atlassian foundations
- 8px spacing scale, tokens, borders not shadows. See `DESIGN.md`.
- **Evidence:** [Atlassian spacing](https://atlassian.design/foundations/spacing).

## 2026-09-28 (v1): Images first, video in Phase 3
- **Why:** Statics are cheaper to make (under $1 each for us vs ~$11/video on Arcads),
  faster to test, and let us prove the performance loop before the costly part.
- **Evidence:** Arcads pricing ~$110/mo for 10 videos ([eesel](https://www.eesel.ai/blog/arcads-ai-pricing)).
  fal.ai image prices $0.009 to $0.15 per image ([segmind](https://blog.segmind.com/ai-image-gen-pricing-compared-nano-banana-2-vs-seedream-5-0-vs-gpt-image-2-2026/)).

## 2026-09-28 (v1): Text rendered by our engine, never by the image model
- **Why:** Model-drawn text is the main source of "AI slop" look, typos, and
  un-editable output. Our renderer gives exact fonts, brand colors and click-to-edit.

## 2026-09-28 (v1): Model router instead of one image model
- **Why:** Leaders change every few months (GPT Image 2.5, Nano Banana Pro, Seedream 5
  all lead on different things as of Sept 2026). A router lets us swap per style.
- **Evidence:** [buildmvpfast](https://www.buildmvpfast.com/articles/best-llms-2026-guide/image-generation-ai),
  [fal Nano Banana Pro](https://fal.ai/models/fal-ai/nano-banana-pro).

## 2026-09-28 (v1): "Ad DNA" tagging on every creative
- **Why:** To know *which part* of a winner works, every ad must be stored as labeled
  parts (angle, hook, style, visual, copy, format).
- **Evidence:** Meta now groups ads that are too similar (similarity above ~60%), so
  variety across parts is required, and useful ad life is down to 2 to 4 weeks
  ([segwise](https://segwise.ai/blog/meta-andromeda-update-creative-strategy-2026),
  [confect](https://confect.io/tactics/meta-andromeda-2026)).

## 2026-09-28 (v1): Meta first, TikTok later
- **Why:** Meta is where our agency and target agencies spend most. One integration
  done well beats two done badly.

## 2026-09-28 (v1): Fatigue alert thresholds
- Frequency above 3.0, CTR down 10%+ week over week, or CPA up 15%+.
- **Evidence:** [adlibrary](https://adlibrary.com/posts/ad-fatigue). Hook rate
  benchmark ~28% median on Meta, 30%+ is good ([sepia-lab](https://sepia-lab.com/en/blog/hook-rate-benchmarks)).
