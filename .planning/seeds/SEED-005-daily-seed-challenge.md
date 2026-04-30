---
id: SEED-005
status: consumed-in-v1.2
planted: 2026-04-29
planted_during: v1.1 Beauty Pass (post-Phase 8)
trigger_when: "modes / variants milestone OR daily-engagement / habit-loop milestone"
scope: medium
---

# SEED-005: Daily-seed challenge mode

## Why This Matters

Same hook as Wordle / NYT mini games: a deterministic obstacle layout that's the same for every player on a given day, and you compare scores. Creates a single shared reason to come back daily.

Mechanics:
- Today's date → seed via simple hash → seeded RNG drives obstacle gap positions and scroll cadence
- Players see the same pipe sequence (no per-player variation)
- Single attempt per day OR best-of-N attempts (design choice)
- Leaderboard entry tagged by date

This pairs well with SEED-004 (time-attack) — combine into one v1.2 "Modes" milestone.

## When to Surface

**Trigger:** any milestone scoping:
- "modes", "variants", "content drop"
- "daily engagement", "habit loop", "social hooks"
- "leaderboard expansion"
- "v2 features"

## Scope Estimate

**Medium** — likely 1 phase, builds on SEED-004 if both are in same milestone:
- Replace `Math.random()` in ObstacleSpawner with seeded RNG (e.g., mulberry32 inline ~10 LOC)
- Date → seed function: `parseInt(YYYYMMDD, 10) % 2^32`
- TitleScreen mode picker adds "Daily" option
- Daily attempt tracking in StorageManager (date-keyed)
- Optional: shareable result (e.g., "Daily 2026-04-29: 23 🐦" copy-to-clipboard)

## Breadcrumbs

- `src/systems/ObstacleSpawner.ts:35` — `Math.random()` calls; would route through a seeded RNG
- `src/systems/Difficulty.ts` — currently score-driven; daily mode could keep this OR override with fixed difficulty
- `src/storage/StorageManager.ts` — v3 schema with daily attempt tracking
- `src/machine/gameMachine.ts` — mode context (shared with SEED-004 if combined)
- PROJECT.md "Out of Scope" — daily-seed explicitly listed

## Notes

- Don't store date in player's local timezone if you ever go multiplayer — use UTC. For solo offline, local timezone is fine (and feels more natural).
- Resist the urge to add a "challenge friends" feature here — that's a global-leaderboard scope creep. Daily-seed solo is the v1.2 commitment; social is v2.
- This seed and SEED-004 should ship together as a "Modes" milestone, not separately.
