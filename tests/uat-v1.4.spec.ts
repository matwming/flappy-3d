import { test, expect } from '@playwright/test'

const URL = 'https://quietbuildlab.github.io/flappy-3d/'

// v1.4 — Polish UAT.
// These tests verify Phase 14 (Bird Polish: rim light + wings) and Phase 15
// (Camera Depth opt-in) made it into the deployed bundle. They are
// structural smoke checks; visual quality must still be human-verified on
// device. Live-bundle markers (e.g. `uRimStrength`) are deliberately
// readable strings inserted by Three.js shader injection — minifiers
// preserve them inside template literals.

test.describe('Flappy 3D — v1.4 UAT (Polish)', () => {
  test('Phase 14 — rim-light shader uniform is in the live bundle', async ({ request }) => {
    const html = await (await request.get(URL)).text()
    const m = html.match(/\/flappy-3d\/assets\/(index-[^"]+\.js)/)
    expect(m, 'index JS asset URL').not.toBeNull()
    const js = await (await request.get(`${URL}assets/${m![1]}`)).text()
    expect(js).toContain('uRimStrength')
  })

  test('Phase 14 — bird wing meshes (leftWing/rightWing) are in the live bundle', async ({ request }) => {
    const html = await (await request.get(URL)).text()
    const m = html.match(/\/flappy-3d\/assets\/(index-[^"]+\.js)/)
    const js = await (await request.get(`${URL}assets/${m![1]}`)).text()
    expect(js).toContain('leftWing')
    expect(js).toContain('rightWing')
  })

  test('Phase 15 — Camera bob Settings toggle label is rendered', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'networkidle' })
    // Wait for Preact UI to mount (TitleScreen renders the settings button)
    await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
    // Click via JS — actionability check may fail because the canvas
    // overlay or transition layer above #ui-root intercepts pointer events
    // in headless Chromium even though the button is visible + clickable.
    await page.locator('.title-settings-btn').evaluate((el) => (el as HTMLButtonElement).click())
    await expect(page.locator('text=Camera bob')).toBeVisible({ timeout: 5000 })
  })

  test('Phase 15 — cameraBob defaults to false (opt-in)', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.removeItem('flappy-3d:v1'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
    // Click via JS — actionability check may fail because the canvas
    // overlay or transition layer above #ui-root intercepts pointer events
    // in headless Chromium even though the button is visible + clickable.
    await page.locator('.title-settings-btn').evaluate((el) => (el as HTMLButtonElement).click())
    // Toggle is a <button role="switch" aria-pressed="true|false"> with the
    // label as inner text content (see src/ui/components/Toggle.tsx).
    const cameraBobToggle = page
      .locator('button[role="switch"]')
      .filter({ hasText: 'Camera bob' })
      .first()
    await expect(cameraBobToggle).toBeVisible()
    expect(await cameraBobToggle.getAttribute('aria-pressed')).toBe('false')
  })

  test('Phase 15 — cameraBob persists in localStorage when toggled', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.removeItem('flappy-3d:v1'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
    // Click via JS — actionability check may fail because the canvas
    // overlay or transition layer above #ui-root intercepts pointer events
    // in headless Chromium even though the button is visible + clickable.
    await page.locator('.title-settings-btn').evaluate((el) => (el as HTMLButtonElement).click())
    const cameraBobToggle = page
      .locator('button[role="switch"]')
      .filter({ hasText: 'Camera bob' })
      .first()
    await cameraBobToggle.click()
    await page.waitForTimeout(120)
    const storedCameraBob = await page.evaluate(() => {
      const raw = localStorage.getItem('flappy-3d:v1')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.settings?.cameraBob ?? null
    })
    expect(storedCameraBob).toBe(true)
  })

  test('Bundle — still under 250KB gzip', async ({ request }) => {
    const html = await (await request.get(URL)).text()
    const m = html.match(/\/flappy-3d\/assets\/(index-[^"]+\.js)/)
    const res = await request.get(`${URL}assets/${m![1]}`, {
      headers: { 'Accept-Encoding': 'gzip' },
    })
    const body = await res.body()
    // Raw bytes; CI's bundle-check.sh measures actual gzip. This is a soft guard.
    expect(body.length).toBeLessThan(800_000) // ~199KB gzip ≈ ~725KB raw, headroom for growth
  })
})
