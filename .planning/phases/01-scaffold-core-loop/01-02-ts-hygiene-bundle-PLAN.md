---
phase: "01-scaffold-core-loop"
plan: "02"
type: execute
wave: 1
depends_on: []
files_modified:
  - tsconfig.json
  - vite.config.ts
autonomous: true
requirements:
  - HYG-01
  - HYG-02
  - PERF-02

must_haves:
  truths:
    - "tsc --noEmit exits 0 with strict:true and noUncheckedIndexedAccess:true in tsconfig"
    - "npm run build completes successfully and produces dist/stats.html for bundle inspection"
    - "No import * as THREE exists anywhere in src/ (grep returns empty)"
    - "vite.config.ts exists with rollup-plugin-visualizer wired to npm run build"
  artifacts:
    - path: "tsconfig.json"
      provides: "TypeScript strict mode config"
      contains: '"strict": true'
    - path: "vite.config.ts"
      provides: "Vite config with bundle visualizer"
      contains: "visualizer"
  key_links:
    - from: "tsconfig.json"
      to: "src/"
      via: "include: [\"src\"]"
      pattern: '"include".*src'
    - from: "vite.config.ts"
      to: "rollup-plugin-visualizer"
      via: "plugins: [visualizer()]"
      pattern: "visualizer"
---

<objective>
Enable TypeScript strict mode and wire rollup-plugin-visualizer into the build. These two changes are the hygiene foundation that every subsequent plan inherits — strict mode catches null errors at compile time; the visualizer establishes the bundle-size baseline after Phase 1.

Purpose: Enforce the TS discipline locked in D-18 and D-22 from the first commit so it never has to be retrofitted.

Output:
- tsconfig.json updated with strict + noUncheckedIndexedAccess
- vite.config.ts created with rollup-plugin-visualizer plugin
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/01-scaffold-core-loop/01-CONTEXT.md

Key decisions driving this plan:
- D-18: tsconfig.json — add "strict": true, "noUncheckedIndexedAccess": true (only these two lines change)
- D-19: npm run build already runs "tsc && vite build" — keep as-is; tsc --noEmit exit 0 is the acceptance criterion
- D-21: No import * as THREE anywhere in src/ — verified via grep
- D-22: Install rollup-plugin-visualizer as devDep; add to vite.config.ts so npm run build produces dist/stats.html

<interfaces>
<!-- Existing tsconfig.json before changes (read from disk): -->
Current tsconfig.json already has:
  - "noUnusedLocals": true
  - "noUnusedParameters": true
  - "noFallthroughCasesInSwitch": true
  - "noEmit": true
  - "moduleResolution": "bundler"
  - "target": "es2023"

Adding only:
  - "strict": true
  - "noUncheckedIndexedAccess": true
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enable strict mode in tsconfig.json</name>
  <read_first>
    - tsconfig.json (MUST read current file before editing — edit only the two required lines)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-18: exact keys to add)
  </read_first>
  <files>tsconfig.json</files>
  <action>
Read tsconfig.json first. Then add exactly two lines to the "compilerOptions" object (per D-18):

  "strict": true,
  "noUncheckedIndexedAccess": true,

Place them in the Linting section near the other quality flags (noUnusedLocals, noUnusedParameters, etc.). Do not change any other option.

After editing, run: npx tsc --noEmit

If tsc reports errors, fix them — do NOT comment out strict mode to silence errors. The scaffold has almost no game code yet (main.ts imports only createRenderer and style.css after Plan 01 runs), so strict mode errors should be minimal or zero. The most likely error is a missing non-null assertion on the canvas querySelector — if Plan 01 already used the ! operator, there will be no errors.

If Plan 01 has not run yet (files may not exist), tsc will error on missing imports — that is expected and acceptable; the tsconfig change itself is correct.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - grep '"strict"' tsconfig.json returns: "strict": true
    - grep '"noUncheckedIndexedAccess"' tsconfig.json returns: "noUncheckedIndexedAccess": true
    - No other tsconfig options changed (diff from original should show exactly 2 new lines)
    - npx tsc --noEmit exits 0 (or exits with errors only about files not yet created by Plan 01/03/04, which is acceptable before those plans run — the tsconfig settings themselves are correct)
  </acceptance_criteria>
  <done>tsconfig.json contains strict:true and noUncheckedIndexedAccess:true; the two settings are present and correctly formatted JSON</done>
</task>

<task type="auto">
  <name>Task 2: Install rollup-plugin-visualizer and create vite.config.ts</name>
  <read_first>
    - package.json (check current devDependencies — rollup-plugin-visualizer must be added)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-22: visualizer setup)
  </read_first>
  <files>vite.config.ts, package.json</files>
  <action>
Step 1 — Install the package:
  npm install -D rollup-plugin-visualizer

Step 2 — Create vite.config.ts (this file does not exist yet in the scaffold):

```typescript
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: false,
    }),
  ],
})
```

The `open: false` prevents the browser from auto-opening stats.html on every build (would be disruptive in CI and repeated builds). `gzipSize: true` shows the gzip-compressed sizes that are relevant for the 250KB budget target (PERF-01, tracked in Phase 4).

Do NOT add any other Vite config options — no `base`, no `build.rollupOptions` — those are Phase 4 additions (DEPLOY-01 decisions are not yet made per STATE.md pre-phase flags).
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npm run build 2>&1 | tail -20 && ls dist/stats.html 2>/dev/null && echo "STATS_OK"</automated>
  </verify>
  <acceptance_criteria>
    - package.json devDependencies contains "rollup-plugin-visualizer"
    - vite.config.ts exists with visualizer() in the plugins array
    - npm run build exits 0
    - dist/stats.html exists after npm run build
    - grep -n "open: false" vite.config.ts returns a match (no auto-opening)
    - grep -n "gzipSize: true" vite.config.ts returns a match
    - grep "import \* as THREE" src/ -r returns empty (no barrel import — confirming D-21 discipline from Plan 01 is intact)
  </acceptance_criteria>
  <done>npm run build completes, dist/stats.html is produced, no import * as THREE in src/</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → devDependencies | rollup-plugin-visualizer is a devDep; not in production bundle |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Information Disclosure | dist/stats.html | accept | Stats file is in dist/ which is .gitignored; not deployed to production; reveals bundle structure only to developer |
| T-02-02 | Tampering | tsconfig strict mode | accept | Adding strict mode is a security improvement — reduces silent null/undefined bugs; no threat introduced |
</threat_model>

<verification>
After both tasks complete:

```bash
cd /Users/ming/projects/flappy-3d

# Strict mode active
grep '"strict"' tsconfig.json
# Expected: "strict": true

grep '"noUncheckedIndexedAccess"' tsconfig.json
# Expected: "noUncheckedIndexedAccess": true

# No barrel import
grep -r "import \* as THREE" src/
# Expected: empty

# Build succeeds and produces stats
npm run build && ls dist/stats.html
# Expected: stats.html exists

# tsc clean
npx tsc --noEmit && echo "TSC_CLEAN"
# Expected: TSC_CLEAN
```
</verification>

<success_criteria>
- tsconfig.json has "strict": true and "noUncheckedIndexedAccess": true (HYG-01)
- tsc --noEmit exits 0 — runs as part of npm run build via "tsc && vite build" (HYG-02)
- No import * as THREE in src/ — grep returns empty (PERF-02)
- vite.config.ts exists with rollup-plugin-visualizer configured (D-22)
- npm run build produces dist/stats.html showing gzip-size baseline (D-22)
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold-core-loop/01-02-SUMMARY.md` using the template at `@$HOME/.claude/get-shit-done/templates/summary.md`.

Include: tsconfig options added (exact keys+values), vite.config.ts snapshot, result of npm run build (did it exit 0?), and the observed gzipped bundle size from dist/stats.html if readable (baseline for Phase 4 PERF-01 comparison).
</output>
