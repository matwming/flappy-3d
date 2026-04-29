# Phase 4: PWA + Accessibility + Bundle Audit - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the game installable from Android Chrome / desktop Chrome, playable offline after first load, and accessible to colorblind + keyboard-only players. Lock the production bundle ≤250KB gzipped and confirm 60fps on mid-tier mobile. Deployment target: **GitHub Pages project sub-path**.

In scope: vite-plugin-pwa setup, Web App Manifest + icons, service worker (cache static + audio), install-prompt deferral, colorblind palette, keyboard navigation, WCAG AA contrast/touch-target audit, bundle visualizer report, Lighthouse PWA audit ≥90, GitHub Pages deploy workflow.

Out of scope: real CC0 audio sourcing (Phase 5), iOS-on-device audio verification (Phase 5), 10-restart memory stability (Phase 5), final QA polish (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Deployment target (DEPLOY-01, DEPLOY-02, DEPLOY-03)
- **D-01:** GitHub Pages project sub-path **for now**, with awareness that Cloudflare Pages may replace it later. Repo: `flappy-3d`. URL: `https://<owner>.github.io/flappy-3d/`.
- **D-02:** `vite.config.ts` sets `base: '/flappy-3d/'`. All asset paths must respect this (vite-plugin-pwa handles SW/manifest paths automatically when `base` is set). **Cloudflare migration cost:** flip `base: '/'` and re-run build — no code changes beyond config.
- **D-03:** GitHub Actions workflow on push to `main`: `npm ci && npm run build` → upload `dist/` as Pages artifact via `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`. Single-command deploy from CI. **Cloudflare migration cost:** delete the workflow, connect repo to CF Pages dashboard (auto-builds on push). Build command and output dir stay the same.
- **D-04:** HTTPS is automatic via GitHub Pages — no extra config. (Same on Cloudflare Pages.)
- **D-04b:** Manifest `start_url` and `scope` use `'./'` (relative) where vite-plugin-pwa allows it, OR `'/flappy-3d/'` if absolute is required. Audit the generated manifest after first build to confirm sub-path correctness; if absolute paths bake in, document the migration toggle clearly so future Cloudflare swap is one config edit.

### PWA stack (PWA-01..05)
- **D-05:** `vite-plugin-pwa` with `strategies: 'generateSW'` and `registerType: 'autoUpdate'` + `skipWaiting: true`. Workbox handles asset precaching from the build manifest.
- **D-06:** Web App Manifest in `vite.config.ts`'s `manifest:` field — populated inline (not separate `public/manifest.json`) so plugin can stamp paths correctly with `base`.
- **D-07:** Icons: 192×192, 512×512, plus a 512×512 `maskable` (per PWA-02). Single source SVG/PNG generated from a procedural Three.js render of the bird (snapshot the `MeshToonMaterial` bird at fixed angle/lighting, export PNG via canvas.toDataURL during a one-time build script). Fallback: solid sky-blue background + orange bird circle if procedural snapshot fails. **Claude's Discretion: exact rendering pipeline for icon generation.**
- **D-08:** Manifest fields: `name: "Flappy 3D"`, `short_name: "Flappy 3D"`, `description: "A polished 3D Flappy Bird PWA."`, `theme_color: "#7ec8e3"` (sky-blue from existing scene), `background_color: "#1a1a1a"` (matches WebGL fallback message), `display: "standalone"`, `orientation: "portrait"`, `start_url: '/flappy-3d/'`.
- **D-09:** Service worker cache scope: precache all build outputs (JS/CSS/HTML/icons) AND `public/audio/*.mp3` (4 files). Audio files are added via `includeAssets` in plugin config. Runtime caching: `CacheFirst` for `*.mp3`, `StaleWhileRevalidate` for everything else.
- **D-10:** Install prompt deferral (PWA-04): capture `beforeinstallprompt` event, store deferred prompt on `window`. Show install CTA on Title screen ONLY after `StorageManager.getLeaderboard().length >= 1` (i.e. user has finished at least one run). Hide otherwise. New StorageManager flag not required — leaderboard length is the proxy for "completed at least one play."

### Lighthouse PWA gate (PWA-05)
- **D-11:** Run `npx lighthouse <url> --only-categories=pwa --output=json --output-path=lighthouse-pwa.json --chrome-flags="--headless"` in CI after deploy preview. Fail the workflow if `categories.pwa.score < 0.9`. Local check via `npm run build && npx serve -s dist` + browser DevTools Lighthouse.

### Accessibility — motion (A11Y-01)
- **D-12:** Already implemented in Phase 3 (`src/a11y/motion.ts` + `prefersReducedMotion(storage)` gates squashStretch, screenShake, particles). Phase 4 verifies coverage and adds any missing call sites — flag if found.

### Accessibility — colorblind palette (A11Y-02)
- **D-13:** New colorblind-safe palette toggle in Settings (already wired as `colorblind: boolean` in StorageManager v2 schema from Phase 3). When ON, swap toon material colors for a deuteranopia/protanopia-safe set:
  - Bird: `#ff7043` (orange) → `#ffd166` (high-luminance yellow)
  - Pipes: green → `#118ab2` (teal-blue, high contrast vs sky)
  - Sky: unchanged (already neutral)
- **D-14:** Palette swap is in-place material color update on toggle — no scene rebuild. **Verify via Coblis or Sim Daltonism that bird/pipes remain distinguishable for both deuteranopia and protanopia simulation.**

### Accessibility — keyboard navigation (A11Y-03)
- **D-15:** Spacebar flaps (already done in Phase 1 InputManager). Phase 4 adds:
  - **Title screen:** Enter starts game (mirrors tap)
  - **Pause screen:** Esc resumes (already done in Phase 3); Enter on focused button activates
  - **GameOver screen:** Enter restarts (already done via tap-anywhere); Esc returns to title
  - **Settings modal:** Esc closes; Tab cycles toggles; Enter/Space activates focused toggle
- **D-16:** Visible focus ring on all `<button>` and `[role=switch]` elements: 2px solid `#ffd166` outline with 2px offset. Override default browser focus where it's invisible against dark backgrounds.

### Accessibility — contrast + touch targets (A11Y-04)
- **D-17:** Audit existing CSS (`src/ui/styles.css`) for any text/background pair below WCAG AA 4.5:1. Use `npx pa11y http://localhost:5173 --standard WCAG2AA` against a local dev server in CI as a quick audit, plus manual check via browser DevTools accessibility panel.
- **D-18:** Touch targets ≥44×44px. Buttons should already be sized in Phase 3; verify and add CSS minimums where missing (`min-width: 44px; min-height: 44px;`). Tappable HUD pause button is the most likely violator — verify.

### Accessibility — screen reader (A11Y-05)
- **D-19:** HUD score already has `aria-live="polite"` (Phase 3, HUD.tsx). Add `aria-live="polite"` to GameOverScreen score so the final number is announced. Verify with VoiceOver (macOS) and TalkBack (Android) emulator.

### Bundle audit (PERF-01)
- **D-20:** Production build adds `rollup-plugin-visualizer` to `vite.config.ts` `plugins` array. Generates `dist/stats.html` on build. CI artifact: upload `stats.html` for inspection.
- **D-21:** Hard CI gate: `npm run build` followed by `gzip -c dist/assets/*.js | wc -c` must report < 250 × 1024 bytes. Fail the build otherwise. Currently 194.64KB gzip (post-Phase 3) — 55KB headroom.

### Performance — 60fps gate (PERF-03)
- **D-22:** No automated 60fps gate (would require real-device testing). Phase 4 documents the manual test procedure (Chrome DevTools FPS meter on iPhone 12 / Pixel 6) and adds a `## Performance Testing` section to README. Run before Phase 5 ships.

### Claude's Discretion
- Exact rendering pipeline for procedural icon generation
- vite-plugin-pwa version pin (lock to latest stable in v0.x or v1.x)
- Workbox cache strategy fine-tuning (e.g., maxEntries for audio cache)
- pa11y standard level beyond WCAG2AA defaults
- GitHub Actions workflow caching strategy (npm cache, Vite cache)
- Whether to inline the manifest icon SVG vs generate PNGs at build time

</decisions>

<specifics>
## Specific Ideas

- **PWA "feel" reference:** match Wordle / 2048 PWA UX — installable from address-bar icon, opens in its own window, works offline, no chrome. The PWA experience must feel native, not a wrapped web page.
- **Install prompt timing:** explicitly NOT auto-fired. Wait until user has finished at least one run (proxy: leaderboard non-empty). The install CTA appears on Title with subtle "Install →" text; don't be pushy.
- **Colorblind UX:** the toggle is already in Settings (Phase 3 wired the storage flag). Phase 4 implements the palette swap and validates simulation.
- **Keyboard parity with mouse/touch:** every action reachable by tap should also be reachable by keyboard. No "mouse-only" affordances.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project foundation
- `.planning/PROJECT.md` — Core value, locked stack (vite-plugin-pwa explicitly listed), bundle budget, perf target
- `.planning/REQUIREMENTS.md` §PWA, §A11Y, §PERF, §DEPLOY — exact acceptance criteria for all 15 requirements in this phase
- `.planning/ROADMAP.md` §"Phase 4" — Goal, Success Criteria, Depends on Phase 3
- `CLAUDE.md` — Locked decisions (vite-plugin-pwa, named imports, AbortController, prefers-reduced-motion in JS, DPR cap, no shadows)

### Prior phase outputs that this phase builds on
- `.planning/phases/03-ui-audio-polish/03-SUMMARY.md` — what Phase 3 delivered (UI screens, audio, motion gates already in place)
- `.planning/phases/03-ui-audio-polish/03-VERIFICATION.md` — Phase 3 verified state (helps Phase 4 know what NOT to redo)
- `src/ui/styles.css` — existing CSS to audit for contrast and focus rings
- `src/storage/StorageManager.ts` — v2 settings schema (where `colorblind` flag lives)
- `src/a11y/motion.ts` — existing motion gate (verify coverage)

### External docs (verify before citing API surface)
- vite-plugin-pwa: `https://vite-pwa-org.netlify.app/` — verify via `ctx7` before citing config keys
- Workbox: `https://developer.chrome.com/docs/workbox/` — verify cache strategies
- Lighthouse PWA audit criteria: `https://web.dev/articles/pwa-checklist` — verify scoring breakdown
- WCAG 2.1 AA contrast tool: `https://webaim.org/resources/contrastchecker/`
- pa11y: `https://github.com/pa11y/pa11y`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/storage/StorageManager.ts` v2 schema already has `colorblind: boolean` slot — palette swap reads this, no migration needed
- `src/a11y/motion.ts` `prefersReducedMotion(storage)` and `subscribeReducedMotion` — proven gate pattern, expand if any motion call sites missed
- `src/render/toonMaterial.ts` `createToonMaterial(gradient, color)` — palette swap is a single color arg change per-mesh
- `src/ui/screens/SettingsModal.tsx` already exposes a `colorblind` toggle (Phase 3) — wire the palette swap behind it
- AbortController pattern from Phase 3 (`main.ts:102` visibilitychange) — apply to any new keyboard listeners

### Established Patterns
- Three.js named imports only (CLAUDE.md mandate) — when adding any Three.js usage in icon generation, named imports
- DOM listeners use AbortController — apply to new keyboard nav listeners on Title/Settings
- Single bridge between Three.js and DOM: `UIBridge.sync(snapshot)` — palette swap may need a `bird.setMaterialColor()` helper rather than direct material mutation

### Integration Points
- `vite.config.ts` — add `rollup-plugin-visualizer` and `vite-plugin-pwa` to `plugins`; set `base: '/flappy-3d/'`
- `index.html` — link manifest, set `<meta name="theme-color">`
- `src/main.ts` — capture `beforeinstallprompt`, expose deferred prompt to UIBridge for the Title install CTA
- `.github/workflows/deploy.yml` — new GitHub Actions workflow (Pages deploy + Lighthouse gate)

</code_context>

<deferred>
## Deferred Ideas

- **iOS Safari add-to-home-screen UX** — Safari doesn't fire `beforeinstallprompt`. Phase 4 covers Android Chrome + desktop Chrome/Edge per PWA-04. iOS install instructions ("tap Share → Add to Home Screen") deferred to Phase 5 (Hardening + Ship).
- **Cloudflare Pages migration** — option for the future. When time comes: (1) flip `vite.config.ts` `base: '/flappy-3d/'` → `'/'`, (2) re-audit the generated manifest's `start_url`/`scope` for the new origin, (3) delete `.github/workflows/deploy.yml`, (4) connect the repo to CF Pages dashboard. No application-code changes required.
- **Real CC0 audio sourcing** — placeholder MP3s + WebAudio synth fallback are in place from Phase 3. Real sound-pack acquisition is Phase 5 (audio assets aren't blocking PWA setup; SW will cache whatever files are present).
- **Memory stability across 10 restarts** (PERF-05) — Phase 5 scope.
- **Service worker update notification UI** — `skipWaiting: true` updates silently. A "new version available" toast is a future polish, not in scope.
- **Push notifications** — out of scope (single-player offline game, no backend).
- **Multi-language manifest** — out of scope.

</deferred>

---

*Phase: 04-pwa-accessibility-bundle-audit*
*Context gathered: 2026-04-29*
