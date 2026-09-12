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
//
// Plan 157-06 (Testmatrix/Live-UAT, Workstream I) erweitert die urspruengliche facts-Struktur
// (Plan 157-01/gathering) um konkrete, screenshot-unabhaengige Kennzahlen fuer die
// Beitragszusammenfassung, die Statistikleiste, den aktiven Tab, die Medien-/Releases-Pager-
// Texte und -- per P157-13 -- die tatsaechlich berechnete Rollenfarbe je Notiz-Eintrag. Das
// bestehende Ausgabeformat (ein JSON-Objekt pro Viewport, nach stdout) bleibt unveraendert;
// es werden nur zusaetzliche Felder in `facts` angehaengt.
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

      // Workstream A -- Hero: beide Aktionsbuttons nebeneinander (D-16 + allgemeines Profil).
      const heroSection = document.querySelector('section[aria-label="Projekt-Mitwirkung"]')
      const heroButtonLabels = heroSection
        ? Array.from(heroSection.querySelectorAll('a,button')).map((n) =>
            (n.textContent || '').trim(),
          )
        : []

      // Workstream B -- Statistikleiste: EINE Karte, vier Eintraege (nicht vier Boxen).
      const statBarEntryCount = document.querySelectorAll('[class*="summaryEntry"]').length

      // Workstream C -- Tab-Nav: welcher Pill traegt aktuell den Aktivzustand.
      const activePillEl = document.querySelector('[class*="stickyNavItemActive"]')
      const activeNavPill = activePillEl ? (activePillEl.textContent || '').trim() : null

      // Workstream D -- Beitragszusammenfassung-Band (liest den echten episodes-Count aus 157-01).
      const bandEl = document.querySelector('[class*="ProjectMemberSummaryBand"]')
      const summaryBandText = bandEl ? (bandEl.textContent || '').trim() : null

      // Workstream E/F -- Notizen-Timeline: Rollenname-Wiederholung soll auf 0 fallen (Single-Role
      // Member "Type"), Pager-Text bleibt sichtbar wo er Information traegt.
      const roleRepeatsInNotes = notes
        ? ((notes.textContent || '').match(/Typesetting/g) || []).length
        : null
      const noteEntryCount = notes
        ? notes.querySelectorAll('article, [data-note-entry]').length
        : null
      const pagerTexts = notes ? texts('#texte [class*="pager"], #texte [class*="Pager"]') : null

      // P157-13 -- Rollenfarbe MUSS an jedem Eintrag sichtbar bleiben (data-color-key ->
      // --role-accent -> border-inline-start-color), unabhaengig von hasMultipleRoles.
      const noteAccentColorSamples = Array.from(document.querySelectorAll('[data-note-entry]')).map(
        (el) => ({
          colorKey: el.getAttribute('data-color-key'),
          borderInlineStartColor: getComputedStyle(el).borderInlineStartColor,
        }),
      )

      // Workstream G -- Medien: "Alle N angezeigt" soll verschwinden, sobald alles geladen ist.
      const mediaText = media ? (media.textContent || '') : ''
      const mediaAllShownTextPresent = /Alle\s+\d+\s+angezeigt/.test(mediaText)

      // Workstream H -- Releases: kompakter Empty-State statt Doppelinformation bei 0.
      const releasesText = releases ? (releases.textContent || '').trim() : ''
      const releasesEmptyStateText = releasesText.includes(
        'Noch keine öffentlichen Release-Einträge.',
      )
        ? 'Noch keine öffentlichen Release-Einträge.'
        : null

      return {
        docHeight: document.documentElement.scrollHeight,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
        h2s: texts('h2'),
        buttonLabels: texts('button'),
        notesSectionHeight: h(notes),
        mediaSectionHeight: h(media),
        releasesSectionHeight: h(releases),
        heroButtonLabels,
        statBarEntryCount,
        activeNavPill,
        summaryBandText,
        roleRepeatsInNotes,
        noteEntryCount,
        pagerTexts,
        noteAccentColorSamples,
        mediaAllShownTextPresent,
        releasesEmptyStateText,
        releasesText: releasesText.slice(0, 200),
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
