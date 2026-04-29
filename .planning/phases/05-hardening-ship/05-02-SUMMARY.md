---
phase: 05-hardening-ship
plan: 02
subsystem: audio
tags: [audio, cc0, assets, howler]
dependency_graph:
  requires: []
  provides: [real-sfx-flap, real-sfx-score, real-sfx-death, real-music-loop]
  affects: [AudioManager, WorkboxSW-precache]
tech_stack:
  added: [ffmpeg-conversion]
  patterns: [kenney-cc0-assets, opengameart-cc0-music]
key_files:
  created: []
  modified:
    - public/audio/flap.mp3
    - public/audio/score.mp3
    - public/audio/death.mp3
    - public/audio/music.mp3
    - public/audio/CREDITS.md
decisions:
  - "Used Kenney Interface Sounds (CC0) for SFX instead of Pixabay (Cloudflare-blocked)"
  - "Used Juhani Junkala Chiptune Adventures Stage 1 (CC0, OGG→MP3) for music loop"
  - "Music file is 329KB raw / 325KB gzip — exceeds 100KB gzip target but is a one-time SW-cached download"
  - "All OGG sources converted to MP3 at 64kbps using ffmpeg"
metrics:
  duration_seconds: 1480
  completed_date: "2026-04-29"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
requirements_closed:
  - AUD-02
---

# Phase 5 Plan 02: Real Audio Sourcing Summary

**One-liner:** Replaced 4 zero-byte placeholder MP3s with real CC0 SFX from kenney.nl and a CC0 chiptune loop from opengameart.org, converted via ffmpeg; AUD-02 closed.

---

## What Was Built

Replaced placeholder MP3s in `public/audio/` with 4 real CC0 audio samples:

| File | Source | Author | Size (raw) | Gzip |
|------|--------|--------|-----------|------|
| flap.mp3 | Kenney Interface Sounds `maximize_003.ogg` | Kenney | 2.3 KB | ~2 KB |
| score.mp3 | Kenney Interface Sounds `confirmation_001.ogg` | Kenney | 2.9 KB | ~3 KB |
| death.mp3 | Kenney Interface Sounds `error_001.ogg` | Kenney | 1.9 KB | ~2 KB |
| music.mp3 | Juhani Junkala Chiptune Adventures Stage 1 | Juhani Junkala | 329 KB | ~325 KB |

All files are CC0 (public domain). CREDITS.md updated with full source URLs, author, license, and bundle budget notes.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Source and download CC0 audio samples | 63987ab | flap.mp3, score.mp3, death.mp3, music.mp3 |
| 2 | Update CREDITS.md and verify bundle budget | 62994b0 | CREDITS.md |

---

## Sourcing Journey

**Pixabay:** Not attempted — was Cloudflare-blocked in Phase 3; instructions said skip to fallback.

**Freesound.org:** Preview URLs redirected to CDN but returned HTML instead of audio. Skipped.

**kenney.nl:** Direct static ZIP download succeeded — no bot detection. Downloaded:
- `kenney_interface-sounds.zip` (834 KB) — 100 SFX in OGG format, CC0
- Selected: `maximize_003.ogg` (flap), `confirmation_001.ogg` (score), `error_001.ogg` (death)

**OpenGameArt.org:** Direct OGG download succeeded. Downloaded:
- `Juhani Junkala [Chiptune Adventures] 1. Stage 1.ogg` (1.65 MB OGG → 329 KB MP3 at 64kbps)
- License: CC0 confirmed at https://opengameart.org/content/4-chiptunes-adventure

**Conversion:** All OGG → MP3 using `ffmpeg -codec:a libmp3lame -b:a 64k -ar 44100`.

---

## Deviations from Plan

None — plan executed exactly as written. The fallback sourcing strategy worked as documented.

---

## Bundle Budget Analysis

| File | Raw size | Gzip | Budget | Status |
|------|----------|------|--------|--------|
| flap.mp3 | 2.3 KB | ~2 KB | <10 KB | PASS |
| score.mp3 | 2.9 KB | ~3 KB | <10 KB | PASS |
| death.mp3 | 1.9 KB | ~2 KB | <10 KB | PASS |
| music.mp3 | 329 KB | ~325 KB | <100 KB | OVER — future optimization candidate |
| **JS bundle** | — | 188 KB | 250 KB | PASS (61 KB headroom) |

Music file exceeds the 100 KB gzip target from D-15. This is a one-time download cost served by Workbox CacheFirst strategy. The JS bundle check (`bash scripts/bundle-check.sh`) passes — audio files are not counted in the JS bundle budget. Per plan task 2 instructions: documented here, does not block plan.

To optimize music in future: trim to 15s loop (~179 KB) or reduce to 32 kbps (~165 KB).

---

## Verification Results

```
1. File sizes:
   flap.mp3:  2342 bytes  (> 1000 req)  PASS
   score.mp3: 2969 bytes  (> 1000 req)  PASS
   death.mp3: 1924 bytes  (> 1000 req)  PASS
   music.mp3: 329813 bytes (> 10000 req) PASS

2. File types: all "MPEG ADTS, layer III" valid MP3  PASS

3. CREDITS.md: 8 CC0/Pixabay/Freesound references   PASS (≥4 req)

4. No TODO rows in CREDITS.md                         PASS

5. tsc --noEmit: exit 0                               PASS

6. bundle-check.sh: 188.03 KB / 250 KB               PASS
```

---

## AudioManager Impact

With real MP3 files in place:
- `flapLoaded`, `scoreLoaded`, `deathLoaded` flags become `true` after Howler preload completes
- `playFlap()`, `playScore()`, `playDeath()` will use Howl instances instead of WebAudio oscillator synth fallback
- Music loop (`music.mp3`) plays via Howl with `loop: true`, volume 0.4
- Synth fallback (D-09) remains as defensive code but is no longer the active path

AUD-02 ("recorded samples, not synthesized oscillators") is formally closed.

---

## Known Stubs

None — all audio files are real samples with non-zero content.

---

## Threat Flags

None. All sources are CC0 (no license compliance risk). Audio files are served from `public/audio/` with no new network endpoints introduced.

---

## Self-Check: PASSED

- `/Users/ming/projects/flappy-3d/public/audio/flap.mp3`: FOUND (2342 bytes)
- `/Users/ming/projects/flappy-3d/public/audio/score.mp3`: FOUND (2969 bytes)
- `/Users/ming/projects/flappy-3d/public/audio/death.mp3`: FOUND (1924 bytes)
- `/Users/ming/projects/flappy-3d/public/audio/music.mp3`: FOUND (329813 bytes)
- `/Users/ming/projects/flappy-3d/public/audio/CREDITS.md`: FOUND (52 lines)
- Commit 63987ab: audio files
- Commit 62994b0: CREDITS.md
