# Phase 15 Summary — Camera Depth (opt-in)

**Status:** Code-complete 2026-05-02
**Milestone:** v1.4 Polish (final phase)

## What shipped

Single plan, single commit:

- **15-01** (`feat(15-01): opt-in camera y-bob following bird velocity (POLISH-03)`) — adds opt-in camera y-bob.

## Files touched

| File | Change |
|---|---|
| `src/storage/StorageManager.ts` | `SettingsV3.cameraBob: boolean` + `cameraBob: false` in `DEFAULT_SETTINGS_V3` |
| `src/ui/screens/SettingsModal.tsx` | New "Camera bob" Toggle row + motion-warning settings-note; widened `useState`/`update` types from `SettingsV2` to `SettingsV3` |
| `src/main.ts` | New per-frame `loop.add({ step })` running `playing`/`dying`-only; eases `camera.position.y` toward `bird.velocity.y * 0.05` with lerp 0.08 when both gates open; snaps to `CAMERA_BASE_Y` when either gate closes; resets `camera.position.y` on `roundStarted` |

## Behaviour

- Default OFF — zero behavioural change for users who don't enable the toggle.
- Double-gated:
  1. `storage.getSettings().cameraBob` must be `true`
  2. AND `prefersReducedMotion(storage)` must be `false`
- When either gate is closed, the camera snaps back to `y = 0` (the original `createRenderer` resting position).
- Camera y-offset is purely visual — no impact on physics, collision, scrolling, or scoring.
- Resets on every `roundStarted` (no offset bleed across restarts).

## Tuning

- `CAMERA_BOB_FACTOR = 0.05` — bird velocity of `±8 m/s` produces `±0.4` units offset.
- `CAMERA_BOB_LERP = 0.08` — smoothing factor; lower = more lag, higher = more snappy.
- `CAMERA_BASE_Y = 0` — mirrors `createRenderer`'s `camera.position.set(0, 0, 8)`.

## Bundle

| Phase | Gzip | Δ |
|---|---|---|
| Phase 14 | 199.25 KB | — |
| Phase 15 | **199.43 KB** | +0.18 KB |

Budget: ≤250 KB. Headroom: ~50 KB.

## Tests / verification

- `npx tsc --noEmit` → clean (exit 0).
- `npm run build` → 199.43 KB gzip, no warnings.
- Manual UAT pending: device test on iPhone 12 / Pixel 6 to confirm motion comfort with toggle ON, and to confirm motion-sensitive defaults are respected.

## Requirements closed

- **POLISH-03** ✓ (the final v1.4 acceptance criterion).

## Seed status

- **SEED-003** (3D scene polish bundle) — fully consumed in v1.4 (rim light + wings in Phase 14, camera bob in Phase 15).
- **All 5 seeds** (SEED-001..005) now consumed across v1.2/v1.3/v1.4. Future milestones must come from fresh ideation, not seeds.

## v1.4 milestone status

**CODE-COMPLETE.** All 15 phases of the v1 → v1.4 arc shipped. Tag `v1.4.0` pending UAT confirmation.
