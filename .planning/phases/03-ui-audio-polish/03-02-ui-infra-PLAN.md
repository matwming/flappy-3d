---
phase: 03-ui-audio-polish
plan: 02
type: execute
wave: 2
depends_on:
  - "03-01"
files_modified:
  - index.html
  - vite.config.ts
  - tsconfig.json
  - package.json
  - src/ui/UIBridge.ts
  - src/ui/styles.css
  - src/storage/StorageManager.ts
  - src/main.ts
  - src/a11y/motion.ts
autonomous: true
requirements:
  - HUD-01
  - HUD-08
  - SAVE-03
  - SAVE-04

must_haves:
  truths:
    - "Preact + @preact/preset-vite installed and JSX compiles"
    - "<div id='ui-root'> sits above canvas with pointer-events:none on root"
    - "UIBridge subscribes to actor and renders Preact app at #ui-root"
    - "StorageManager schema bumped to v2 with leaderboard + settings; v1 migrates safely"
    - "prefersReducedMotion detected in JS (matchMedia + settings override per D-31)"
  artifacts:
    - path: "src/ui/UIBridge.ts"
      provides: "actor → DOM bridge; Preact app mount point"
      exports: ["UIBridge"]
    - path: "src/storage/StorageManager.ts"
      provides: "v2 schema with leaderboard + settings; getLeaderboard/pushLeaderboard/getSettings/setSettings"
    - path: "src/a11y/motion.ts"
      provides: "prefersReducedMotion() that respects settings override"
      exports: ["prefersReducedMotion", "subscribeReducedMotion"]
---

<objective>
Set up the DOM overlay infrastructure: install Preact, configure Vite + tsconfig for JSX, add #ui-root to index.html, build the UIBridge that owns the Preact mount, extend StorageManager to v2 schema (leaderboard + settings), and add the motion-gate utility. Plan 03-03 builds screens on top of this.
</objective>

<execution_context>
@/Users/ming/projects/flappy-3d/.planning/phases/03-ui-audio-polish/03-CONTEXT.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Install Preact + configure Vite/TS</name>
  <read_first>
    - 03-CONTEXT.md §D-12 through D-15 (DOM overlay arch + Preact integration)
    - vite.config.ts (current — Phase 1+2 visualizer)
    - tsconfig.json (current — strict + erasableSyntaxOnly)
  </read_first>
  <files>package.json, vite.config.ts, tsconfig.json, index.html</files>
  <action>
A) `npm install preact && npm install -D @preact/preset-vite`

B) Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    preact(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: false,
    }),
  ],
})
```

C) Update `tsconfig.json` `compilerOptions`:
- Add `"jsx": "react-jsx"`
- Add `"jsxImportSource": "preact"`

D) Update `index.html` — add `<div id="ui-root"></div>` BEFORE the canvas (so canvas is in DOM order before, but z-index lifts the UI):
```html
<body>
  <canvas id="scene"></canvas>
  <div id="ui-root"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

E) `npm run build` to verify the toolchain works.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && grep -c "preact" package.json && grep -n "preact()" vite.config.ts && grep -n "react-jsx\|preact" tsconfig.json && grep -n "ui-root" index.html && npm run build 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - package.json contains `preact` (dep) + `@preact/preset-vite` (devDep)
    - vite.config.ts has `preact()` in plugins array
    - tsconfig.json has `"jsx": "react-jsx"` + `"jsxImportSource": "preact"`
    - index.html contains `<div id="ui-root">`
    - `npm run build` exits 0
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Extend StorageManager to v2 schema</name>
  <read_first>
    - 03-CONTEXT.md §D-32 through D-34 (schema v2 + new API)
    - src/storage/StorageManager.ts (current Phase 2 v1 schema)
  </read_first>
  <files>src/storage/StorageManager.ts</files>
  <action>
Extend the existing StorageManager to support schema v2 with safe v1→v2 migration.

```typescript
const STORAGE_KEY = 'flappy-3d:v1'

export interface SettingsV2 {
  sound: boolean
  music: boolean
  reduceMotion: 'auto' | 'on' | 'off'
  palette: 'default' | 'colorblind'
}

export interface LeaderboardEntry {
  score: number
  ts: number
}

const DEFAULT_SETTINGS: SettingsV2 = {
  sound: true,
  music: true,
  reduceMotion: 'auto',
  palette: 'default',
}

interface SaveV1 {
  schemaVersion: 1
  bestScore: number
}

interface SaveV2 {
  schemaVersion: 2
  bestScore: number
  leaderboard: LeaderboardEntry[]
  settings: SettingsV2
}

export class StorageManager {
  private load(): SaveV2 {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return this.defaults()
      const parsed = JSON.parse(raw) as SaveV1 | SaveV2
      if (parsed.schemaVersion === 1) {
        // Migrate v1 → v2
        return {
          schemaVersion: 2,
          bestScore: parsed.bestScore,
          leaderboard: parsed.bestScore > 0 ? [{ score: parsed.bestScore, ts: Date.now() }] : [],
          settings: { ...DEFAULT_SETTINGS },
        }
      }
      if (parsed.schemaVersion === 2) return parsed
      return this.defaults()
    } catch {
      return this.defaults()
    }
  }

  private save(data: SaveV2): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Quota exceeded or disabled — silent fail (game still playable)
    }
  }

  private defaults(): SaveV2 {
    return { schemaVersion: 2, bestScore: 0, leaderboard: [], settings: { ...DEFAULT_SETTINGS } }
  }

  getBestScore(): number { return this.load().bestScore }

  setBestScore(score: number): void {
    const data = this.load()
    if (score > data.bestScore) {
      data.bestScore = score
      this.save(data)
    }
  }

  getLeaderboard(): LeaderboardEntry[] {
    return this.load().leaderboard.slice()
  }

  pushLeaderboard(score: number): { isNewBest: boolean; rank: number | null } {
    const data = this.load()
    const before = data.leaderboard.length > 0 ? data.leaderboard[0].score : 0
    data.leaderboard = [...data.leaderboard, { score, ts: Date.now() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    const idx = data.leaderboard.findIndex((e) => e.score === score)
    const rank = idx >= 0 ? idx + 1 : null
    if (score > data.bestScore) data.bestScore = score
    this.save(data)
    return { isNewBest: score > before, rank }
  }

  getSettings(): SettingsV2 { return { ...this.load().settings } }

  setSettings(partial: Partial<SettingsV2>): void {
    const data = this.load()
    data.settings = { ...data.settings, ...partial }
    this.save(data)
  }
}
```

Note: This keeps the storage key as `'flappy-3d:v1'` (the bucket name) but changes the schema inside. Migration is safe because v1 only had `bestScore`.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit && grep -n "schemaVersion: 2\|getLeaderboard\|getSettings\|setSettings" src/storage/StorageManager.ts</automated>
  </verify>
  <acceptance_criteria>
    - StorageManager exports getBestScore, setBestScore, getLeaderboard, pushLeaderboard, getSettings, setSettings
    - v1→v2 migration logic present
    - Settings type includes sound, music, reduceMotion, palette with correct defaults
    - tsc clean
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Build UIBridge + motion utility + base styles</name>
  <read_first>
    - 03-CONTEXT.md §D-12 through D-15, D-30, D-31
    - src/main.ts (current — Phase 2 + 03-01 audio integration)
  </read_first>
  <files>src/ui/UIBridge.ts, src/ui/styles.css, src/a11y/motion.ts, src/main.ts</files>
  <action>
A) Create `src/a11y/motion.ts`:

```typescript
import type { StorageManager } from '../storage/StorageManager'

let cachedReduceMotion: boolean | null = null
const listeners: Array<(reduce: boolean) => void> = []

export function prefersReducedMotion(storage: StorageManager): boolean {
  if (cachedReduceMotion !== null) return cachedReduceMotion
  const setting = storage.getSettings().reduceMotion
  if (setting === 'on') cachedReduceMotion = true
  else if (setting === 'off') cachedReduceMotion = false
  else cachedReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return cachedReduceMotion
}

export function refreshReducedMotion(storage: StorageManager): void {
  cachedReduceMotion = null
  const v = prefersReducedMotion(storage)
  for (const cb of listeners) cb(v)
}

export function subscribeReducedMotion(cb: (reduce: boolean) => void): () => void {
  listeners.push(cb)
  return () => {
    const i = listeners.indexOf(cb)
    if (i >= 0) listeners.splice(i, 1)
  }
}
```

B) Create `src/ui/styles.css` (base styles for overlay layer):

```css
#ui-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a2e;
  z-index: 10;
}

#ui-root .screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
#ui-root .screen.active {
  opacity: 1;
  pointer-events: auto;
}

#ui-root button {
  pointer-events: auto;
  min-width: 44px;
  min-height: 44px;
  padding: 12px 20px;
  border: 2px solid rgba(26, 26, 46, 0.25);
  background: rgba(255, 255, 255, 0.85);
  color: #1a1a2e;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: transform 150ms, background 150ms;
}
#ui-root button:hover { transform: translateY(-1px); background: rgba(255, 255, 255, 0.95); }
#ui-root button:focus-visible { outline: 3px solid #f9c74f; outline-offset: 2px; }
```

C) Create `src/ui/UIBridge.tsx` (Preact mount):

```typescript
import { h, render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import type { Actor, SnapshotFrom } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { AudioManager } from '../audio/AudioManager'
import type { StorageManager } from '../storage/StorageManager'

type GameActor = Actor<typeof gameMachine>
type Snap = SnapshotFrom<typeof gameMachine>

export class UIBridge {
  private actor: GameActor
  private audio: AudioManager
  private storage: StorageManager
  private mountEl: HTMLElement | null = null

  constructor(actor: GameActor, audio: AudioManager, storage: StorageManager) {
    this.actor = actor
    this.audio = audio
    this.storage = storage
  }

  mount(): void {
    this.mountEl = document.getElementById('ui-root')
    if (!this.mountEl) throw new Error('#ui-root not found in DOM')
    // App component is in this same file or src/ui/App.tsx — Plan 03-03 builds it
    render(h(App, { actor: this.actor, audio: this.audio, storage: this.storage }), this.mountEl)
  }

  dispose(): void {
    if (this.mountEl) render(null, this.mountEl)
  }
}

// Stub App — Plan 03-03 replaces with full screen routing
function App(props: { actor: GameActor; audio: AudioManager; storage: StorageManager }) {
  const [snap, setSnap] = useState<Snap>(props.actor.getSnapshot())
  useEffect(() => {
    const sub = props.actor.subscribe((s) => setSnap(s))
    return () => sub.unsubscribe()
  }, [props.actor])
  return h(
    'div',
    { className: 'screen active' },
    h('p', null, 'Phase 3 Plan 02 stub — screens come in Plan 03-03. State: ' + String(snap.value)),
  )
}
```

NOTE: Rename `UIBridge.ts` to `UIBridge.tsx` since it has JSX/h() calls. Or keep .ts and use only h() (no JSX) — simpler imports.

D) Update `src/main.ts` to instantiate UIBridge after AudioManager:

```typescript
import { UIBridge } from './ui/UIBridge'
import './ui/styles.css'

// after audio init:
const ui = new UIBridge(actor, audio, storage)
ui.mount()
```

Remove the old `actor.subscribe(snapshot => console.log(...))` debug bridge since UIBridge now drives UI from snapshots. Optional: keep one slim console.log line behind a `if (import.meta.env.DEV)` for dev-mode visibility.

E) tsc clean check + npm run build.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit && npm run build 2>&1 | tail -3 && grep -n "UIBridge" src/main.ts && grep -n "render.*App\|h(App" src/ui/UIBridge.tsx</automated>
  </verify>
  <acceptance_criteria>
    - src/ui/UIBridge.tsx (or .ts) exports UIBridge class with mount() + dispose()
    - src/ui/styles.css imported in main.ts
    - src/a11y/motion.ts exports prefersReducedMotion + subscribeReducedMotion
    - main.ts creates AudioManager + StorageManager + UIBridge in correct order
    - npm run build exits 0; dist/index.html contains #ui-root after build
  </acceptance_criteria>
</task>

</tasks>

<success_criteria>
- HUD-01 ✓ — #ui-root layer above canvas with pointer-events: none
- HUD-08 ✓ — Preact set up; UIBridge mount renders Preact app
- SAVE-03 ✓ — top-5 leaderboard storage in StorageManager v2 schema
- SAVE-04 ✓ — settings (sound, music, motion, palette) persisted via StorageManager v2
</success_criteria>

<output>
Write `.planning/phases/03-ui-audio-polish/03-02-SUMMARY.md`. Atomic commit: `feat(03-02): preact + #ui-root + UIBridge + StorageManager v2 schema`.
</output>
