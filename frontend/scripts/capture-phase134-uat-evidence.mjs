#!/usr/bin/env node

// Phase 134 Plan 06 (PMQA-05): automated screenshot + keyboard-focus capture across both
// reference profiles (sheppert, csubs-leader) x the three EXPECTED_VIEWPORTS this milestone's
// evidence harnesses already use (frontend/scripts/collect-member-profile-evidence.mjs). This
// reduces the Task 3 human checkpoint to genuinely subjective/interactive judgment only (real
// 400% zoom readability, perceived loading feel, final sign-off) instead of re-doing work this
// script already automates.
//
// Runs INSIDE the team4sv30-frontend container (docker exec team4sv30-frontend node
// scripts/capture-phase134-uat-evidence.mjs) so it resolves the already-installed `playwright`
// dependency the same way collect-member-profile-evidence.mjs does. `.planning/` is mounted
// read-only inside that container, so output is written to a container-writable --out-dir
// (default /tmp/phase134-uat-evidence) and copied onto the host phase-evidence directory by the
// caller (docker cp), mirroring the existing Phase 120 trace-copy pattern.

import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const EXPECTED_VIEWPORTS = ['390x844', '768x1024', '1440x900']
const PROFILES = ['sheppert', 'csubs-leader']
const MAX_TAB_STOPS = 15
// The plan's own suggested "reasonable timeout (30s)" proved too tight on this shared,
// resource-constrained VM (confirmed live: `docker stats`/`uptime` showed load average ~13-25 on
// 4 CPUs with swap nearly exhausted during concurrent Phase 134 evidence-gathering work; the SAME
// navigation that timed out at 9-20s repeatedly completed in ~200ms once contention eased, and
// the standalone home page / a trivial backend JSON route never timed out at any width, ruling out
// a route-specific rendering bug). frontend/scripts/collect-member-profile-evidence.mjs already
// established 90_000ms as this environment's working navigation/networkidle timeout for the exact
// same class of page.goto()/waitForLoadState() calls -- reused verbatim here instead of the
// plan's tighter suggestion.
const NAV_TIMEOUT_MS = 90_000

function fail(message) {
  throw new Error(`phase134 uat evidence: ${message}`)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    assert(key?.startsWith('--') && value && !value.startsWith('--'), `${key ?? '<missing>'} requires a value`)
    parsed[key.slice(2)] = value
  }
  return parsed
}

function parseViewport(label) {
  const [width, height] = label.split('x').map(Number)
  assert(Number.isFinite(width) && Number.isFinite(height), `invalid viewport label ${label}`)
  return { label, width, height }
}

// Reads the CURRENT (live, focused) computed style of document.activeElement, matching this
// codebase's established focus-ring convention: either the global `:focus-visible { outline: 2px
// solid var(--focus-outline); }` rule (globals.css) applies as-is, OR a component overrides
// `outline: none` and substitutes a `box-shadow`-based ring while :focus-visible is matching (see
// FocalCarousel.module.css's `.track:focus-visible` and ui.module.css's `.control:focus-visible`).
async function captureFocusState(page, step) {
  return page.evaluate((stepIndex) => {
    const el = document.activeElement
    if (!el || el === document.body) {
      return { step: stepIndex, tag: null, role: null, ariaLabel: null, text: null, visibleFocus: false, note: 'focus returned to <body>' }
    }
    const style = getComputedStyle(el)
    const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px'
    const focusVisibleMatches = typeof el.matches === 'function' && el.matches(':focus-visible')
    const hasFocusBoxShadow = focusVisibleMatches && style.boxShadow !== 'none' && style.boxShadow !== ''
    return {
      step: stepIndex,
      tag: el.tagName,
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      text: (el.textContent || '').trim().slice(0, 60) || null,
      visibleFocus: hasOutline || hasFocusBoxShadow,
    }
  }, step)
}

async function captureCombo(browser, baseURL, outDir, slug, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
  const page = await context.newPage()
  const url = `${baseURL}/members/${encodeURIComponent(slug)}`
  // The real user-visible route (CLAUDE.md/D-09) is served by the Compose dev override
  // (`npm run dev -- --webpack`), whose HMR client keeps a persistent WebSocket connection open
  // for the life of the page. That makes `waitUntil: 'networkidle'` in `page.goto()` structurally
  // unable to resolve (there is always at least one open connection), which is exactly why the
  // sibling harness this script mirrors (collect-member-profile-evidence.mjs's collectViewport /
  // capturePageMetrics) never awaits networkidle as its OWN goto condition either -- it navigates
  // with `domcontentloaded`, waits for a real render signal (`h1`), then treats a SEPARATE,
  // try/catch-wrapped `waitForLoadState('networkidle', ...)` as best-effort settle time, not a
  // hard gate. This block reproduces that same, already-proven-working pattern; genuine render
  // failures are still caught by the navigation-status assertion and the `h1` wait below, both of
  // which fail loudly and non-zero (the plan's "do not silently skip a broken combination" intent
  // is preserved -- only the specific network-quiescence signal is swapped for one that is
  // actually achievable against this dev server).
  const navigation = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
  assert(navigation?.ok(), `${slug}/${viewport.label}: navigation to ${url} returned ${navigation?.status()}`)
  try {
    await page.waitForSelector('h1', { timeout: NAV_TIMEOUT_MS })
  } catch (error) {
    fail(`${slug}/${viewport.label}: page did not render an <h1> within ${NAV_TIMEOUT_MS}ms (${error instanceof Error ? error.message : error})`)
  }
  try {
    await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT_MS })
  } catch {
    // Expected in dev-mode HMR (see comment above) -- not a failure signal on its own.
  }
  await page.waitForTimeout(1500)

  const title = await page.title()
  const screenshotPath = `${outDir}/screenshots/${slug}-${viewport.label}.png`
  await page.screenshot({ path: screenshotPath, fullPage: true })

  await page.locator('body').click({ position: { x: 4, y: 4 } }).catch(() => {})
  await page.keyboard.press('Escape').catch(() => {})
  const steps = []
  for (let step = 1; step <= MAX_TAB_STOPS; step += 1) {
    await page.keyboard.press('Tab')
    steps.push(await captureFocusState(page, step))
  }
  const failingSteps = steps.filter((entry) => entry.visibleFocus !== true)
  const keyboardPass = failingSteps.length === 0
  const keyboardPath = `${outDir}/${slug}-${viewport.label}-keyboard.json`
  writeFileSync(keyboardPath, `${JSON.stringify({
    slug,
    viewport: viewport.label,
    url,
    capturedAt: new Date().toISOString(),
    maxTabStops: MAX_TAB_STOPS,
    steps,
    keyboardPass,
    failingSteps,
  }, null, 2)}\n`)

  await context.close()

  console.log(JSON.stringify({
    ok: true,
    slug,
    viewport: viewport.label,
    title,
    screenshotPath,
    keyboardPath,
    keyboardPass,
    failingStepCount: failingSteps.length,
  }))

  return { slug, viewport: viewport.label, keyboardPass, failingSteps, screenshotPath, keyboardPath }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseURL = String(args['base-url'] ?? 'http://192.168.235.196:3000').replace(/\/+$/, '')
  const outDir = String(args['out-dir'] ?? '/tmp/phase134-uat-evidence').replace(/\/+$/, '')
  mkdirSync(`${outDir}/screenshots`, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const results = []
  try {
    for (const slug of PROFILES) {
      for (const viewportLabel of EXPECTED_VIEWPORTS) {
        results.push(await captureCombo(browser, baseURL, outDir, slug, parseViewport(viewportLabel)))
      }
    }
  } finally {
    await browser.close()
  }

  const failures = results.filter((result) => !result.keyboardPass)
  console.log(JSON.stringify({
    ok: failures.length === 0,
    baseURL,
    outDir,
    combos: results.length,
    screenshotCount: results.length,
    keyboardFileCount: results.length,
    failures: failures.map((result) => ({ slug: result.slug, viewport: result.viewport, failingSteps: result.failingSteps })),
  }))

  if (failures.length > 0) {
    fail(`${failures.length} profile+viewport combination(s) had a Tab stop with no visible focus indicator in the first ${MAX_TAB_STOPS} stops: ${failures.map((result) => `${result.slug}/${result.viewport}`).join(', ')}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
