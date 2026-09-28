# Decisions Log

Each entry: decision, why, evidence. Newest first.

## 2026-09-28: Static ads first, video in Phase 3
- **Why:** Statics are cheaper to make (under $1 each for us vs ~$11/video on Arcads),
  faster to test, and let us prove the performance loop before the costly part.
- **Evidence:** Arcads pricing ~$110/mo for 10 videos ([eesel](https://www.eesel.ai/blog/arcads-ai-pricing)).
  fal.ai image prices $0.009 to $0.15 per image ([segmind](https://blog.segmind.com/ai-image-gen-pricing-compared-nano-banana-2-vs-seedream-5-0-vs-gpt-image-2-2026/)).

## 2026-09-28: Text rendered by our engine, never by the image model
- **Why:** Model-drawn text is the main source of "AI slop" look, typos, and
  un-editable output. Our renderer gives exact fonts, brand colors and click-to-edit.

## 2026-09-28: Model router instead of one image model
- **Why:** Leaders change every few months (GPT Image 2.5, Nano Banana Pro, Seedream 5
  all lead on different things as of Sept 2026). A router lets us swap per style.
- **Evidence:** [buildmvpfast](https://www.buildmvpfast.com/articles/best-llms-2026-guide/image-generation-ai),
  [fal Nano Banana Pro](https://fal.ai/models/fal-ai/nano-banana-pro).

## 2026-09-28: "Ad DNA" tagging on every creative
- **Why:** To know *which part* of a winner works, every ad must be stored as labeled
  parts (angle, hook, style, visual, copy, format).
- **Evidence:** Meta now groups ads that are too similar (similarity above ~60%), so
  variety across parts is required, and useful ad life is down to 2 to 4 weeks
  ([segwise](https://segwise.ai/blog/meta-andromeda-update-creative-strategy-2026),
  [confect](https://confect.io/tactics/meta-andromeda-2026)).

## 2026-09-28: Meta first, TikTok later
- **Why:** Meta is where our agency and target agencies spend most. One integration
  done well beats two done badly.

## 2026-09-28: Fatigue alert thresholds
- Frequency above 3.0, CTR down 10%+ week over week, or CPA up 15%+.
- **Evidence:** [adlibrary](https://adlibrary.com/posts/ad-fatigue). Hook rate
  benchmark ~28% median on Meta, 30%+ is good ([sepia-lab](https://sepia-lab.com/en/blog/hook-rate-benchmarks)).
