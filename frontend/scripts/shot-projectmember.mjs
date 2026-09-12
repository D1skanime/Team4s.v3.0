// Screenshot-Beweis der oeffentlichen Projekt-Member-Seite (Referenzvergleich).
//
// Laeuft im frontend-Container: node /app/scripts/shot-projectmember.mjs
//
// Wichtig: Das Backend erlaubt per CORS AUSSCHLIESSLICH den Origin
// http://127.0.0.1:3300 (der Windows-SSH-Tunnel, ueber den der Auftraggeber testet).
// Ein Aufruf ueber http://127.0.0.1:3000 laesst alle Client-Fetches der Sektionen im
// CORS-Preflight scheitern -- die Seite sieht dann faelschlich leer aus. Deshalb wird hier
// ein winziger Reverse-Proxy auf 127.0.0.1:3300 gestartet, der auf 127.0.0.1:3000 zeigt:
// der Seiten-Origin ist damit echt 127.0.0.1:3300, CORS greift wie beim Auftraggeber,
// und es wird KEIN Header gefaelscht.
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const UPSTREAM_PORT = Number(process.env.SHOT_UPSTREAM_PORT || 3000)
const PROXY_PORT = Number(process.env.SHOT_PROXY_PORT || 3300)
const PATH_UNDER_TEST =
  process.env.SHOT_PATH || '/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type'
const LABEL = process.env.SHOT_LABEL || 'before'
const OUT = process.env.SHOT_OUT || '/tmp/pmshots'

mkdirSync(OUT, { recursive: true })

const proxy = http.createServer((req, res) => {
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: UPSTREAM_PORT,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `127.0.0.1:${UPSTREAM_PORT}` },
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers)
      up.pipe(res)
    },
  )
  upstream.on('error', () => {
    res.writeHead(502)
    res.end('upstream error')
  })
  req.pipe(upstream)
})

await new Promise((resolve) => proxy.listen(PROXY_PORT, '127.0.0.1', resolve))
const BASE = `http://127.0.0.1:${PROXY_PORT}`

const viewports = [
  ['mobile', 390, 1200],
  ['desktop', 1440, 1000],
]

const browser = await chromium.launch()
try {
  for (const [name, width, height] of viewports) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    const consoleErrors = []
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })

    const resp = await page.goto(BASE + PATH_UNDER_TEST, {
      waitUntil: 'networkidle',
      timeout: 90000,
    })
    await page.waitForTimeout(3000)

    const file = `${OUT}/${LABEL}-${name}.png`
    await page.screenshot({ path: file, fullPage: true })

    const facts = await page.evaluate(() => {
      const texts = (sel) =>
        Array.from(document.querySelectorAll(sel))
          .map((n) => (n.textContent || '').trim())
          .filter(Boolean)
      const notes = document.getElementById('texte')
      const media = document.getElementById('bilder')
      const releases = document.getElementById('releases')
      const h = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null)
      return {
        docHeight: document.documentElement.scrollHeight,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
        h2s: texts('h2'),
        buttonLabels: texts('button'),
        notesSectionHeight: h(notes),
        mediaSectionHeight: h(media),
        releasesSectionHeight: h(releases),
        // Wie oft taucht der Rollenname im Notizbereich auf? >0 = Rolle pro Beitrag wiederholt.
        roleRepeatsInNotes: notes
          ? ((notes.textContent || '').match(/Typesetting/g) || []).length
          : null,
        noteEntryCount: notes
          ? notes.querySelectorAll('article, [data-note-entry]').length
          : null,
        pagerTexts: notes
          ? texts('#texte [class*="pager"], #texte [class*="Pager"]')
          : null,
        releasesText: releases ? (releases.textContent || '').trim().slice(0, 200) : null,
      }
    })

    console.log(
      JSON.stringify(
        { viewport: name, status: resp && resp.status(), file, facts, consoleErrors },
        null,
        2,
      ),
    )
    await ctx.close()
  }
} finally {
  await browser.close()
  await new Promise((resolve) => proxy.close(resolve))
}
