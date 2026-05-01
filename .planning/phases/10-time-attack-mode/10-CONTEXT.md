# Phase 10: Time-Attack Mode - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Milestone:** v1.2 — Modes (second phase)

<domain>
## Phase Boundary

Add the time-attack playable mode. After Phase 10, selecting Time-Attack on Title starts a round with a 60-second countdown; HUD shows the timer; when timer reaches 0, the round auto-ends to gameOver; player's best-score-in-time-attack tracked separately via the per-mode leaderboard from Phase 9.

In scope:
- Timer state: 60-second countdown, decrements during `playing` state in time-attack mode
- HUD: timer display (mm:ss format), `aria-live` for screen readers, only visible in time-attack mode
- Auto-end transition: when timer reaches 0, machine transitions to gameOver (via dying for the standard 800ms death animation, OR direct → gameOver — pick at planning time)
- Reset behavior: timer resets to 60s on `roundStarted` event (start/restart)
- Pause behavior: timer freezes during `paused` state, resumes on RESUME

Out of scope:
- Daily-seed mode (Phase 11)
- Time-attack-specific difficulty (uses existing `difficultyFrom(score)` curve)
- Power-ups, multipliers, time bonuses, or any time-attack-specific gameplay mechanics
- Per-mode best-time tracking (we track best score, not best time — there's only one duration: 60s)

</domain>

<decisions>
## Implementation Decisions

### Timer ownership (MODE-04)
- **D-01:** Create new `src/systems/TimerSystem.ts`. Owns `timeRemaining: number` (in seconds, starts at 60). Implements `step(dt)` like other systems. Registered in `loop.add(...)` in main.ts.
- **D-02:** TimerSystem.step decrements `timeRemaining` by `dt` ONLY when `state === 'playing'` AND `context.mode === 'timeAttack'`. Pauses during `paused` state automatically (no decrement). Resumes on RESUME (no special handling needed; the gate naturally re-enables).
- **D-03:** When `timeRemaining <= 0` and we just dropped below threshold this frame: clamp to 0, send `actor.send({ type: 'TIME_UP' })`. Guard against double-fire (`hasFired` flag, reset on roundStarted).
- **D-04:** Reset behavior: on `actor.on('roundStarted')`, reset `timeRemaining = 60` and `hasFired = false`. Wired in main.ts's existing roundStarted handler (which already resets bird/obstacles/milestones/ghost-meshes/spawn-color-index).

### TIME_UP event + machine transition (MODE-06)
- **D-05:** Add to GameEvent union: `{ type: 'TIME_UP' }`
- **D-06:** Add to `playing.on`: `TIME_UP: { target: 'dying' }`. Reuses existing dying → gameOver pathway for consistency (player sees the standard death animation, then gameOver). Pauses + dying state correctly suppress further timer ticks.
- **D-07:** Don't add TIME_UP to other states (paused, dying, gameOver, title). Only `playing` accepts it. The hasFired guard in TimerSystem prevents double-send anyway, but state-machine-level rejection is good defense.
- **D-08:** Bird at TIME_UP: should the bird "die" visually (fall + rotate) or just freeze? Per D-06 routing through dying, the bird falls + rotates per existing PhysicsSystem behavior. Simpler than adding a new "time-up" animation. Acceptable cosmetic compromise — player gets standard death feedback.

### HUD timer display (MODE-05)
- **D-09:** Add a `<TimerDisplay>` component in `src/ui/components/TimerDisplay.tsx` (or inline in HUD.tsx — Claude's discretion). Renders mm:ss format (e.g., "0:45", "1:00"). When ≤10s remaining: visual urgency (color shift to red, pulse animation gated by motion).
- **D-10:** Position: top-right of HUD, mirroring the existing pause button's positioning. Don't conflict with the score (top-center) or pause button (top-right). Place pause button below timer or use horizontal layout.
- **D-11:** Visibility: only render when `actor.context.mode === 'timeAttack'`. In endless/daily, the timer slot is empty.
- **D-12:** ARIA: `aria-live="polite"` so screen readers announce time changes (but not every tick — limit announcements to 5s/10s/15s remaining etc., OR use `aria-live="off"` and only announce on milestone seconds via a separate live region). Pragmatic: use `aria-live="polite"` on the visible timer element, accept that screen readers will announce every second change. Less ideal but simpler. Polish for v1.2.1 if it's noisy.
- **D-13:** Timer reads from TimerSystem via a getter (e.g., `timer.timeRemaining`). HUD re-renders every 1 second via setInterval, OR every UIBridge actor.subscribe call. setInterval is more predictable. Use AbortController per CLAUDE.md.

### Pause/resume semantics
- **D-14:** Tab-blur (visibilitychange) → PAUSE → timer frozen via D-02 gate. RESUME → timer continues from where it was. No special wiring needed; D-02 already handles it.
- **D-15:** RESTART transitions playing → playing (via gameOver) — roundStarted fires → timer resets to 60. Same handling as Endless.

### Cross-cutting
- **D-16:** Bundle target ≤250KB; current 196.75KB. Estimated +2-4KB (TimerSystem, TimerDisplay, machine event, CSS). Comfortable.
- **D-17:** No new dependencies.
- **D-18:** Endless and Daily modes unaffected. TimerSystem.step is no-op in those modes.
- **D-19:** Mode-aware leaderboard from Phase 9: time-attack scores already route to `leaderboardByMode.timeAttack` via main.ts gameOver branch. NO new wiring needed.

### Claude's Discretion
- TimerDisplay: separate component vs inline in HUD
- Urgency indicator at low time: red color, pulse, both, or just bigger text
- HUD layout: timer above pause button vs side-by-side
- Whether to add a "time bonus" effect when scoring (e.g., +1s per pipe). **Out of scope** — keep timer simple.

</decisions>

<specifics>
## Specific Ideas

- **Reference for time-attack feel:** Wordle, Mini Motorways, Sudoku timers — minimal visual presence, clear when running out. NOT a Vegas slot machine countdown.
- **The win at 60s:** the round auto-ends with whatever score the player got. Their high score replaces the time-attack PB if higher. The standard death animation provides closure (no need for a fancy "time's up" effect).
- **Milestone bursts at 10/25/50** (Phase 7) still apply during time-attack — they're motion-gated, not mode-gated. Player gets BEAUTY-07 celebrations even in time-attack.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 10: Time-Attack Mode" — Goal + 4 SC
- `.planning/REQUIREMENTS.md` §MODE — MODE-04, MODE-05, MODE-06 acceptance criteria
- `.planning/seeds/SEED-004-time-attack-mode.md` — original seed (now consumed)
- `CLAUDE.md` — locked decisions

### Existing code Phase 10 builds on
- `src/systems/PhysicsSystem.ts` and `src/systems/CollisionSystem.ts` — pattern reference for system class with `step(dt)` + actor reference
- `src/machine/gameMachine.ts` — Phase 9 added GameMode, SET_MODE; this phase adds TIME_UP
- `src/ui/screens/HUD.tsx` — existing score display, add timer
- `src/ui/UIBridge.tsx` — Preact mount; HUD timer re-render driven from here OR setInterval
- `src/main.ts` — roundStarted handler (timer reset hook), loop.add registration, actor.subscribe
- `src/storage/StorageManager.ts` — Phase 9 already has `pushLeaderboard(mode, entry)` for time-attack scores

### External docs
- xstate v5 `after` (timer-driven transition): existing pattern in `dying` state
- Preact `useEffect` setInterval cleanup: standard pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- System class with `step(dt)`: PhysicsSystem.ts is the simplest reference (~50 lines). TimerSystem mirrors that shape.
- State-gated step: `if (this.actor.getSnapshot().value !== 'playing') return` — pattern from CollisionSystem
- `actor.on('roundStarted')` reset hook in main.ts: extend for `timer.reset()`
- Mode-aware reads: `actor.getSnapshot().context.mode` (Phase 9 added this)

### Integration points
- main.ts `loop.add(timer)` (or `loop.add({step:(dt)=>timer.step(dt)})`)
- main.ts `actor.on('roundStarted', ...)` — add `timer.reset()` call
- main.ts gameOver leaderboard push — already mode-aware (Phase 9), no change needed
- HUD.tsx — render `<TimerDisplay>` conditionally on `mode==='timeAttack'`

### Files unchanged in Phase 10
- src/audio/, src/anim/, src/particles/, src/render/, src/entities/ (no game-loop changes beyond TimerSystem)
- vite.config.ts, package.json (no new deps)
- All Phase 6/7/8 visual code

</code_context>

<deferred>
## Deferred Ideas

- **Time bonuses on scoring** — adding +1s per pipe scored makes time-attack a different game; deferred to v1.3+ if pursued
- **Best-time-to-score-N tracking** — different metric (time to reach score N) — deferred
- **Variable time-attack durations (30s, 90s, 120s)** — out of scope; 60s is the canonical seed
- **Time-attack-specific difficulty curve** — uses existing curve; tune separately if needed

</deferred>

---

*Phase: 10-time-attack-mode*
*Context gathered: 2026-05-01*
