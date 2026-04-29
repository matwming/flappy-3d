# Phase 8: Glass UI Refresh - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Milestone:** v1.1 — Beauty Pass (final phase)

<domain>
## Phase Boundary

Apply a polished "glass" coat of paint to the DOM screens. Arcade font for headings, backdrop-filter blur on overlays, gradient buttons, refined focus rings. After this phase, the visual presentation is on par with v1's mechanical polish.

In scope:
- `Press Start 2P` font (or comparable arcade), locally hosted woff2 ≤12KB, headings only (BEAUTY-09)
- `backdrop-filter: blur(12px) saturate(120%)` on PauseScreen, GameOverScreen, SettingsModal — fallback gracefully on browsers without support (BEAUTY-10)
- Button gradient + inset shadow + preserved ≥44×44px touch targets + distinct hover/active states (BEAUTY-11)
- Polished 2-color focus ring (inner glow + outer ring) via `:focus-visible` — WCAG-AA contrast against all overlay backgrounds, including colorblind palette (BEAUTY-12)

Out of scope:
- Body-text font swap (system stack stays for readability)
- Animations beyond what's already in Phase 6/7
- 3D scene polish (lighting, shaders) — v1.2+
- Title screen rework (Phase 6 is enough)

</domain>

<decisions>
## Implementation Decisions

### Press Start 2P heading font (BEAUTY-09)
- **D-01:** Locally host `PressStart2P-Regular.woff2` (~11KB). Place at `public/fonts/press-start-2p.woff2`. Service worker (Phase 4) will pre-cache this automatically since it's a static asset under `public/`.
- **D-02:** `@font-face` declaration in styles.css:
  ```css
  @font-face {
    font-family: 'Press Start 2P';
    src: url('/flappy-3d/fonts/press-start-2p.woff2') format('woff2');
    font-display: swap;
    font-weight: 400;
    font-style: normal;
  }
  ```
  Note: the `/flappy-3d/` prefix matches the GitHub Pages base path. For Cloudflare Pages migration, this would need to update OR use a relative `./fonts/...` path. **Claude's Discretion**: pick relative path if vite serves it consistently across both bases.
- **D-03:** Apply only to headings: `h1, h2 { font-family: 'Press Start 2P', ui-monospace, monospace; }`. Body text stays system stack.
- **D-04:** Source file: download from Google Fonts CDN (`https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap`) → grab the woff2 url → save locally. **Sourcing fallback:** if Google Fonts is blocked/rate-limited at execution time, search github.com/google/fonts for the source repo (under `ofl/pressstart2p/`).
- **D-05:** Verify gzipped size is under 12KB. The woff2 itself is already compressed; gzip adds little. If it exceeds, search for a stripped subset (Latin-only is ~6KB).

### Backdrop-filter blur (BEAUTY-10)
- **D-06:** Add `backdrop-filter: blur(12px) saturate(120%)` (and `-webkit-backdrop-filter` for older Safari) to:
  - `.pause-screen` (or whatever class wraps PauseScreen content)
  - `.gameover-screen`
  - `.settings-modal` (or the `<dialog>` selector)
- **D-07:** Background fallback: each overlay also has a semi-transparent solid `background: rgba(20, 25, 40, 0.85)` so it remains readable when backdrop-filter is unsupported (older Firefox, some embedded webviews). Modern browsers see both rules; backdrop-filter wins visually.
- **D-08:** Performance note: backdrop-filter is GPU-expensive. Verify on iPhone 12 doesn't cause jank when an overlay is open. Mitigation if jank appears: disable on devices with `navigator.hardwareConcurrency <= 4` (mirror the post-processing gate from Phase 1).

### Button polish (BEAUTY-11)
- **D-09:** `Button` component CSS gets:
  - `background: linear-gradient(180deg, var(--btn-top) 0%, var(--btn-bottom) 100%)` where the CSS variables are defined per-theme
  - `box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)` for subtle depth
  - `transition: transform 100ms ease-out, box-shadow 100ms ease-out`
  - `:hover` lifts slightly: `transform: translateY(-1px); box-shadow: inset 0 1px 0 ..., 0 4px 8px ...`
  - `:active` presses: `transform: translateY(0); box-shadow: inset 0 2px 4px rgba(0,0,0,0.3)` (inverted shadow for press feel)
- **D-10:** Touch-target ≥44×44px preserved (Phase 4 audit confirmed; do not regress). Add `min-width: 44px; min-height: 44px` if any button class is missing it.
- **D-11:** CSS variables for button colors so colorblind palette can theme them:
  - Default: `--btn-top: #4a5b8c; --btn-bottom: #2c3a64`
  - Colorblind: `--btn-top: #6da3c4; --btn-bottom: #336b8a` (matches the existing colorblind teal-blue, plus a darker shade)
- **D-12:** Hover state is desktop-only (`@media (hover: hover)`) so mobile doesn't get sticky hover after tap.

### Focus ring polish (BEAUTY-12)
- **D-13:** Replace Phase 4's `outline: 2px solid #ffd166; outline-offset: 2px` with a 2-layer ring:
  ```css
  *:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px var(--focus-inner, #ffd166),
      0 0 0 4px var(--focus-outer, rgba(0, 0, 0, 0.6));
  }
  ```
  Inner glow yellow, outer dark halo for contrast against light backgrounds. CSS variable lets colorblind palette swap them.
- **D-14:** Verify against all overlay backgrounds: dark glass, gradient buttons, leaderboard rows. Use Chrome DevTools accessibility panel to confirm 4.5:1 contrast on the inner ring against each background.
- **D-15:** Colorblind variant: `--focus-inner: #ffd166` works for both palettes (yellow has high contrast in both deuteranopia and protanopia simulation). Outer dark halo always works.

### Cross-cutting
- **D-16:** All effects are static styling — NO motion gating needed (no animated effects added). Hover transitions are 100ms which is well under the 150ms WCAG threshold for motion sensitivity.
- **D-17:** Bundle target ≤ 250KB gzip; current ~189KB. Phase 8 budget overhead estimate: ~12KB font asset + <2KB CSS = ~14KB total. Final estimate: 203KB / 250KB = 47KB headroom. Comfortable.
- **D-18:** No new JS dependencies. Pure CSS + 1 font asset.
- **D-19:** Do NOT regress Phase 6/7 polish (bird bob, demo pipes, logo entrance, CTA pulse, score popups, milestone bursts, flap trail, pipe color cycling).

### Claude's Discretion
- Exact `linear-gradient` color stops for default + colorblind buttons (suggested above is reasonable)
- Whether to add a `prefers-reduced-transparency` media query to disable backdrop-filter (it's a recent CSS feature, ~88% support)
- Subset selection if Press Start 2P woff2 exceeds 12KB
- Relative vs absolute font URL (depends on Vite asset handling — likely relative is safer)
- Fine-tuning of focus ring colors against the actual rendered overlay backgrounds

</decisions>

<specifics>
## Specific Ideas

- **Reference:** modern PWA-as-game UIs like Wordle, Threes!, Mini Metro web. The button feel + glass overlay should evoke "this is a polished little game", not "this is a CSS demo".
- **Restraint:** the arcade font is for headings ONLY. Body text in arcade font is unreadable on small mobile. Don't let scope creep push the font into score numbers, button labels, or settings rows.
- **The win:** a player who plays Phase 6 + 7 + 8 should have the impression of "this looks intentional and crafted" — not "this looks like a side project".

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 8: Glass UI Refresh" — Goal + 4 Success Criteria
- `.planning/REQUIREMENTS.md` §BEAUTY — BEAUTY-09..12 acceptance criteria
- `CLAUDE.md` — locked decisions (no new heavy deps, named imports, accessibility mandates)

### Existing code Phase 8 builds on
- `src/ui/styles.css` — primary target for all CSS changes
- `src/ui/components/Button.tsx` — Button component (CSS-driven, no JSX changes likely)
- `src/ui/screens/PauseScreen.tsx` — uses `.screen` + screen-specific class
- `src/ui/screens/GameOverScreen.tsx` — same pattern
- `src/ui/screens/SettingsModal.tsx` — uses `<dialog>` element with class
- `src/ui/UIBridge.tsx` — Preact mount; no expected changes
- `index.html` — may need `<link rel="preload">` for the font

### External docs (verify before citing)
- Press Start 2P: https://fonts.google.com/specimen/Press+Start+2P (download woff2 manually)
- backdrop-filter MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter (verify Safari prefix requirement)
- :focus-visible MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible (already used in Phase 4; familiar)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- CSS variables already used in styles.css (Phase 4 added `--focus-inner`-style patterns)
- `<dialog>` element for modals (Phase 3)
- Phase 4's audit already confirmed contrast pairs and touch targets — Phase 8 must not regress
- Service worker pre-caches `public/**` — font asset will be cached automatically

### Integration points
- `index.html` — `<link rel="preload" href="/flappy-3d/fonts/press-start-2p.woff2" as="font" type="font/woff2" crossorigin>` (optional but improves first-paint with the font)
- styles.css — `@font-face`, heading rules, overlay backdrop-filter, button gradients, focus-visible
- Button.tsx — likely no JSX changes; CSS class is already `.btn`

### Files unchanged in Phase 8
- src/main.ts (no logic changes)
- All systems, entities, particles, audio, state machine
- vite.config.ts, package.json (no new deps)
- Phase 6/7 work (bird bob, demo pipes, popups, milestones, flap trail, pipe colors)

</code_context>

<deferred>
## Deferred Ideas

- **Body-text font** — keep system stack for readability; arcade font for headings is the line we're holding
- **Animated logo SVG** — text-only "FLAPPY 3D" is fine; SVG logo is v1.2+ if anyone wants it
- **Theme switcher (light/dark/auto)** — single dark theme is intentional for the arcade aesthetic
- **Per-screen distinct backgrounds** — uniform glass treatment is the design language; per-screen variation would feel inconsistent
- **Particle effects on UI elements** — out of scope; kept as v1.2+ idea

</deferred>

---

*Phase: 08-glass-ui-refresh*
*Context gathered: 2026-04-29*
