# Phase 2: Game Machine + Obstacles + Rendering — Summary

**Completed:** 2026-04-29
**Plans:** 3 (all complete)
**Atomic feat commits:** 6

---

## What Was Built

The game is now a complete playable Flappy Bird loop driven by an XState v5 state machine. Title screen waits for tap → playing state spawns pipe pairs from a pre-warmed `ObjectPool`, scrolls them right-to-left, increments score on midpoint pass, and ramps difficulty smoothly to plateau at score 40 → on collision, transitions to dying (800ms with bird rotation) → gameOver (auto-restarts after 1500ms in Phase 2; Phase 3 replaces with manual screen). Pipes and bird use cel-shaded `MeshToonMaterial` with a shared 5-band gradient ramp. On desktop, an `EffectComposer` chain (RenderPass → UnrealBloomPass → VignetteShader → OutputPass) elevates the visuals; on mobile (`hardwareConcurrency <= 4` OR mobile UA) post-processing is skipped for perf. A 3-layer procedural parallax background — sky gradient ShaderMaterial plane, mountain silhouettes, tree silhouettes — scrolls at differential speeds. Personal best persists across sessions via `StorageManager` (versioned localStorage schema v1).

## Files Created (11 new) + Modified (5)

### Created
| File | Provides |
|------|----------|
| `src/machine/gameMachine.ts` | XState v5 machine — flat 5 states (title/playing/paused/dying/gameOver), 8 events; zero `from 'three'` |
| `src/storage/StorageManager.ts` | Versioned localStorage wrapper; `getBestScore()` / `setBestScore()` |
| `src/pools/ObjectPool.ts` | Generic `ObjectPool<T>` — `acquire/release/forEachActive` |
| `src/entities/ObstaclePair.ts` | Group + 2 Meshes (top/bottom pipe); shared geometry+material; `passed` flag |
| `src/entities/Background.ts` | 3-layer parallax — sky ShaderMaterial, mountain BufferGeometry, cone+cylinder trees |
| `src/systems/Difficulty.ts` | Pure `difficultyFrom(score)` — linear lerp with plateau at 40 |
| `src/systems/ObstacleSpawner.ts` | Time-based spawn via pool + difficulty |
| `src/systems/ScrollSystem.ts` | Scrolls active pairs + drives background parallax |
| `src/systems/ScoreSystem.ts` | `passed`-flag dedup → `actor.send({type:'SCORE'})` |
| `src/render/toonMaterial.ts` | `createToonGradient()` (5-band DataTexture, NearestFilter) + `createToonMaterial()` |
| `src/render/createComposer.ts` | `EffectComposer` factory; mobile gate returns null |

### Modified
| File | Change |
|------|--------|
| `src/main.ts` | Full Phase 2 orchestration — actor + 5 systems + pool + toon + composer + background + scheduleAutoRestart |
| `src/constants.ts` | Extended with Phase 2 tunables (BIRD_X, OBSTACLE_*, BASE_/MIN_/MAX_ difficulty, POOL_SIZE, BLOOM/VIGNETTE) |
| `src/entities/Bird.ts` | Mesh material widened from `MeshStandardMaterial` to `Material` for toon swap |
| `src/loop/GameLoop.ts` | Added `setRenderFn(fn)` — `tick()` now calls `renderFn()` (default direct render) |
| `src/systems/PhysicsSystem.ts` | Actor injected; dying-state rotates `bird.mesh.rotation.z`; physics gated to playing/dying |
| `src/systems/CollisionSystem.ts` | `actor.send({type:'HIT'})` replaces `console.warn` + `loop.stop()`; reads pool, not static obstacle |

## Dependencies Added

- `xstate@5.20.1` (production dep) — 4.6KB gzipped

## State Machine

```
title --START--> playing --HIT--> dying --(800ms)--> gameOver --RESTART--> playing
                  ↑                                              ↑
                  ├ FLAP (in playing)                            └ scheduleAutoRestart (1500ms)
                  ├ SCORE (in playing → context.score += 1)
                  └ PAUSE → paused --RESUME--> playing
```

Storage write on `gameOver` entry: `if (ctx.score > ctx.bestScore) storage.setBestScore(ctx.score)`.

## Tuning Numbers (constants.ts)

| Constant | Value | Purpose |
|---|---|---|
| `BIRD_X` | 0 | Bird stays at world x=0 (fixed camera) |
| `OBSTACLE_SPAWN_X` / `OBSTACLE_DESPAWN_X` | +6 / -6 | Pipe lifecycle bounds |
| `BASE_SPAWN_INTERVAL` → `MIN_SPAWN_INTERVAL` | 1.6s → 1.0s | Linear over score 0→40 |
| `BASE_SCROLL_SPEED` → `MAX_SCROLL_SPEED` | 3.5 → 6.0 units/s | Linear over score 0→40 |
| `BASE_GAP_HEIGHT` → `MIN_GAP_HEIGHT` | 2.6 → 1.6 units | Linear over score 0→40 |
| `GAP_CENTER_RANGE` | 1.0 | Gap center random in [-1, +1] |
| `DIFFICULTY_SCORE_CAP` | 40 | Plateau threshold |
| `POOL_SIZE` | 8 | Pre-warmed ObstaclePair instances |
| `BLOOM_STRENGTH` / `RADIUS` / `THRESHOLD` | 0.7 / 0.6 / 0.85 | Cel-shaded bloom config |
| `VIGNETTE_OFFSET` / `DARKNESS` | 1.0 / 0.4 | Vignette config |

## Bundle Size

| Phase | Raw | Gzipped |
|---|---|---|
| Phase 1 (named imports baseline) | 510 KB | **128.6 KB** |
| Phase 2 (xstate + postprocessing + new systems) | 579 KB | **143.3 KB** |
| Δ Phase 2 | +69 KB raw / +14.7 KB gzip | |
| Budget (PERF-01, due Phase 4) | — | **<250 KB** |
| Headroom | — | ~107 KB |

## Verification (all pass)

```bash
npx tsc --noEmit                                                          # exits 0
npm run build                                                              # exits 0
grep -r "import \* as THREE" src/                                          # empty
grep -n "new Mesh\|new BoxGeometry\|new MeshToonMaterial" src/systems/*.ts  # empty
grep -c "from 'three'" src/machine/gameMachine.ts                          # 0
```

## REQs Closed (11 of 11)

| REQ | Status | Where |
|-----|--------|-------|
| CORE-05 | ✓ | `ScoreSystem` — pair.passed flag dedup, sends SCORE event |
| CORE-06 | ✓ | `Difficulty.difficultyFrom()` — linear ramp to plateau at 40 |
| CORE-07 | ✓ | `gameMachine.ts` — full state cycle |
| CORE-08 | ✓ | RESTART event resets context, transitions to playing — no page reload |
| VIS-01 | ✓ | `MeshToonMaterial` + `createToonGradient` (5-band DataTexture) on bird + pipes |
| VIS-03 | ✓ | `EffectComposer` chain (RenderPass → UnrealBloomPass → VignetteShader → OutputPass) |
| VIS-04 | ✓ | `createComposer` returns null on `hardwareConcurrency <= 4` OR mobile UA |
| VIS-07 | ✓ | `Background.ts` — sky gradient plane, 6 mountain peaks, 8 procedural trees with parallax |
| PERF-04 | ✓ | `ObjectPool` for obstacles; grep verifies no `new Mesh/Geometry/Material` in `*/systems/` `step()` |
| SAVE-01 | ✓ | `StorageManager` versioned schema v1 with migration scaffolding |
| SAVE-02 | ✓ | `bestScore` read at boot, passed to actor input; persisted on gameOver entry |

## Hand-Off Notes for Phase 3

1. **The `console.log` debug bridge in main.ts** (`actor.subscribe(...)`) should be replaced by Phase 3's `UIBridge.sync(snapshot)` that updates the DOM overlay layer.
2. **`scheduleAutoRestart(actor)` is a Phase 2 stub** — Phase 3 HUD-05 (game-over screen) replaces it with manual restart-on-tap.
3. **Bird's dying-rotation is currently a linear `rotation.z += 1.5 * dt`** in PhysicsSystem — Phase 3 ANIM-04 should upgrade to GSAP elastic ease.
4. **Collision death currently has no SFX or particles** — Phase 3 wires Howler death sound + three.quarks particle burst on the HIT event.
5. **Toon material gradient is fixed 5-band greyscale** — Phase 3 visual polish may want per-material gradient ramps for richer palette tinting.

## Git Commits (Phase 2 segment)

```
[02-03]                feat(02-03): toon materials + EffectComposer + parallax background + full main.ts wiring
[02-02-2]              feat(02-02-2): wire actor + pool into PhysicsSystem & CollisionSystem
[02-02-1]              feat(02-02-1): ObjectPool + ObstaclePair + obstacle/score/difficulty systems
[02-01-3] 3c5d6dc      feat(02-01-3): XState game machine + actor wiring in main.ts
[02-01-2] bbcd80a      feat(02-01-2): StorageManager versioned localStorage wrapper
[02-01-1] a5c7ad6      feat(02-01-1): install XState v5.20.1 and add Phase 2 constants
[plan-02] (4d5e3df)    docs(02): capture phase context — 32 decisions
[plan-02] (a5c7ad6+)   plan(02): machine + obstacles + rendering — 3 plans, 3 waves
```
