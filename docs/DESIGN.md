# Design Rules

Black and white. Clean. Modeled on Atlassian's design foundations.

## Principles

0. **Responsive by structure.** Nothing overlaps, gets cut off or squished at any width (360px to 1920px). Fluid grids, wrapping, max-widths, breakpoints. Test at 390, 1024 and 1440px.

1. **One page, one job, one main button.** The main button is the only black filled button.
2. **Tell the user what happens next** in one short line at the top of each page.
3. **No empty choices.** Smart defaults everywhere. Advanced options hidden.
4. **Ads are the only color on screen.** The UI stays black, white and gray so ads pop.

## Tokens

- **Spacing:** 8px base (Atlassian scale): 4, 8, 12, 16, 24, 32, 40, 48, 64, 80.
- **Colors:**
  - Text: `#0A0A0A`. Muted text: `#5E5E5E`.
  - Background: `#FFFFFF`. Subtle background: `#F7F7F7`.
  - Border: `#E5E5E5`.
  - Primary button: black background, white text.
  - Error only: red `#D92D20`. No other colors.
- **Font:** Geist (clean, modern, free on Google Fonts). Sizes 12 / 14 / 16 / 20 / 24 / 32. Weights 400 and 600 only.
- **Radius:** 6px for buttons and inputs, 8px for cards.
- **Shadows:** none, borders only.
- **Dark mode:** same tokens inverted (later, not Phase 1).

## Layout

- Top bar: logo, Brands, Make, Results, account menu. Nothing else.
- Content max width 1200px. Forms max width 560px, centered.
- Ad grid: 4 columns desktop, 2 on mobile.

Reference: [Atlassian spacing](https://atlassian.design/foundations/spacing),
[Atlassian tokens](https://atlassian.design/foundations/tokens/design-tokens).
