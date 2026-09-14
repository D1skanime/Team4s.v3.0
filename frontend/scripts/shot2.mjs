// Einmal-Skript: Screenshot ERST nach vollstaendigem Durchscrollen, damit lazy geladene
// Sektionen (IntersectionObserver) im Bild tatsaechlich enthalten sind.
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const UP = 3000
const PORT = 3300
const PATH_UT = '/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type'
const OUT = '/tmp/pmshots'
mkdirSync(OUT, { recursive: true })

const proxy = http.createServer((req, res) => {
  const up = http.request(
    { host: '127.0.0.1', port: UP, method: req.method, path: req.url,
      headers: { ...req.headers, host: `127.0.0.1:${UP}` } },
    (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res) },
  )
  up.on('error', () => { res.writeHead(502); res.end('upstream') })
  req.pipe(up)
})
await new Promise((r) => proxy.listen(PORT, '127.0.0.1', r))

const browser = await chromium.launch()
try {
  for (const [name, w, h] of [['mobile', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    await page.goto(`http://127.0.0.1:${PORT}${PATH_UT}`, { waitUntil: 'networkidle', timeout: 90000 })

    // Durchscrollen, damit jeder IntersectionObserver feuert, dann zurueck nach oben.
    await page.evaluate(async () => {
      const step = window.innerHeight
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 250))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(3500)

    const facts = await page.evaluate(() => {
      const notes = document.getElementById('texte')
      const txt = notes ? notes.textContent || '' : ''
      return {
        docHeight: document.documentElement.scrollHeight,
        stillLoading: txt.includes('Wird geladen'),
        noteEntries: notes ? notes.querySelectorAll('[data-note-entry]').length : 0,
        nestedInteractive: document.querySelectorAll('a a, a button, button a, button button').length,
      }
    })
    await page.screenshot({ path: `${OUT}/scan-${name}.png`, fullPage: true })
    console.log(JSON.stringify({ viewport: name, ...facts }))
    await ctx.close()
  }
} finally {
  await browser.close()
  await new Promise((r) => proxy.close(r))
}
