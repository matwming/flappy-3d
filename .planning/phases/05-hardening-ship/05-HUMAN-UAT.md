---
status: partial
phase: 05-hardening-ship
source: [05-VERIFICATION.md, 04-HUMAN-UAT.md]
started: 2026-04-29T16:00:00Z
updated: 2026-04-29T16:46:00Z
---

## Current Test

[awaiting human verification — all gates are runtime / real-device]

## Tests

### 1. SC-1 — Memory stability across 10 restart cycles (PERF-05)
expected: After 10 consecutive death+restart cycles, `renderer.info.memory.geometries` and `.textures` plateau (do not grow). The DEV-only memory probe in `src/main.ts` logs `[mem probe] round=N geometries=X textures=Y` on each restart.
how_to_test: Run `npm run dev`, open browser console, play 10 deaths in a row (let bird fall to floor each time → tap Restart). Observe console — both counters should stabilize within first 2-3 rounds and stay there. Probe also auto-warns if geometries grow by >5 after round 3.
result: [pending]

### 2. SC-2 — iOS Safari audio with ringer states (AUD-* + iOS unlock)
expected: On real iOS 16+ device, audio plays after first tap. `Howler.ctx.state === 'running'` after pointerup. Silent switch ON behavior matches the SettingsModal note ("iOS silences sound when the silent switch is on").
how_to_test:
1. Open https://matwming.github.io/flappy-3d/ in Safari on iPhone (iOS 16+)
2. Tap to start — flap/score/death sounds audible
3. Connect to Mac → Safari Web Inspector → console: `Howler.ctx.state` returns `"running"`
4. Toggle silent switch ON, tap to play another round — confirm audio is silenced (expected iOS behavior; documented in Settings note)
5. Settings modal: confirm "On iOS, the silent switch mutes all app audio." is visible under Music toggle
result: [pending]

### 3. SC-3 — Tab-blur pause/resume
expected: Switching tab mid-play sends PAUSE event (visibilitychange listener wired in Phase 3). Music stops. Game state is `paused`. Returning to tab + tapping RESUME continues the round with score preserved.
how_to_test:
1. Start a round, score a few points
2. Switch to another browser tab → game music stops, state shows paused screen on return
3. Switch back to game tab → Pause screen visible
4. Tap RESUME → music resumes, gameplay continues, score preserved (not reset)
result: [pending]

### 4. SC-4 — No stopped-actor warnings + listener count stable
expected: After 20 play cycles, console has zero "Event sent to stopped actor" warnings. After 10 restart cycles, `getEventListeners(document)` count in Chrome DevTools is the same as immediately after page load (no accumulation).
how_to_test:
1. `npm run dev`, open Chrome DevTools console
2. After page load, run: `_initial = getEventListeners(document); console.log(Object.keys(_initial).map(k => k + ':' + _initial[k].length))`
3. Play 20 death+restart cycles, observing console for any warning matching "stopped actor"
4. After 10 cycles, run the same getEventListeners query — listener counts per event type should match `_initial`
result: [pending]

### 5. PERF-03 — Sustained 60fps on iPhone 12 / Pixel 6 (carry-forward from Phase 4)
expected: Sustained ≥58fps during normal play (flapping, scoring, dying, restarting) on real iPhone 12 or Pixel 6. No drops below 55fps.
how_to_test:
1. Connect device via USB, Chrome DevTools → Remote Devices → inspect deployed Pages URL
2. Performance tab → enable FPS meter (Cmd+Shift+P → "Show frames per second meter")
3. Play a full round to score ≥ 20 (at least 30s of gameplay)
4. Observe FPS meter — should stay ≥ 58 sustained
result: [pending]

### 6. VIS-07 — Parallax background on device
expected: Mountain layer scrolls at 1× speed, tree layer faster (foreground), sky stationary. No visible jitter at the x=-20 wrap point. Looks smooth on real device.
how_to_test: Play a round on the live deploy on real iPhone/Android. Watch the background while obstacles scroll. Layers should move at distinct speeds (parallax depth illusion).
result: [pending]

### 7. v1.0.0 ship tag
expected: After items 1-6 all pass, ship the tag.
how_to_test: This is YOUR deliberate ship action — no automation.
```bash
cd /Users/ming/projects/flappy-3d
git tag -a v1.0.0 -m "v1.0.0 — Flappy 3D initial release"
git push origin v1.0.0
```
Rollback (if needed before tag is pushed): `git tag -d v1.0.0`
Rollback after push: `git push --delete origin v1.0.0` then re-tag.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

(none — all 7 items are runtime/device-required, by design; not failures)
