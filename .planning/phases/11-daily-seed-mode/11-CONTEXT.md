# Phase 11: Daily-Seed Mode - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Milestone:** v1.2 — Modes (final phase)

<domain>
## Phase Boundary

Add the daily-seed playable mode. After Phase 11, selecting Daily on Title produces a deterministic obstacle layout based on today's UTC date — every player sees the same pipes for that day. Daily attempts tracked. Optional Share button on GameOver copies a result string to clipboard.

In scope:
- Seeded RNG (mulberry32, ~10 LOC inline) replaces `Math.random()` in `ObstacleSpawner` when mode === 'daily'
- Seed derived from UTC date: `seed = parseInt('YYYYMMDD') % 0xFFFFFFFF`
- RNG resets to today's seed on `roundStarted` so each daily play is identical
- StorageManager: `dailyAttempts: { [YYYY-MM-DD]: { count, best } }` populate methods
- Title shows "Today's best: N (M attempts)" when daily mode is selected
- GameOver share button: copies "Daily YYYY-MM-DD: <score> 🐦" via `navigator.clipboard.writeText`

Out of scope:
- Per-day leaderboard separate from `leaderboardByMode.daily` (the existing per-mode array suffices)
- Streak tracking ("3 days in a row")
- Friend comparison / cloud sync
- Single-attempt-per-day enforcement (allow unlimited attempts; track count for "today's PB" UX)

</domain>

<decisions>
## Implementation Decisions

### mulberry32 RNG (MODE-07)
- **D-01:** Add a tiny RNG utility at `src/systems/Difficulty.ts` OR new `src/utils/rng.ts`. Prefer new file for separation. ~10 LOC implementation:
  ```ts
  export function mulberry32(seed: number): () => number {
    let s = seed
    return () => {
      s = (s + 0x6D2B79F5) | 0
      let t = Math.imul(s ^ (s >>> 15), 1 | s)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  ```
- **D-02:** Seed function: `dailySeed()` returns `parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10) % 0xFFFFFFFF`. Pure function, easy to test.
- **D-03:** Date format for storage key: `YYYY-MM-DD` (UTC). `new Date().toISOString().slice(0, 10)`.

### ObstacleSpawner integration
- **D-04:** ObstacleSpawner gets a private `rng: () => number` (defaults to `Math.random`). New method `setRng(rng: () => number)` to swap in the seeded one. Default `Math.random` for endless/timeAttack.
- **D-05:** main.ts on `roundStarted`: if `mode === 'daily'`, call `spawner.setRng(mulberry32(dailySeed()))`. Else call `spawner.setRng(Math.random)`. The reset is critical — each daily play must start from the same seed.
- **D-06:** ObstacleSpawner.step uses `this.rng()` instead of `Math.random()` for `gapCenterY`. ObstaclePair sizing/positioning is otherwise unchanged.

### Daily attempt tracking (MODE-08)
- **D-07:** StorageManager v3 already has `dailyAttempts: { [date]: { count, best } }` placeholder (Phase 9 D-05). Now populate it.
- **D-08:** New methods:
  - `getDailyAttempt(date: string): { count: number, best: number } | null` — null if no attempts today
  - `recordDailyAttempt(date: string, score: number): void` — increments count, updates best if higher
- **D-09:** Wire in main.ts gameOver branch: when `mode === 'daily'`, call `storage.recordDailyAttempt(todayDate, score)` AFTER the existing `pushLeaderboard(mode, entry)` call.
- **D-10:** Today's date for record/lookup: `new Date().toISOString().slice(0, 10)` (UTC).
- **D-11:** TitleScreen when `mode === 'daily'`: read `storage.getDailyAttempt(today)` and render `"Today's best: <best> (<count> attempts)"` above the leaderboard. If null, render "First attempt today" or similar.

### Share button (MODE-09)
- **D-12:** GameOverScreen when `mode === 'daily'`: render a "Share" button alongside Restart and Back-to-Title.
- **D-13:** On click: `navigator.clipboard.writeText(\`Daily ${date}: ${score} 🐦\`)`. Wrap in try/catch and feature-detect (`if (navigator.clipboard)`). On success: brief visual feedback (e.g., button text changes to "Copied!" for 2s). On failure: silent no-op (older browsers).
- **D-14:** Optional polish: include game URL in clipboard text. Skip — keep the share string short.

### Cross-cutting
- **D-15:** Bundle target ≤250KB; current ~190KB. Estimated +1-2KB.
- **D-16:** No new dependencies. mulberry32 is inline.
- **D-17:** Endless and Time-Attack modes unaffected. ObstacleSpawner.rng defaults to `Math.random`.
- **D-18:** Daily mode uses 60s timer? No — daily is open-ended, ends on death like endless. Time-attack timer should NOT fire in daily mode (TimerSystem.step gates on `mode === 'timeAttack'` per Phase 10 D-02).

### Claude's Discretion
- RNG utility location: `src/utils/rng.ts` (new) vs inline somewhere
- Share button UX after copy (toast vs button text change)
- TitleScreen "Today's best" exact text format
- Whether to surface today's date on Title screen (cosmetic — probably yes for context)

</decisions>

<specifics>
## Specific Ideas

- **Seed determinism test:** open the deployed site on two devices on the same UTC date — pipe layouts should match exactly. The simplest cross-device proof.
- **Share text format:** `Daily 2026-05-02: 23 🐦` — short enough to fit in a tweet/Slack message. The bird emoji is fun branding.
- **Dailies as habit:** the value of daily-seed isn't difficulty — it's "did you beat your friend's score on today's puzzle?" The UI should make today's attempt count + best visible to support that loop.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 11: Daily-Seed Mode" — Goal + 4 SC
- `.planning/REQUIREMENTS.md` §MODE — MODE-07, MODE-08, MODE-09 acceptance criteria
- `.planning/seeds/SEED-005-daily-seed-challenge.md` — original seed (consumed)
- `CLAUDE.md` — locked decisions

### Existing code Phase 11 builds on
- `src/systems/ObstacleSpawner.ts` — replace `Math.random` for gap position; add `setRng()` method
- `src/storage/StorageManager.ts` — populate `dailyAttempts` (placeholder from Phase 9); add `getDailyAttempt`, `recordDailyAttempt` methods
- `src/main.ts` — set RNG on roundStarted based on mode; record daily attempt on gameOver
- `src/ui/screens/TitleScreen.tsx` — show "Today's best: N (M attempts)" when daily mode selected
- `src/ui/screens/GameOverScreen.tsx` — add Share button when daily mode

### External docs
- `navigator.clipboard.writeText`: standard Web API; gracefully no-op on unsupported browsers
- mulberry32: well-known small PRNG, ~10 LOC, deterministic given a seed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- ObstacleSpawner.step already uses `Math.random()` for gapCenterY — single line to swap to RNG
- StorageManager v3 schema already has `dailyAttempts: {}` placeholder (Phase 9)
- gameOver branch in main.ts (Phase 9) already pushes mode-aware leaderboard — extend with daily attempt record
- Mode-conditional UI rendering pattern from Phase 10 (HUD timer): `if (mode === 'timeAttack')` — mirror for daily

### Integration points
- main.ts roundStarted hook: add mode-based RNG selection
- main.ts gameOver branch (around line 250): add daily attempt record after leaderboard push
- TitleScreen above leaderboard (where ModePicker is): add today's-best line when daily mode
- GameOverScreen btn-row: add Share button when daily mode

### Files unchanged in Phase 11
- src/audio/, src/anim/, src/particles/, src/render/, src/entities/ (no game-loop changes)
- gameMachine (no new events; SET_MODE already covers mode switching)
- vite.config.ts, package.json (no new deps)
- All Phase 6/7/8/9/10 features

</code_context>

<deferred>
## Deferred Ideas

- **Streak tracking** ("3 days in a row") — out of scope; would require daily lookup history
- **Daily-mode-specific difficulty curve** — uses existing curve; tune separately if needed
- **Single-attempt-per-day** — allow unlimited attempts; users can self-impose
- **Cloud daily-leaderboard** — explicit Out-of-Scope per PROJECT.md (local-only)
- **Multi-day calendar of past daily-best scores** — UI polish for v1.3+ if pursued

</deferred>

---

*Phase: 11-daily-seed-mode*
*Context gathered: 2026-05-02*
