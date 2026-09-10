// Unabhaengiger Screenshot-Beweis: rendert die Seite in echtem Chromium und
// prueft pixelweise, ob unterhalb des Falzes tatsaechlich etwas gemalt wird.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:3000'
const OUT = '/tmp/shots'
const targets = [
  ['timer', '/members/timer'],
  ['kara', '/members/kara'],
  ['gruppe', '/fansubs/new-subs'],
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const report = []

for (const [name, path] of targets) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)

  await page.screenshot({ path: `${OUT}/${name}-oben.png` })
  await page.evaluate(() => window.scrollTo(0, 1300))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${name}-gescrollt.png` })

  // Pixel-Beweis: wie viele nicht-hintergrundfarbene Pixel enthaelt der
  // gescrollte Viewport? Eine wirklich weisse Seite liegt bei ~0 %.
  const buf = await page.screenshot()
  const stats = await page.evaluate(async (dataUrl) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl })
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let nonBg = 0, total = 0
    for (let i = 0; i < d.length; i += 4) {
      total++
      const r = d[i], gg = d[i + 1], b = d[i + 2]
      // Hintergrund ist rgb(249,249,249) bzw. weiss -> alles deutlich davon abweichende zaehlt
      if (Math.abs(r - 249) > 12 || Math.abs(gg - 249) > 12 || Math.abs(b - 249) > 12) nonBg++
    }
    return { nonBgPct: +(100 * nonBg / total).toFixed(2), w: c.width, h: c.height }
  }, 'data:image/png;base64,' + buf.toString('base64'))

  const visibleText = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
    return (el?.innerText || '').slice(0, 80)
  })

  report.push({ name, path, scrollY: 1300, ...stats, visibleText })
  console.log(JSON.stringify(report[report.length - 1]))
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
await browser.close()
