---
id: SEED-004
status: consumed-in-v1.2
planted: 2026-04-29
planted_during: v1.1 Beauty Pass (post-Phase 8)
trigger_when: "modes / variants / replayability milestone OR when player retention becomes a metric"
scope: medium
---

# SEED-004: Time-attack mode

## Why This Matters

PROJECT.md "Out of Scope" section explicitly defers time-attack as a v1 omission ("endless only for v1; can add post-launch as a content drop"). It's the lightest-weight content addition that creates a different play experience without new mechanics:
- 60-second countdown timer
- Score as much as possible
- Same physics/obstacles/collision as endless
- Separate leaderboard (top-5 time-attack runs)

Why it's worth a seed instead of just "doing it later": (a) it requires extending `gameMachine` with a new state path (state machine has `playing`/`paused`/`dying`/`gameOver`; time-attack might be `playing` with a timer or a new state), (b) leaderboard schema needs a new compartment (StorageManager v3 migration), and (c) Settings/Title needs a mode picker. Not trivial wiring, but mechanically simple.

## When to Surface

**Trigger:** any milestone scoping:
- "modes", "variants", "content drop", "replayability"
- "v2 features", "post-launch content"
- "leaderboard expansion", "time-based scoring"

## Scope Estimate

**Medium** — likely 1 phase:
- Add `'timeAttack'` mode to gameMachine (or as a context flag on `playing` state — pick at planning time)
- Timer system: HUD displays countdown; on 0, transition to gameOver
- StorageManager v3 schema migration: separate `leaderboardEndless` and `leaderboardTimeAttack` arrays
- TitleScreen: mode picker (toggle or 2-button layout)
- GameOverScreen: shows mode-appropriate "best" comparison

## Breadcrumbs

- `src/machine/gameMachine.ts` — extend states or add context.mode field
- `src/storage/StorageManager.ts` — v3 migration; preserve v2 saves
- `src/ui/screens/TitleScreen.tsx` — mode picker UI
- `src/ui/screens/HUD.tsx` — timer display alongside score
- `src/ui/screens/GameOverScreen.tsx` — mode-aware leaderboard
- `.planning/PROJECT.md` Out-of-Scope section — explicit v1 deferral with reason

## Notes

- Don't ship time-attack without daily-seed (SEED-005 if you plant it) and hardcore mode together — content drops feel thin if they're trickled out one at a time.
- 60s is the canonical time-attack duration. 30s and 90s are also options; 60s is the most-tested.
- Time-attack with motion-reduce should still work (timer is informational, not animated).
