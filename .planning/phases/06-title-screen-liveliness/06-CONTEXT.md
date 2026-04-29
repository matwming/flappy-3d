# Phase 6: Title-Screen Liveliness - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Milestone:** v1.1 — Beauty Pass

<domain>
## Phase Boundary

Make the Title screen feel alive within 2 seconds of opening — bird bobbing, pipes scrolling past as a demo, "Flappy 3D" logo animating in, and "Tap to start" CTA pulsing. All effects motion-gated. Pure additive on top of the shipped Phase 3 TitleScreen.

In scope:
- Bird sine-wave bob on title state (1Hz, ±0.15m amplitude, motion-gated)
- Demo pipes scrolling past in title state (no collision; uses existing scroll/spawn infra extended to 'title' OR a one-shot demo spawner)
- "Flappy 3D" logo letter-stagger fade-in via GSAP timeline (one-shot per title mount)
- "Tap to start" CTA opacity pulse via CSS keyframes (motion-gated)

Out of scope:
- Any in-game juice (Phase 7)
- Glass overlays / typography (Phase 8)
- 3D scene polish (rim lighting, shaders) — v1.2+
- Day/night cycle, weather — v1.2+

</domain>

<decisions>
## Implementation Decisions

### Bird bob (BEAUTY-01)
- **D-01:** Drive bird bob from `actor.subscribe` in main.ts (or a dedicated `BirdBobSystem` if cleaner). Sine wave: `bird.position.y = sin(t * 2π) * 0.15` while state==='title' and `!prefersReducedMotion(storage)`. When reduced-motion: hold y=0.
- **D-02:** Bob runs in `title` state only — must NOT interfere with PhysicsSystem (which is already gated to playing+dying). When transitioning title → playing, the existing `roundStarted` reset hook (main.ts) sets pos.y=0, velocity=0 — so no carryover.
- **D-03:** Implementation choice (Claude's discretion): inline tween in main.ts loop, separate system class, or GSAP. Prefer inline + a `time` accumulator to keep it 5-10 lines. Avoid GSAP for this — sin() is simpler.

### Demo pipes (BEAUTY-02)
- **D-04:** Reuse existing `ObstaclePool` + `ObstaclePair`. Two implementation paths (planner picks):
  - **Path A:** Extend `ScrollSystem` to also run when `state === 'title'`. Extend `ObstacleSpawner` similarly with a slower spawn cadence. Lower difficulty hardcoded (wider gap, slower scroll).
  - **Path B:** Add a `TitleDemoSystem` that owns 2-3 ObstaclePairs and scrolls them independently. Doesn't touch ScrollSystem/ObstacleSpawner.
- **D-05:** Recommended: Path A with state-aware difficulty (`difficultyFrom('title')` returns lower-pressure values). Less code, reuses proven mechanics.
- **D-06:** CollisionSystem is already gated to `state === 'playing'` — demo pipes naturally don't collide. NO changes to CollisionSystem.
- **D-07:** Music: lower the music volume on title state vs. playing (e.g., 0.4 → 0.2 in title). AudioManager already has `setMusicPlaying(true/false)`; consider adding `setMusicVolume(v)` OR doing it inline via `Howler.volume`.
- **D-08:** Demo pipes despawn on left edge same as gameplay (existing scroll system handles this). On title → playing transition, the `roundStarted` hook clears all active obstacles — so no leftover demo pipes during gameplay.

### Logo entrance (BEAUTY-03)
- **D-09:** TitleScreen.tsx renders `<h1>Flappy 3D</h1>` (or current heading text — verify in code). Wrap each character in a `<span>` (split string at component mount). Use GSAP timeline to stagger opacity 0 → 1 with ~50ms delay, ~300ms total. Triggered once on TitleScreen mount.
- **D-10:** Re-trigger behavior: when navigating gameOver/RESTART → title (e.g., back-to-title button), the logo should NOT re-animate. Use a ref to track "has-animated" within session lifetime.
- **D-11:** Reduced-motion: skip animation, render letters at full opacity immediately.

### CTA pulse (BEAUTY-04)
- **D-12:** "Tap to start" element gets a `pulse` CSS class with `@keyframes` opacity 0.6 → 1.0 over 1.6s `ease-in-out` infinite alternate. Add `prefers-reduced-motion: reduce { animation: none }` media query OR check `prefersReducedMotion(storage)` and skip the class conditionally.
- **D-13:** Storage-based reduced-motion: use the same approach as Phase 4 (the user can override via Settings). The CSS-media-query approach catches OS-level setting; storage catches user toggle.

### Cross-cutting
- **D-14:** All BEAUTY-* effects gate behind the same `prefersReducedMotion(storage)` helper introduced in Phase 3. Pattern matches squashStretch, screenShake, particle burst.
- **D-15:** No new heavy dependencies. GSAP already available (Phase 3). No new npm installs needed.
- **D-16:** Bundle budget: each addition <2KB gzipped. Total Phase 6 budget overhead: <8KB. Currently 188KB / 250KB → 62KB headroom; comfortable.

### Claude's Discretion
- Bird bob implementation (inline vs separate system)
- Exact sine frequency / amplitude tuning (within the spec'd ±0.15m at ~1Hz)
- Logo letter-stagger easing (GSAP defaults are fine)
- Whether to add `setMusicVolume(v)` to AudioManager or inline `Howler.volume(0.2)` calls
- Demo pipe difficulty constants — pick something visually pleasant (gap 2.5m, scroll 1.5 units/s ish?)

</decisions>

<specifics>
## Specific Ideas

- **Reference:** modern arcade games like Vampire Survivors, Suika Game, Stumble Guys — title screens are visually busy and inviting before you press anything. Even a "boring" Flappy clone benefits from this.
- **The win:** today the title is a static cel-shaded scene with a centered text card. After Phase 6, opening the URL should already feel like the game is happening.
- **No regression rule:** must not affect playing state. Demo pipes must visually de-spawn / be cleared at title→playing transition. Bird bob must not interfere with first-flap physics.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 6: Title-Screen Liveliness" — Goal + 4 Success Criteria
- `.planning/REQUIREMENTS.md` §BEAUTY — BEAUTY-01..04 acceptance criteria
- `CLAUDE.md` — locked decisions (motion-gating, named imports, AbortController)

### Existing code Phase 6 builds on
- `src/ui/screens/TitleScreen.tsx` — current title content (heading + tap-to-start text + leaderboard + cog)
- `src/ui/UIBridge.tsx` — Preact mount, props/state passed to TitleScreen
- `src/main.ts` — actor.subscribe block (where bird bob may hook in), `roundStarted` reset hook, AbortController `ac`
- `src/entities/Bird.ts` — bird mesh + position/velocity (where bob applies)
- `src/systems/ScrollSystem.ts` — current scroll loop (potentially extended for demo pipes)
- `src/systems/ObstacleSpawner.ts` — current spawner (potentially extended for demo cadence)
- `src/systems/CollisionSystem.ts` — already gated to 'playing'; verify no regression
- `src/audio/AudioManager.ts` — Howl music control (potential setMusicVolume addition)
- `src/a11y/motion.ts` — `prefersReducedMotion(storage)` helper (gate every effect)
- `src/anim/anim.ts` — GSAP helpers (squashStretch pattern; new logo entrance follows similar shape)
- `src/ui/styles.css` — where the CTA pulse keyframe lives

### External docs (verify before citing)
- GSAP timeline + stagger: existing project pattern in `src/anim/anim.ts`. Re-verify via `ctx7` only if uncertain.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- `prefersReducedMotion(storage)` — already used in main.ts for squashStretch/screenShake/particles. Pattern to mirror for every new effect.
- `actor.on('roundStarted', ...)` — main.ts hook that resets entities on round start. Demo pipes must be cleared here OR by the existing pool clear.
- AbortController + `{ signal: ac.signal }` — for any new event listeners. Already wired through render modules.
- GSAP timeline pattern in `src/anim/anim.ts` — `squashStretch` shows the project's style for short tweens.

### Integration points
- TitleScreen.tsx — h1 element to split into character spans for logo entrance; tap-to-start element to receive `pulse` class
- ScrollSystem.ts:28 — current state-gate `if (state !== 'playing' && state !== 'dying') return` — relax to also include 'title' if Path A
- ObstacleSpawner.ts:21 — same gate, same relaxation if Path A
- main.ts actor.subscribe — where state-aware bob/music-volume changes hook in

### Files unchanged in Phase 6
- src/storage/StorageManager.ts (no new settings)
- src/machine/gameMachine.ts (no new states or events; logo + bob + CTA + demo pipes are all read-only consumers of existing state)
- src/render/* (no shader/material changes)
- vite.config.ts, package.json (no new deps; no manifest/PWA changes)

</code_context>

<deferred>
## Deferred Ideas

- **Day/night cycle on background** (sky-color animation tied to score or time) — v1.2+ if Beauty Pass keeps going
- **Cloud parallax layer** — needs sprite assets; deferred (Phase 6 doesn't add art assets)
- **Logo SVG / custom font** — Phase 8 covers Press Start 2P; logo styling is intentionally still text-only here
- **Sun/moon highlight in sky shader** — fun follow-up; not in v1.1 scope

</deferred>

---

*Phase: 06-title-screen-liveliness*
*Context gathered: 2026-04-29*
