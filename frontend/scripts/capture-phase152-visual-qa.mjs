#!/usr/bin/env node
// Phase 152 Plan 10, Task 1: 8-viewport screenshot evidence capture for /fansubs/[slug].
// Precedent: frontend/scripts/capture-phase151-badge-evidence.mjs +
// phase151-badge-evidence-browser-private.mjs (chromium from playwright, per-viewport
// page.setViewportSize, pageerror/console/requestfailed/response>=400 diagnostics wiring,
// screenshot-to-disk). Small phase-152-scoped script, not new generic infrastructure.

import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright'

const VIEWPORTS = [320, 390, 520, 768, 1024, 1440, 1920, 2560]
const FIXED_HEIGHT = 2400 // generous height so a single shot captures the full scroll length

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[index + 1]
    args[key] = next && !next.startsWith('--') ? next : 'true'
  }
  return args
}

class Findings {
  constructor() {
    this.rows = []
  }

  fail(category, evidence, detail) {
    this.rows.push({ category, evidence, detail, at: new Date().toISOString() })
  }
}

function attachDiagnostics(page, label, findings) {
  page.on('pageerror', (error) => {
    findings.fail('browser-page-error', label, error.message)
  })
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    findings.fail('browser-console-error', label, message.text())
  })
  page.on('requestfailed', (request) => {
    findings.fail('browser-request-failed', `${label} ${request.url()}`, request.failure()?.errorText || 'unknown failure')
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    findings.fail('browser-http-error', `${label} ${response.url()}`, `HTTP ${response.status()}`)
  })
}

async function settleImages(page) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
  await page.evaluate(async () => {
    const images = Array.from(document.images)
    await Promise.all(images.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {}))))
  })
  await page.waitForTimeout(300)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseURL = String(args['base-url'] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')
  const slug = String(args.slug ?? 'new-subs')
  const outDir = String(args['out-dir'] ?? '/tmp/team4s-152-visual-qa').replace(/\/+$/, '')
  const pageURL = `${baseURL}/fansubs/${slug}`

  mkdirSync(outDir, { recursive: true })
  mkdirSync(`${outDir}/screenshots`, { recursive: true })

  const findings = new Findings()
  const results = []
  let browser = null

  try {
    browser = await chromium.launch({ headless: true })
    for (const width of VIEWPORTS) {
      const label = `${width}x${FIXED_HEIGHT}`
      const context = await browser.newContext({ viewport: { width, height: FIXED_HEIGHT } })
      const page = await context.newPage()
      attachDiagnostics(page, label, findings)
      try {
        const response = await page.goto(pageURL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
        if (!response || !response.ok()) {
          findings.fail('navigation', label, `GET ${pageURL} returned ${response ? response.status() : 'no response'}`)
        }
        await settleImages(page)
        // Expand the History section's "Weitere anzeigen" toggle so both legendary-tier
        // entries (projects_500 visible pre-expand, releases_10000 behind the toggle per
        // 152-09-SUMMARY.md) are captured in one full-page screenshot. Click only after
        // hydration has settled (settleImages waits networkidle) so the onClick handler
        // is actually attached.
        const expandButton = page.getByRole('button', { name: /Weitere.*anzeigen/i })
        if (await expandButton.count()) {
          await expandButton.first().click()
          await page.getByRole('button', { name: /Weniger anzeigen/i }).waitFor({ state: 'visible', timeout: 5_000 })
          await settleImages(page)
        }
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        if (overflow.scrollWidth > overflow.clientWidth + 1) {
          findings.fail('horizontal-overflow', label, JSON.stringify(overflow))
        }
        const screenshotPath = `screenshots/${label}.png`
        await page.screenshot({ path: `${outDir}/${screenshotPath}`, fullPage: true, animations: 'disabled' })
        results.push({ width, height: FIXED_HEIGHT, screenshot: screenshotPath, overflow })
      } catch (error) {
        findings.fail('capture-fatal', label, error instanceof Error ? error.stack || error.message : String(error))
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser?.close()
  }

  const findingsLog = {
    generatedAt: new Date().toISOString(),
    pageURL,
    viewportsRequested: VIEWPORTS.length,
    viewportsCaptured: results.length,
    results,
    findings: findings.rows,
    pass: findings.rows.length === 0,
  }
  writeFileSync(`${outDir}/findings.json`, `${JSON.stringify(findingsLog, null, 2)}\n`)
  console.log(JSON.stringify({ pass: findingsLog.pass, outDir, viewportsCaptured: results.length, findingsCount: findings.rows.length }))
  if (findings.rows.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
