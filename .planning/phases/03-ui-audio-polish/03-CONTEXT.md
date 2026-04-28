# Phase 3: UI + Audio + Polish — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** `/gsd-discuss-phase 3` — auto-resolved with two user-confirmed answers (audio = free CC0 libs via WebFetch; cadence = discuss+plan now, /clear before execute).

<domain>
## Phase Boundary

Phase 3 transforms the bare canvas-only loop into a game that **feels palpably more crafted than the baseline within 30 seconds** — the project's core value claim. By the end:

- Real DOM overlay layer with 4 screens (title, in-game HUD, pause, game-over) + settings modal
- Recorded SFX (flap, score, death) and looping background music via Howler.js with iOS unlock
- GSAP-driven juice: squash-and-stretch on flap, screen shake on death, score-pop animation, "New best!" celebration
- three.quarks particle burst on death (with bespoke `THREE.Points` fallback if compat fails)
- Local leaderboard (top-5 with timestamps) and full settings persistence (sound, music, motion-reduce override, colorblind palette)
- All animations gated by JS `prefers-reduced-motion` check (not just CSS)
- All Howler instances singleton-created at init; AudioContext resumed inside first `pointerup` synchronously

**In scope (REQ-IDs from ROADMAP.md):** HUD-01..08, AUD-01..05, ANIM-01..06, SAVE-03, SAVE-04 (21 requirements).

**Out of scope for Phase 3:** PWA / offline / install (Phase 4 PWA), bundle audit (Phase 4 PERF-01), Lighthouse score (Phase 4 PWA-05), 60fps perf measurement on real device (Phase 4 PERF-03), accessibility (Phase 4 A11Y-02..05; A11Y-01 prefers-reduced-motion is the ONE Phase 4 a11y item we DO touch in Phase 3 because it gates juice — see D-19), tab-blur pause (Phase 5), 10-restart memory stability check (Phase 5), iOS device test (Phase 5).
</domain>

<decisions>
## Implementation Decisions

### Audio assets (user-confirmed: free CC0 via WebFetch)

- **D-01:** Audio files live in `public/audio/` (Vite serves `public/` at root; relative URL `/audio/flap.mp3` works in dev + build). MP3 format (better browser support than OGG; iOS Safari requires MP3 for some features). Files committed to repo (small enough — total <500KB for SFX + music).
- **D-02:** Source CC0 (public domain) samples via WebFetch from these libraries (in priority order — pick from the first that has a clean match):
  1. **pixabay.com/sound-effects/** — CC0, no attribution required. Reliable browser-fetchable.
  2. **freesound.org** — mostly CC-BY/CC0, requires attribution noted in `public/audio/CREDITS.md`. Use only CC0-licensed samples to skip attribution overhead.
  3. **opengameart.org** — CC0/CC-BY mix; download links sometimes need login.
- **D-03:** Required samples + target durations:
  - `flap.mp3` — ~80–150ms whoosh / "boop" / soft pop (high-frequency, snappy)
  - `score.mp3` — ~150–300ms bright ding / chime (mid-high frequency, satisfying)
  - `death.mp3` — ~300–600ms thud / clang / cartoonish hit (low-frequency, punchy)
  - `music.mp3` — 30–60s seamless loop, mellow / chiptune / ambient — under 200KB MP3 at 96–128kbps mono. Aim for "doesn't get annoying after 5 minutes."
- **D-04:** During execute, the gsd-executor agent uses `WebFetch` to find candidate URLs, downloads the audio via `curl -L -o public/audio/<name>.mp3 <url>`, then verifies file size + duration via `ffprobe` if available, or just checks file size + plays a smoke test. Fallback if no good match is found: use placeholder synth (D-09) and add a `// TODO: replace with real asset` comment.
- **D-05:** `public/audio/CREDITS.md` lists sources, licenses, and any required attribution lines. Even for CC0 we list sources — good citizenship.

### Audio architecture (Howler integration)

- **D-06:** Single `AudioManager` class in `src/audio/AudioManager.ts` owns all Howl instances. Singleton, created once at app init in `main.ts`. **All Howl instances created in the constructor** — never recreated on restart (per AUD-05 + Phase 1 pattern).
- **D-07:** Public API:
  ```typescript
  class AudioManager {
    playFlap(): void
    playScore(): void
    playDeath(): void
    setMusicPlaying(playing: boolean): void   // start music in playing state
    setMusicMuted(muted: boolean): void        // settings toggle
    setSfxMuted(muted: boolean): void
    fadeMusicOut(durationMs: number): void     // on dying
    unlock(): void                              // call inside first pointerup synchronously
    dispose(): void
  }
  ```
- **D-08:** **iOS audio unlock pattern (AUD-01)** — at app boot, register a one-time listener: on first `pointerup` ANYWHERE on document, synchronously call `Howler.ctx.resume()`, log unlock, then remove the listener. The listener registration must NOT call `getContext()` lazily — it just primes the resume call. This is the most-bug-prone audio pattern; verify on real iOS Safari with ringer ON and OFF (Phase 5 device test).
- **D-09:** **Fallback if asset fetch fails** — `AudioManager` gracefully degrades: if a Howl errors on load, fall back to a tiny WebAudio oscillator burst (50ms sine for flap, 100ms triangle for score, 200ms sawtooth for death). Logs a warning but doesn't crash. AUD-02 is satisfied by the recorded asset; the fallback is dev-only safety.
- **D-10:** **Music auto-pause on tab blur** — Phase 5 concern (visibilitychange handler). Phase 3 stub: pause music when machine transitions to `paused` state. Tab-blur pause is Phase 5.
- **D-11:** Audio sprite vs separate files — **separate files** for v1. Sprites are an optimization for many-tiny-sounds (4+ SFX); we have 3 + 1 music. Separate files are simpler to source/replace and Howler caches them.

### DOM overlay architecture

- **D-12:** Single `<div id="ui-root">` div added to `index.html` BEFORE the canvas (so canvas paints over it via z-index, then UI div has higher z-index). `pointer-events: none` on root; `pointer-events: auto` on interactive children. Per ARCHITECTURE.md.
- **D-13:** `UIBridge` class in `src/ui/UIBridge.ts` is the ONE module that crosses the systems↔DOM boundary. API:
  ```typescript
  class UIBridge {
    constructor(actor: GameActor, audio: AudioManager, storage: StorageManager)
    mount(): void          // attaches Preact app to #ui-root
    dispose(): void
  }
  ```
  Internally: subscribes to actor; computes derived state (current screen ID, score, bestScore, isMuted, palette); passes via Preact context to component tree. Triggers SFX on FLAP/SCORE/HIT events the actor emits.
- **D-14:** **Preact integration**: `@preact/preset-vite` added to `vite.config.ts`. JSX support via `tsconfig.json` `"jsx": "react-jsx"` + `"jsxImportSource": "preact"`. Components use `import { h } from 'preact'` style automatic JSX. **No React, no React DOM.**
- **D-15:** **Screen routing** — Preact app root listens to actor state value and renders the appropriate screen component:
  ```
  state.value === 'title'    → <TitleScreen />
  state.value === 'playing'  → <HUD />
  state.value === 'paused'   → <PauseScreen />
  state.value === 'dying'    → <HUD /> (frozen — no input gating; same component)
  state.value === 'gameOver' → <GameOverScreen />
  ```
  Settings modal renders ON TOP of any screen via portal/conditional render when `settingsOpen` local state is true.

### Screens

- **D-16:** **TitleScreen** — game title, "Tap to Start" CTA centered, top-3 personal-best leaderboard list, settings cog button (opens modal). Tappable area is the whole screen (so any tap → START event). No images; CSS-only.
- **D-17:** **HUD** — score top-center large readable text (>56px font on desktop, scales down to 40px at 375px viewport). Aria-live polite for screen reader (Phase 4 A11Y-05; we set the attribute in Phase 3 as low-cost). Pause button top-right (44×44px, large enough to tap). No game-over or settings access during play.
- **D-18:** **PauseScreen** — semi-transparent dark backdrop over canvas, centered "Paused" header, Resume + Back-to-Title buttons (both 44×44+ touch target). Renders when state === 'paused'.
- **D-19:** **GameOverScreen** — final score (huge), personal best with "New best!" badge if exceeded, top-5 leaderboard list, "Tap to restart" CTA, back-to-title button. Replaces Phase 2's `scheduleAutoRestart` 1500ms auto-loop — restart is now manual.
- **D-20:** **SettingsModal** — toggles for: Sound on/off, Music on/off, Reduce Motion (override OS), Colorblind Palette. Each toggle is a labeled switch (button with `aria-pressed`). Saves to localStorage on change. Closeable via X button or Escape key (Phase 4 A11Y-03).
- **D-21:** **Screen transitions** — pure CSS opacity + transform (`transition: 250ms cubic-bezier(0.16, 1, 0.3, 1)`) gated under `<150ms` per HUD-07. Apply via `.screen.active` / `.screen.inactive` classes. No GSAP for screen transitions (overkill; CSS handles it). GSAP is only for in-canvas + score-pop CSS keyframes.

### Animation & juice (GSAP integration)

- **D-22:** GSAP imported in `src/anim/anim.ts`. Initialize once: `gsap.ticker.add((time) => ...)` is NOT used (Phase 1 GameLoop owns ticking). Instead, GSAP tweens are fire-and-forget — they animate properties via their own internal RAF, which is fine since they're driving non-physics properties (mesh.scale, mesh.rotation during dying, DOM element transforms).
- **D-23:** **Squash-and-stretch on flap (ANIM-02)**:
  ```typescript
  gsap.to(bird.mesh.scale, {
    x: 1.15, y: 1.4, z: 1.15,
    duration: 0.04,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
    repeatDelay: 0,
  })
  ```
  Total cycle ~80ms. Triggered from `actor.subscribe` when transitioning into `playing` after FLAP, OR from an explicit `bird.flapAnim()` method called from the input.onFlap handler. Using the latter — direct call, no event indirection.
- **D-24:** **Screen shake on death (ANIM-04)** — implemented as a brief camera-position offset (NOT CSS body shake; we have a 3D scene). Use GSAP timeline:
  ```typescript
  const tl = gsap.timeline({ onComplete: () => camera.position.set(0, 0, 8) })
  tl.to(camera.position, { x: '+=0.3', y: '+=0.2', duration: 0.05 })
    .to(camera.position, { x: '-=0.6', y: '-=0.4', duration: 0.05 })
    .to(camera.position, { x: '+=0.5', y: '+=0.3', duration: 0.05 })
    // ...decaying for ~250ms total
  ```
  Trigger on HIT event subscribe. **Gated behind `!prefersReducedMotion`** (D-30).
- **D-25:** **Score pop animation (ANIM-03)** — pure CSS keyframe `@keyframes scorePop { 0% scale 1, 30% scale 1.4, 100% scale 1 }`. Apply to score element via JS toggling `.score-pop` class for 280ms after each SCORE event. CSS-only is plenty.
- **D-26:** **"New best!" celebration (ANIM-06)** — when GameOverScreen mounts and `score > previousBestScore`, render a `<NewBestBadge />` with golden glow CSS animation (`@keyframes goldFlash`). 1500ms loop. CSS only.
- **D-27:** **Particle burst on death (ANIM-05)** — three.quarks ParticleSystem instance, 30 particles emitted at bird position on HIT event. Bespoke `THREE.Points` fallback is a `ParticleEmitter` class with vertex shader (size by age, fade alpha) — about 80 lines, included as fallback if quarks compat breaks. Verify three.quarks 0.17.0 against three r175 BEFORE writing the integration (per CONTEXT 02-D-13 hand-off note).
- **D-28:** Particle and shake gates: BOTH skip when `prefersReducedMotion === true`.
- **D-29:** **GSAP imports**: only the core `gsap` package (~28KB gzip). NO `gsap/ScrollTrigger` or other plugins. Verify named import works: `import { gsap } from 'gsap'`.

### Accessibility (early A11Y-01 only — rest is Phase 4)

- **D-30:** `prefersReducedMotion` is detected ONCE at app boot via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. Stored in a module-level constant (or settings — see D-31 override). Re-read on settings change (D-31). Used by D-23..D-28 to gate motion-heavy animations. NOTE: bird flap squash-stretch is NOT gated (subtle, gameplay feedback); only screen shake and particle burst are gated.
- **D-31:** Settings UI lets user override OS preference: Reduce Motion can be set to "Auto" (use OS) | "On" | "Off". When "On" → gate motion. When "Off" → ignore OS, allow all motion. When "Auto" → use the matchMedia value.

### Persistence extensions (SAVE-03, SAVE-04)

- **D-32:** Extend `StorageManager` (Phase 2 StorageManager.ts) — schema bump to v2:
  ```typescript
  interface SaveV2 {
    schemaVersion: 2
    bestScore: number                       // carried from v1
    leaderboard: Array<{ score: number; ts: number }>  // top-5, sorted desc
    settings: {
      sound: boolean                        // default true
      music: boolean                        // default true
      reduceMotion: 'auto' | 'on' | 'off'   // default 'auto'
      palette: 'default' | 'colorblind'     // default 'default'
    }
  }
  ```
- **D-33:** Migration v1 → v2: `if (raw.schemaVersion === 1) { raw = { ...raw, schemaVersion: 2, leaderboard: [{ score: raw.bestScore, ts: Date.now() }], settings: defaultSettings } }`. Then write back. Deterministic, safe.
- **D-34:** New API on StorageManager:
  ```typescript
  getLeaderboard(): Array<{ score: number; ts: number }>
  pushLeaderboard(score: number): { isNewBest: boolean; rank: number | null }
  getSettings(): SettingsV2
  setSettings(partial: Partial<SettingsV2>): void
  ```
  `pushLeaderboard` keeps top-5 sorted desc, returns rank (1-indexed) or null if outside top-5; `isNewBest` is true if rank === 1.

### Source layout (delta from Phase 2)

- **D-35:** New files:
  ```
  src/
  ├── audio/AudioManager.ts             # Howler wrapper + iOS unlock
  ├── ui/UIBridge.ts                    # actor → DOM bridge
  ├── ui/screens/TitleScreen.tsx        # Preact JSX
  ├── ui/screens/HUD.tsx
  ├── ui/screens/PauseScreen.tsx
  ├── ui/screens/GameOverScreen.tsx
  ├── ui/screens/SettingsModal.tsx
  ├── ui/components/Button.tsx          # shared 44×44 touch target
  ├── ui/components/Toggle.tsx          # settings switch
  ├── ui/components/LeaderboardList.tsx
  ├── ui/components/NewBestBadge.tsx
  ├── ui/styles.css                     # all UI overlay styles
  ├── anim/anim.ts                      # GSAP setup + helper functions (squash, shake)
  ├── particles/ParticleEmitter.ts      # three.quarks wrapper OR bespoke fallback
  ├── particles/createParticles.ts      # entry point — chooses quarks vs fallback
  ├── a11y/motion.ts                    # prefersReducedMotion detection + override
  └── public/audio/{flap,score,death,music}.mp3 + CREDITS.md
  ```
  Modified: `src/main.ts` (mount UIBridge, init AudioManager, wire HIT/SCORE → audio + particle + shake), `src/storage/StorageManager.ts` (schema v2 + new API), `index.html` (add `<div id="ui-root">`), `vite.config.ts` (Preact preset), `tsconfig.json` (jsx settings), `package.json` (deps: gsap, howler, preact, three.quarks, @preact/preset-vite).

### Numeric tunables (treat as first-pass)

- **D-36:**
  - Flap squash duration: 80ms (0.04s × 2 yoyo)
  - Score pop duration: 280ms
  - Death shake duration: 250ms (5 keyframes × 50ms)
  - Music fade-out on dying: 600ms (covers the 800ms dying state with 200ms breathing room)
  - "New best!" gold flash loop: 1500ms
  - Particle count on death: 30
  - Particle lifespan: 800ms
  - HUD score font size: clamp(40px, 8vw, 96px)

### Claude's Discretion

- Exact CSS color palette (sky-blue / sunny / Zelda-anime vibe)
- Specific easing curves within the constraints above
- Internal Preact component file structure (refactor as you go)
- Whether the settings modal uses `<dialog>` or a custom overlay
- Specific particle shapes / colors

### Folded Todos

(none — no relevant pending todos)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — vision, locked decisions, core value
- `.planning/REQUIREMENTS.md` — Phase 3 covers HUD-01..08, AUD-01..05, ANIM-01..06, SAVE-03, SAVE-04
- `.planning/ROADMAP.md` §"Phase 3" — phase goal + 5 success criteria
- `.planning/STATE.md` — Phase 1+2 complete; current focus = Phase 3
- `CLAUDE.md` — coding rules

### Phase 1+2 hand-off
- `.planning/phases/01-scaffold-core-loop/01-SUMMARY.md`
- `.planning/phases/02-machine-obstacles-rendering/02-SUMMARY.md` — Phase 2 hand-off notes (esp. "scheduleAutoRestart is a Phase 2 stub" — Phase 3 GameOverScreen replaces it)

### Research (project-level)
- `.planning/research/SUMMARY.md` §3 (features), §4 (UI overlay arch), §5 (iOS audio pitfall #3)
- `.planning/research/STACK.md` — GSAP, Howler, Preact, three.quarks bundle costs and rationale
- `.planning/research/ARCHITECTURE.md` — UI overlay architecture, dependency rules
- `.planning/research/PITFALLS.md` — pitfalls #3 (iOS audio unlock), #5 (touch input — already handled), #8 (audio autoplay), #11 (Vite public/), #14 (a11y reduced-motion)

### External (verify via ctx7 before citing API specifics)
- Howler.js docs — `https://github.com/goldfire/howler.js`
- GSAP docs — `https://gsap.com/docs/v3/`
- Preact docs — `https://preactjs.com/`
- three.quarks GitHub — `https://github.com/Alchemist0823/three.quarks`
- MDN matchMedia — `https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia`
- pixabay.com sound effects — `https://pixabay.com/sound-effects/` (CC0 source)

### Asset sourcing notes (D-02)
- Pixabay CC0 audio search URL pattern: `https://pixabay.com/sound-effects/search/<query>/?audio_type=sound_effect`
- Direct download requires API key OR the public download button URL (CDN-hosted).
- For background music: `https://pixabay.com/music/search/genre/ambient/?duration=0-30`
</canonical_refs>

<code_context>
## Existing Code Insights (post-Phase 2)

### Reusable assets
- `src/machine/gameMachine.ts` — actor exposes events (FLAP, SCORE, HIT, START, RESTART) — Phase 3 subscribes to drive audio + animation hooks
- `src/storage/StorageManager.ts` — extend with v2 schema + new methods (D-32..D-34)
- `src/main.ts` — has `actor.subscribe` console-log debug bridge — Phase 3 replaces with `new UIBridge(...)`; remove `scheduleAutoRestart` call
- `src/entities/Bird.ts` — bird.mesh accessible for squash-stretch tween target
- `src/render/createRenderer.ts` — camera accessible for screen shake target
- `index.html` — has `<canvas id="scene">` — Phase 3 adds `<div id="ui-root">` BEFORE canvas in DOM
- `src/style.css` — minimal canvas styling, KEEP; Phase 3 adds `src/ui/styles.css` (separate concerns)
- `vite.config.ts` — extend plugins array with `preact()`

### Established patterns (carry forward)
- Class-per-system with constructor injection
- Named Three.js imports only
- Constants in `src/constants.ts`, imported by name (Phase 3 may add a few — UI_TRANSITION_MS, etc.)
- TS strict + noUncheckedIndexedAccess
- erasableSyntaxOnly tsconfig — NO parameter property shorthand (`private x: T` in constructor params); use explicit fields + assignments

### Anti-patterns to avoid
- Don't import three in `gameMachine.ts` (rule from Phase 2)
- Don't put DOM logic in systems (rule from D-13)
- Don't recreate Howl instances on restart (D-06, AUD-05)
- Don't `getContext()` lazily — must resume in user-gesture handler (D-08, AUD-01)
- Don't `import * as THREE` anywhere
- Don't use parameter property shorthand in TS constructors

### Integration points
- `actor.subscribe(snapshot => ...)` — single subscription drives UIBridge + AudioManager + animation triggers
- `Howler.ctx.resume()` — call inside `pointerup` once
- `loop` — Phase 3 doesn't add loop systems; all polish is event-driven via actor subscribe
- `scene.add(particleSystem.mesh)` — three.quarks attaches to the scene
</code_context>

<specifics>
## Specific Ideas

- **The user core-value claim** ("palpably more crafted than baseline within 30 seconds") gets satisfied by these specific moments: cel-shaded bird squashes on flap (visceral feedback) + screen shakes on death + particle burst on death + score pop + recorded "ding" on score. These five moments compounded create the feel difference.
- **Pause modal closes on Escape** for desktop — small detail, big polish.
- **Reduce-motion gate is JS not CSS** because canvas animations (camera shake) ignore CSS prefers-reduced-motion. The JS check is the only way to honor the OS setting in canvas.
- **Pixabay** is the safest source for free CC0 audio because no attribution is required — keeps `CREDITS.md` short.
- **Settings modal as `<dialog>` element** is a 2025 standard — gets focus management for free, native escape-to-close.
</specifics>

<deferred>
## Deferred Ideas

These came up while drafting Phase 3 context but belong in later phases:
- **PWA installable + offline + manifest** → Phase 4 PWA-01..05
- **Lighthouse PWA audit ≥90** → Phase 4 PWA-05
- **Real-device 60fps measurement** → Phase 4 PERF-03
- **Tab-blur visibilitychange auto-pause** → Phase 5 (also stubbed in HUD-04 for in-game pause-on-blur — but cleaner Phase 5 implementation)
- **Bundle size audit** → Phase 4 PERF-01 (will validate ~143KB → target ~210KB after GSAP+Howler+Preact+quarks)
- **Memory stability across 10 restarts** → Phase 5 PERF-05
- **Real iOS device audio test** → Phase 5
- **Colorblind palette tuning beyond luminance contrast** → Phase 4 A11Y-02 polish
- **Keyboard navigation, focus management, full WCAG AA** → Phase 4 A11Y-03..05 (Phase 3 only does aria-live + Escape-closes-modal as low-cost wins)
- **Share-to-clipboard / web-share API** → defer to v2 SHARE-V2-01
- **Haptic vibration on death (Android)** → defer to v2 HAPTIC-V2-01
- **Medal system (bronze/silver/gold/platinum)** → defer to v2 MEDALS-V2-01
- **Modeled hero bird via GLTF** → defer to v2 ASSETS-V2-01
</deferred>

---

*Phase: 03-ui-audio-polish*
*Context gathered: 2026-04-29 via /gsd-discuss-phase 3 (interactive — 2 user-confirmed answers)*
