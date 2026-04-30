# Phase 9: Mode Infrastructure - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Milestone:** v1.2 — Modes (first phase)

<domain>
## Phase Boundary

Lay the rails for multi-mode play. After Phase 9, the game supports a `mode` context (`'endless' | 'timeAttack' | 'daily'`), Title shows a mode picker, and per-mode leaderboards persist via StorageManager v3 (with safe migration from v2). NO new playable modes yet — just the foundation that Phases 10 and 11 build on.

In scope:
- Extend `gameMachine` with `mode` field in context, `SET_MODE` event
- StorageManager v3 schema with `leaderboardByMode: { endless, timeAttack, daily }`
- Migration from v2 → v3 (preserves existing endless leaderboard)
- Title screen mode picker UI (3-option selector)
- Persist last-selected mode in StorageManager settings
- Plumbing: gameOver-on-death pushes score to the correct mode's leaderboard

Out of scope:
- Time-attack mechanics (Phase 10)
- Daily-seed mechanics (Phase 11)
- New game-mode-specific UI beyond the picker
- Mode-specific difficulty curves (current difficultyFrom uses score; modes can specialize later if needed)

</domain>

<decisions>
## Implementation Decisions

### gameMachine.context.mode (MODE-01)
- **D-01:** Add `mode: 'endless' | 'timeAttack' | 'daily'` to GameContext, default `'endless'`
- **D-02:** New event `{ type: 'SET_MODE'; mode: GameMode }` accepted in `title` state only — switching mode mid-round is not allowed (prevents leaderboard contamination); GameOverScreen "Back to Title" resets to title where mode can be re-picked
- **D-03:** SET_MODE in title state: `assign({ mode: ({ event }) => event.mode })`. No transition (stay in title).
- **D-04:** `mode` persists across rounds within a session (does NOT reset on roundStarted). Reset to `'endless'` only on app start (default in context init), with override from StorageManager settings (last-selected mode).

### StorageManager v3 schema (MODE-02)
- **D-05:** v3 schema:
  ```ts
  type SettingsV3 = SettingsV2 & { lastMode: 'endless' | 'timeAttack' | 'daily' }
  type StateV3 = {
    version: 3
    settings: SettingsV3
    leaderboardByMode: { endless: LeaderboardEntry[], timeAttack: LeaderboardEntry[], daily: LeaderboardEntry[] }
    bestScore: number  // legacy field — kept for endless compatibility; use leaderboardByMode.endless[0]?.score going forward
    dailyAttempts: { [date: string]: { count: number; best: number } }  // populated in Phase 11
  }
  ```
- **D-06:** Migration v2 → v3: existing `leaderboard` → `leaderboardByMode.endless`; existing `settings` spread into v3 settings + add `lastMode: 'endless'`. Migration is idempotent: reading a v3 save returns it unchanged.
- **D-07:** Migration is read-only-then-write: `getState()` detects v2, transforms in memory, returns v3 shape. Persistence happens on the next write (any setSetting / pushLeaderboard / etc). NO destructive auto-save on first read — preserves user's v2 file until explicit write.
- **D-08:** New StorageManager methods:
  - `getLeaderboard(mode: GameMode): LeaderboardEntry[]` — replaces existing `getLeaderboard()`; old call signature kept as deprecated alias defaulting to `'endless'`
  - `pushLeaderboard(mode: GameMode, entry: LeaderboardEntry): void` — same naming pattern
  - `getLastMode(): GameMode` and `setLastMode(mode: GameMode): void`
- **D-09:** Backward-compat: existing call sites (UIBridge, GameOverScreen, TitleScreen) using `getLeaderboard()` work with deprecated alias. Phase 9 plan should refactor them to pass mode explicitly OR add a `getCurrentLeaderboard()` helper that derives mode from actor.

### Title mode picker UI (MODE-03)
- **D-10:** New component `<ModePicker>` rendered above the existing leaderboard on TitleScreen. 3 segmented buttons: Endless / Time-Attack / Daily. Selected mode visually highlighted (e.g., bg color shift + underline).
- **D-11:** Tap a mode button → `actor.send({ type: 'SET_MODE', mode })` AND `storage.setLastMode(mode)`. UIBridge re-reads leaderboard for the new mode and updates the displayed list.
- **D-12:** On TitleScreen mount, read `storage.getLastMode()` and pre-select that button. Defaults to 'endless' on first run.
- **D-13:** Touch-target ≥44×44px per BEAUTY-11 standard. Buttons inherit existing `linear-gradient` button styling.
- **D-14:** Disabled state: ALL three modes are always available — no unlock progression. Endless is the de facto default.

### gameOver leaderboard push routing
- **D-15:** main.ts actor.subscribe `gameOver` branch currently pushes score to the unified leaderboard. Update to read `actor.getSnapshot().context.mode` and push to that mode's list. Same call structure, mode-aware target.

### Cross-cutting
- **D-16:** Bundle target ≤250KB; current 196KB. Mode infra adds ~3-5KB (UI component + StorageManager methods + machine extension). Comfortable.
- **D-17:** No new dependencies.
- **D-18:** Phase 6/7/8 features unaffected. Endless mode behavior is the v1.1 baseline.

### Claude's Discretion
- Exact `<ModePicker>` visual design (segmented control vs 3 buttons in a row)
- Whether to expose `getLeaderboard()` as deprecated or break the old API now
- Migration error handling (what if v2 save is corrupt?)
- Whether to surface mode in the HUD during gameplay (probably not — phases 10/11 add timer/daily-attempts which fill that role)

</decisions>

<specifics>
## Specific Ideas

- **Mode picker visual reference:** segmented control like iOS Settings ("Endless | Time-Attack | Daily" with sliding highlight). Or simple 3 stacked buttons. Either is fine; segmented control is more visually compact for the Title screen real estate.
- **Migration test:** before Phase 9 ships, confirm a v2 save loads correctly into v3 — load with current player's existing data, see endless leaderboard populated, no crash.
- **Mode persistence:** persisting "lastMode" means a player who plays Daily yesterday opens to Daily today. UX win.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 9: Mode Infrastructure" — Goal + 4 SC
- `.planning/REQUIREMENTS.md` §MODE — MODE-01, MODE-02, MODE-03 acceptance criteria
- `.planning/seeds/SEED-004-time-attack-mode.md` — original seed with detailed rationale (consumed)
- `.planning/seeds/SEED-005-daily-seed-challenge.md` — original seed (consumed)
- `CLAUDE.md` — locked decisions (no new heavy deps, named imports, AbortController)

### Existing code Phase 9 builds on
- `src/machine/gameMachine.ts` — extend GameContext, GameEvent, title.on with SET_MODE
- `src/storage/StorageManager.ts` — v3 schema + migration + per-mode leaderboard methods
- `src/ui/screens/TitleScreen.tsx` — add ModePicker component
- `src/ui/UIBridge.tsx` — pass mode-aware leaderboard to TitleScreen
- `src/main.ts` — actor.subscribe gameOver branch for mode-aware leaderboard push
- `src/ui/components/Button.tsx` — base button used by mode picker
- `src/ui/styles.css` — gradient button styling already in place

### External docs
- xstate v5 `assign` with event payload: existing pattern in gameMachine
- localStorage versioned schemas: existing v1 → v2 migration in StorageManager (pattern to mirror)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- StorageManager v1 → v2 migration in StorageManager.ts (Phase 3) — pattern for v2 → v3
- Settings schema spread: `getSettings()` returns `{ ...DEFAULT_SETTINGS, ...saved.settings }` — apply same forward-compat pattern for v3
- Button component with gradient + 44×44px (Phase 8) — mode picker buttons inherit
- xstate assign with event: `assign({ field: ({ event }) => event.value })` — standard pattern

### Integration points
- main.ts actor.subscribe gameOver block — change `storage.pushLeaderboard(score)` to `storage.pushLeaderboard(actor.getSnapshot().context.mode, score)`
- TitleScreen.tsx — add `<ModePicker mode={mode} onModeChange={...} />` above leaderboard
- StorageManager.ts — add new methods, deprecate old single-arg getLeaderboard

### Files unchanged in Phase 9
- src/systems/* (no spawner/scroll/score changes)
- src/audio/, src/anim/, src/particles/, src/render/, src/entities/ (no game-loop changes)
- vite.config.ts, package.json (no new deps)
- All Phase 6/7/8 visual code

</code_context>

<deferred>
## Deferred Ideas

- **Mode-specific difficulty curves** — current `difficultyFrom(score)` is shared. If time-attack feels too easy in Phase 10, customize there.
- **Achievement system** — out of scope; would be its own milestone
- **Online leaderboard sync** — explicit Out-of-Scope per PROJECT.md (local-only)
- **Mode unlock progression** — all modes available from start; no gating

</deferred>

---

*Phase: 09-mode-infrastructure*
*Context gathered: 2026-05-01*
