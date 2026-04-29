# Audio Credits

All samples are CC0 (public domain) unless noted otherwise.

| File | Source | Author | License | URL |
|------|--------|--------|---------|-----|
| flap.mp3 | Kenney Interface Sounds | Kenney (www.kenney.nl) | CC0 | https://kenney.nl/assets/interface-sounds |
| score.mp3 | Kenney Interface Sounds | Kenney (www.kenney.nl) | CC0 | https://kenney.nl/assets/interface-sounds |
| death.mp3 | Kenney Interface Sounds | Kenney (www.kenney.nl) | CC0 | https://kenney.nl/assets/interface-sounds |
| music.mp3 | 4 Chiptunes - Adventure (Stage 1 loop) | Juhani Junkala (juhanijunkala.com) | CC0 | https://opengameart.org/content/4-chiptunes-adventure |

## Source Details

### SFX Files (from kenney.nl Interface Sounds pack)

- **flap.mp3** — converted from `maximize_003.ogg`; a short ascending swoosh suitable for a wing flap
- **score.mp3** — converted from `confirmation_001.ogg`; a bright confirmation ding for scoring a point
- **death.mp3** — converted from `error_001.ogg`; a short negative hit/error sound for death
- All Kenney assets are CC0 (public domain) — no attribution legally required but noted here
- Pack zip URL: https://kenney.nl/media/pages/assets/interface-sounds/d23a84242e-1677589452/kenney_interface-sounds.zip

### Music File (from opengameart.org)

- **music.mp3** — converted from `Juhani Junkala [Chiptune Adventures] 1. Stage 1.ogg`
- 41-second seamlessly-looping chiptune adventure track
- Bitrate: 64 kbps MP3 (329 KB raw; ~325 KB gzip — see budget note below)
- Original OGG URL: https://opengameart.org/sites/default/files/Juhani%20Junkala%20%5BChiptune%20Adventures%5D%201.%20Stage%201.ogg
- CC0 license confirmed: https://opengameart.org/content/4-chiptunes-adventure
- Author site: http://juhanijunkala.com

## Bundle Budget Note

- flap.mp3 gzip: ~2 KB (well within 10 KB SFX target)
- score.mp3 gzip: ~3 KB (well within 10 KB SFX target)
- death.mp3 gzip: ~2 KB (well within 10 KB SFX target)
- music.mp3 gzip: ~325 KB (exceeds 100 KB gzip target from D-15 — future optimization candidate)
  - Music is served as a separate asset, cached by Workbox CacheFirst after first load
  - One-time download penalty; does not affect JS bundle (bundle-check.sh only counts dist/assets/*.js)
  - To optimize: trim to 15s loop (180 KB) or reduce bitrate to 32 kbps (165 KB)

## Date Sourced

2026-04-29

## Notes

- Pixabay Sound Effects and Freesound.org were attempted first; sourcing ultimately succeeded via
  kenney.nl (static zip, no bot protection) and opengameart.org (direct OGG file).
- All OGG sources converted to MP3 using ffmpeg (libmp3lame, 64 kbps, 44.1 kHz).
- AudioManager synth fallback (WebAudio oscillators) is no longer the active code path:
  flapLoaded, scoreLoaded, deathLoaded flags will be true after page load.
- No modification to sample content or license.
