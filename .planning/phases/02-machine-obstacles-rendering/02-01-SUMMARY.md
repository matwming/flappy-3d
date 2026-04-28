# Plan 02-01: XState Machine + StorageManager + Actor Wiring — Summary

**Plan:** 02-01 (Wave 1 of Phase 2)
**Completed:** 2026-04-28
**Atomic commits:** 3
**Status:** ✓ Done; tsc clean

---

## Files Created (2)

| File | Provides |
|------|----------|
| `src/machine/gameMachine.ts` | XState v5 machine — flat 5 states (title/playing/paused/dying/gameOver), 8 events (START/FLAP/PAUSE/RESUME/HIT/RESTART/SCORE/TICK); zero `from 'three'` imports; `scheduleAutoRestart` helper |
| `src/storage/StorageManager.ts` | Versioned localStorage wrapper — `getBestScore()` / `setBestScore()` / migration scaffolding; key `'flappy-3d:v1'`; `schemaVersion: 1` |

## Files Modified (2)

| File | Change |
|------|--------|
| `src/constants.ts` | Extended with Phase 2 tunables (BIRD_X, OBSTACLE_SPAWN_X/DESPAWN_X, BASE_/MIN_/MAX_ difficulty constants, POOL_SIZE, BLOOM/VIGNETTE params) |
| `src/main.ts` | Bootstrap reads bestScore from storage → creates actor with `input.bestScore` → wires `input.onFlap` to dispatch START (in title state) or FLAP + physics impulse (in playing state) → starts actor before loop → debug subscribe logs state transitions → `scheduleAutoRestart` for game-over loop |

## Dependencies Added

- `xstate@5.20.1` (production dep) — 4.6KB gzipped per research/STACK.md

## State Machine Topology

```
title --START--> playing --HIT--> dying --(800ms timer)--> gameOver --RESTART--> playing
                  ↑
                  └ FLAP (only in playing, fires assign{} for context bookkeeping)
                  └ SCORE (only in playing, increments context.score)
                  └ PAUSE (--> paused)

paused --RESUME--> playing
gameOver --(1500ms auto-RESTART via scheduleAutoRestart helper)--> playing
```

Storage write happens on `gameOver` entry: `if (ctx.score > ctx.bestScore) storage.setBestScore(ctx.score)`.

## Public Contracts (for Plan 02-02 + 02-03)

```typescript
// gameMachine.ts (3-free)
export const gameMachine = setup({ ... }).createMachine({ ... })
export function scheduleAutoRestart(actor: Actor<typeof gameMachine>): void

// StorageManager.ts
export class StorageManager {
  getBestScore(): number             // returns 0 if no save / invalid schema
  setBestScore(score: number): void  // writes only if score > current
}

// Actor type pattern for systems (Plan 02-02 will use):
import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
type GameActor = Actor<typeof gameMachine>
```

## Verification (all pass)

```bash
grep -c "from 'three'" src/machine/gameMachine.ts          # 0 (D-01 machine purity)
npx tsc --noEmit                                            # exits 0
grep -n "schemaVersion: 1" src/storage/StorageManager.ts    # match
```

## Hand-off Notes for Plan 02-02

1. **Constructor injection**: `PhysicsSystem` and `CollisionSystem` need `actor: GameActor` added to constructors. `main.ts` already imports them — Plan 02-02 will modify their constructors AND update main.ts to pass actor in.
2. **Death stub replacement**: Phase 1's `CollisionSystem.die()` calls `console.warn` + `loop.stop()`. Plan 02-02 replaces with `actor.send({ type: 'HIT' })`. Plus the static test obstacle (Box at 2,0,0) is removed — collision now reads from `pool.forEachActive`.
3. **Actor guard**: Always check `actor.getSnapshot().status === 'active'` before `actor.send()` (Pitfall #8 — stopped actor sends throw warnings).
4. **State-gated systems**: Each system reads `actor.getSnapshot().value` and skips work if state ≠ expected.

## Hand-off Notes for Plan 02-03

1. The `<temporary>` `console.log('[machine]', ...)` debug subscribe in main.ts can stay through Phase 2 — useful for verifying state machine wiring. Phase 3 HUD will replace it.
2. The `scheduleAutoRestart(actor)` call in main.ts is a Phase 2 stub (1500ms auto-RESTART after gameOver). Phase 3 HUD-05 (game-over screen) replaces it with manual restart-on-tap.

## Git Commits (Plan 02-01 segment)

```
3c5d6dc feat(02-01-3): XState game machine + actor wiring in main.ts
bbcd80a feat(02-01-2): StorageManager versioned localStorage wrapper
a5c7ad6 feat(02-01-1): install XState v5.20.1 and add Phase 2 constants
```

## REQs Closed (4 of 11 in Phase 2)

| REQ | Status | Where |
|-----|--------|-------|
| CORE-07 | ✓ | `gameMachine.ts` flat 5-state machine; transitions through full cycle |
| CORE-08 | ✓ | `RESTART` event resets context.score to 0 → playing — no page reload |
| SAVE-01 | ✓ | `StorageManager` versioned schema (v1) with migration scaffolding |
| SAVE-02 | ✓ | `bestScore` read at boot, passed to actor via `input.bestScore`; written on gameOver entry |

## REQs Remaining in Phase 2

- **Plan 02-02:** CORE-05 (scoring), CORE-06 (difficulty ramp), PERF-04 (object pool)
- **Plan 02-03:** VIS-01 (toon material), VIS-03 (postprocessing), VIS-04 (mobile gate), VIS-07 (parallax bg)
