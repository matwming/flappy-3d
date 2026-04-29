# Phase 5: Hardening + Ship - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Pass every "Looks Done But Isn't" hardening check from `.planning/research/PITFALLS.md`. Verify the running build at https://matwming.github.io/flappy-3d/ — memory is stable across 10 death+restart cycles, audio works on real iOS Safari with ringer behavior documented, tab-blur pauses music and resumes correctly, no orphaned event listeners or stopped-actor warnings, and the live URL is the final shipped artifact.

In scope:
- Memory leak audit + fixes (renderer.info.memory.geometries/textures stable across 10 restarts)
- Real-device iOS Safari audio verification (`Howler.ctx.state === 'running'` after first tap)
- Tab-blur pause/resume verification (visibilitychange already wired in Phase 3, verify behavior end-to-end)
- Stopped-actor warning audit (no "Event sent to stopped actor" across 20 cycles)
- Event listener accumulation audit (`getEventListeners(document)` stable after 10 restarts)
- Real CC0 audio asset sourcing (replaces the placeholder MP3s from Phase 3)
- 60fps confirmation on real device (carries over from Phase 4 PERF-03 human-verify item)
- Parallax verification on device (VIS-07)
- Final README polish, ship checklist, version tag

Out of scope:
- New gameplay features
- New screens or UI flows
- Cloudflare Pages migration (deferred indefinitely; CONTEXT awareness in Phase 4 is enough)
- Multi-language / i18n
- Analytics or telemetry

</domain>

<decisions>
## Implementation Decisions

### Memory stability (PERF-05, SC-1)
- **D-01:** Add a one-time dev-only memory probe in `src/main.ts` (gated behind `import.meta.env.DEV`): every state transition `gameOver → playing` (i.e., the `roundStarted` event already wired in Phase 3 fix), log `renderer.info.memory.geometries` and `.textures`. Test procedure: play 10 deaths in a row, observe console — both should plateau, not grow.
- **D-02:** If growth is detected, use the dev probe to identify the leaking system. Most likely culprits per PITFALLS.md:
  - Ungated `new` calls inside the loop (audit `loop.add`'d systems with `grep -rnE "new (Mesh|Geometry|Material|Vector3|Box3)" src/systems/`)
  - Missing `disposeMesh()` on entity teardown
  - Background scroll system creating new meshes per frame
- **D-03:** Fix at root cause — pool the leaking objects (per CLAUDE.md `ObjectPool<T>` mandate) or add `dispose()` at the right teardown point. Patch surgically, do not refactor surrounding code.

### iOS Safari audio verification (SC-2)
- **D-04:** Verify on real iOS device (iOS 16+, Safari). Test plan documented in README's new "Hardening verification" section:
  1. Open https://matwming.github.io/flappy-3d/ in Safari on iOS
  2. Tap to start — observe sound effects play immediately (flap, score, death)
  3. Confirm `Howler.ctx.state === 'running'` via Safari Web Inspector (mac → iPhone connected via USB)
  4. Repeat with ringer ON and ringer OFF (silent switch). Document expected behavior in Settings tooltip.
- **D-05:** iOS silent switch behavior: when silent switch is ON, iOS silences `<audio>` and Web Audio by default. There's no JavaScript API to bypass this. **Decision:** add a small note in the Settings modal under the music toggle: "iOS silences sound when the silent switch is on. Toggle it off to hear audio." No code workaround attempted (would require user gesture each time).

### Tab-blur pause/resume (SC-3)
- **D-06:** Visibilitychange listener already added in Phase 3 (`src/main.ts:127`). Phase 5 task: verify end-to-end on the live deploy:
  1. Start a round, switch tab → music stops, game state is `paused`
  2. Switch back → game shows `paused` screen, score preserved
  3. Tap RESUME → music resumes, game continues from where it stopped
- **D-07:** If music doesn't resume cleanly on RESUME (Howler quirk after long backgrounding), patch by re-calling `audio.setMusicPlaying(true)` on the `paused → playing` transition. Hook into the existing actor.subscribe block.

### Stopped-actor warnings (SC-4 part 1)
- **D-08:** Audit all systems' `actor.send` and `actor.getSnapshot` call sites for `actor.getSnapshot().status !== 'active'` guards. CollisionSystem already has this guard (`src/systems/CollisionSystem.ts:47`). Verify other systems and add the guard where missing.
- **D-09:** Test procedure: open console on the live deploy, play 20 cycles (death + restart), confirm zero "Event sent to stopped actor" warnings.

### Listener accumulation (SC-4 part 2)
- **D-10:** Audit all `addEventListener` call sites in `src/`. CLAUDE.md mandates `AbortController`. Phase 4 audit in 04-02 covered the screen components; Phase 5 verifies the Phase 1/2 systems and InputManager.
- **D-11:** Test procedure: in DevTools console, run `getEventListeners(document)` after 10 restart cycles. Count should be the same as immediately after page load.
- **D-12:** If accumulation is detected, the fix is mechanical: replace bare addEventListener with AbortController-backed registration scoped to the lifetime of the listener's owner.

### Real CC0 audio sourcing (carries over from Phase 3 AUD-02 deferred)
- **D-13:** Replace placeholder MP3s in `public/audio/` with real CC0/CC-BY samples. Source: pixabay.com/sound-effects (free, CC0/no-attribution required) or freesound.org (CC0 filter).
- **D-14:** Required samples: `flap.mp3`, `score.mp3`, `death.mp3`, `music.mp3`. Update `public/audio/CREDITS.md` with source URLs and license notes.
- **D-15:** Constraints: each SFX <10KB gzipped; music loop <100KB gzipped; total audio bundle stays under 250KB to keep total budget intact. Workbox SW already pre-caches `*.mp3` (Phase 4) — no SW changes needed.
- **D-16:** Acceptance: play the live deploy, confirm flap/score/death are recognizable audio (not synth oscillator fallback).

### 60fps confirmation (PERF-03 carryover)
- **D-17:** Use Chrome DevTools FPS meter on a real iPhone 12 / Pixel 6 (procedure already documented in README from Phase 4). Play a full 30s round, observe sustained 60fps. Mark Phase 4 HUMAN-UAT item #2 PASSED if successful.

### Parallax verification (VIS-07)
- **D-18:** Confirm on real device that the parallax background (`src/entities/Background.ts`) renders distant layers smoothly during scroll. No new code expected — this is a visual verification.

### Final ship checklist
- **D-19:** Tag `v1.0.0` after all Phase 5 verifications pass: `git tag v1.0.0 && git push origin v1.0.0`. README "Live" link already points to https://matwming.github.io/flappy-3d/ from Phase 4.
- **D-20:** Create a `docs/SHIPPED.md` (or similar) summarizing the v1 ship: requirements coverage table, known limitations, acknowledgments. Optional — Claude's discretion whether to include.

### Claude's Discretion
- Exact dev-only console probe format (line, table, custom inspector)
- Whether to add a runtime memory-growth assertion in DEV mode (e.g., warn if geometries grew by >5 across 5 cycles)
- Whether to ship `docs/SHIPPED.md` or fold its content into the README
- Specific CC0 audio sample selections (any clean Pixabay set works)
- Whether to set up automated memory monitoring (probably overkill for v1)

</decisions>

<specifics>
## Specific Ideas

- **"Looks Done But Isn't" framing:** the phase is about catching the failures that DON'T show up in green CI but bite real users (memory creep over 10 minutes, silent audio on iOS first launch, music ghost playing after tab-close). Each Success Criterion maps to exactly such a failure mode.
- **Manual-test bias:** PERF-05 (memory) and SC-2..4 are all real-runtime checks that automated CI can't validate. The phase produces test procedures (not test code) that the user runs, plus surgical fixes when a check fails.
- **Ship gate is a tag, not a deploy:** the deploy is already live (Phase 4). v1.0.0 tag is the symbolic completion marker.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Hardening source of truth
- `.planning/research/PITFALLS.md` — primary input for what hardening checks matter; the goal references it directly
- `.planning/REQUIREMENTS.md` §PERF, §VIS — PERF-05 + VIS-07 are the only formally-mapped requirements for this phase
- `.planning/ROADMAP.md` §"Phase 5" — Goal + 4 Success Criteria

### Project foundation
- `.planning/PROJECT.md` — Core value, locked stack, perf target
- `CLAUDE.md` — Locked decisions: AbortController for listeners, ObjectPool for instantiated objects, disposeMesh for teardown, prefers-reduced-motion gates, named Three.js imports

### Prior phase outputs that this phase verifies
- `.planning/phases/04-pwa-accessibility-bundle-audit/04-VERIFICATION.md` — Phase 4 results, including 60fps human-verify item that carries forward
- `.planning/phases/04-pwa-accessibility-bundle-audit/04-HUMAN-UAT.md` — pending real-device tests (60fps), pass them as part of Phase 5 sign-off
- `.planning/phases/03-ui-audio-polish/03-VERIFICATION.md` — known carry-forward: AUD-02 placeholder audio replacement, code review WR-01 (bare addEventListener) leftover candidates
- `src/main.ts` — visibilitychange already wired (line 127), `roundStarted` reset hook (line 152), audio subscribe block (line 168)
- `src/systems/CollisionSystem.ts` — example of `actor.getSnapshot().status !== 'active'` guard pattern to verify in other systems
- `src/audio/AudioManager.ts` — Howler.ctx unlock pattern to verify on real iOS

### External docs (verify before citing API surface)
- Howler.js: `https://github.com/goldfire/howler.js` — verify ctx state API and iOS unlock pattern
- Three.js memory: `https://threejs.org/manual/#en/cleanup` — verify renderer.info.memory keys and dispose patterns
- Pixabay sound effects: `https://pixabay.com/sound-effects/` — CC0 audio sourcing
- Freesound: `https://freesound.org/` — CC0 / CC-BY audio with explicit license filter

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- `actor.getSnapshot().status !== 'active'` guard — already in CollisionSystem.hit(); pattern to replicate in any system that calls `actor.send` after async/setTimeout boundaries
- `ObjectPool<T>` for ObstaclePair — established in Phase 2; reuse for any leaking system
- `import.meta.env.DEV` gate — Vite-native, used in `actor.subscribe` log block (main.ts:170); reuse for the memory probe
- AbortController + `{ signal: ac.signal }` — already used in `main.ts:127` (visibilitychange), Phase 3 audio binding, Phase 4 keyboard listeners; the pattern to reuse for any remaining bare listeners

### Verification surfaces (no code change expected)
- `renderer.info.memory.geometries` and `.textures` — Three.js exposes these natively; no setup needed
- `Howler.ctx.state` — exposed as a getter; check from console
- `getEventListeners(document)` — Chrome DevTools-only API; works in console without setup

### Likely fix sites (audit but probably no change needed)
- InputManager — already uses AbortController per Phase 1 plan; verify no regression
- ScrollSystem, PhysicsSystem, ScoreSystem — verify no `new THREE.*` allocations in step() (CLAUDE.md mandate already in place)
- Bird entity — single mesh + material, dispose method already exists; verify it's called if/when teardown is needed (probably never in this single-page app — bird lives for the page lifetime)

</code_context>

<deferred>
## Deferred Ideas

- **Cloudflare Pages migration** — already documented in Phase 4 deferred; not in scope for v1.
- **iOS PWA install instructions UI** — Safari doesn't fire `beforeinstallprompt`. A "tap Share → Add to Home Screen" toast for iOS users would be nice but is polish, not hardening.
- **Push notifications, multi-language, analytics** — out of scope for v1, no ROADMAP coverage.
- **Memory monitoring beyond v1** — automated memory regression testing in CI (e.g., headless Chrome + memory.usedJSHeapSize) is interesting but overkill for v1 ship gate.
- **High-score leaderboard sync (cloud)** — explicitly out of scope per PROJECT.md (local-only).

</deferred>

---

*Phase: 05-hardening-ship*
*Context gathered: 2026-04-29*
