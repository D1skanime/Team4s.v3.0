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
//
// 157-06 Operator-Korrektur 5/5: zusaetzliche Diagnose fuer den "blauen vertikalen Streifen"
// (x~0-8px) im Desktop-Vollseiten-Screenshot. Statt die fruehere Hypothese (AppShell .brandMark/
// .userAvatar) nur zu wiederholen, wird hier per DOM-Abfrage das TATSAECHLICH an dieser Stelle
// gerenderte Element ermittelt (elementFromPoint) und die AppShell-.edgeStrip (position:fixed;
// height:100vh, `aria-label="Menü öffnen"`) direkt vermessen -- plus ein zusaetzlicher
// Viewport-only-Screenshot (kein fullPage) zum Vergleich.
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
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
  ['mobile', 390, 844],
  ['tablet', 768, 1024],
  ['desktop', 1440, 900],
]

// Plan 157-11 (GAP-02 script fix) -- the previous fullPage screenshot was taken immediately after
// 'networkidle' plus hero-h1/fonts-ready, before the client-side Texte&Notizen/Bilder&Medien fetches
// had necessarily painted and before below-the-fold lazy images had loaded -- producing a misleading
// "Wird geladen" capture in the worst case. This helper scrolls the full document to trigger any
// viewport-relative lazy loading, explicitly waits for every still-loading <img>, then returns to the
// top and lets layout settle before the caller takes its fullPage screenshot.
async function waitForSectionsSettled(page) {
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const viewportHeight = page.viewportSize()?.height ?? 800
  for (let y = 0; y < docHeight; y += viewportHeight) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForLoadState('networkidle')
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true })
              img.addEventListener('error', resolve, { once: true })
            }),
        ),
    ),
  )
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
}

const browser = await chromium.launch()
try {
  for (const [name, width, height] of viewports) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    const releaseRequests = []
    page.on('request', (request) => {
      if (/\/api\/v1\/anime\/[^/]+\/group\/[^/]+\/members\/[^/]+\/releases(?:[?]|$)/.test(request.url())) {
        releaseRequests.push(request.url())
      }
    })
    const consoleErrors = []
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })

    const resp = await page.goto(BASE + PATH_UNDER_TEST, {
      waitUntil: 'networkidle',
      timeout: 90000,
    })
    await page.locator('section[aria-label="Projekt-Mitwirkung"] h1').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await waitForSectionsSettled(page)

    const file = `${OUT}/${LABEL}-${name}.png`
    await page.screenshot({ path: file, fullPage: true })

    // Korrektur 5/5 -- Vergleichsaufnahme OHNE fullPage, am aktuellen Scrollpunkt (oben), um zu
    // pruefen, ob ein etwaiger Streifen nur im fullPage-Capture auftritt (Artefakt eines
    // fixed+100vh-Elements, das bei der Vollseiten-Aufnahme auf Dokumenthoehe skaliert) oder auch
    // in einer normalen Viewport-Aufnahme sichtbar ist (dann real, aber trotzdem ausserhalb der
    // Phase-157-Komponenten, falls es sich um AppShell-Chrome handelt).
    const viewportOnlyFile = `${OUT}/${LABEL}-${name}-viewport-only.png`
    await page.screenshot({ path: viewportOnlyFile, fullPage: false })

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

      // P157-13 -- Rollenfarbe MUSS an jedem Eintrag sichtbar bleiben. Seit Plan 157-10 traegt
      // NUR noch der Timeline-Punkt (.dot) die Farbe -- die frühere zweite Markierung
      // (border-inline-start-color) ist entfallen, deshalb wird hier die berechnete
      // Punkt-Hintergrundfarbe gelesen statt der jetzt neutralen Kartenkante.
      const noteAccentColorSamples = Array.from(document.querySelectorAll('[data-note-entry]')).map(
        (el) => {
          const dotEl = el.querySelector('[class*="dot"]')
          return {
            colorKey: el.getAttribute('data-color-key'),
            dotColor: dotEl ? getComputedStyle(dotEl).backgroundColor : null,
          }
        },
      )

      // Plan 157-10 -- Kartenrahmen muss auf allen vier Seiten gleich stark sein (kein zweiter
      // farbiger Rand mehr neben dem Punkt).
      const noteBorderUniformity = Array.from(document.querySelectorAll('[data-note-entry]')).map(
        (el) => {
          const cs = getComputedStyle(el)
          return { top: cs.borderTopWidth, inlineStart: cs.borderInlineStartWidth }
        },
      )

      // Plan 157-10 -- GAP-01: kein <button> und kein <a> darf innerhalb des Eintrags-Ankers
      // verschachtelt sein, auch wenn der Beitragstext selbst einen Link enthaelt.
      const noteNestedInteractiveViolations = Array.from(
        document.querySelectorAll('[data-note-entry] a'),
      ).filter((a) => a.querySelector('a, button')).length

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

      // Korrektur 5/5 -- konkreter Beweis statt erneuter Vermutung: was rendert TATSAECHLICH an
      // x=4 (innerhalb des gemeldeten x~0-8px-Bereichs)? elementFromPoint arbeitet in aktuellen
      // Viewport-Koordinaten; da .edgeStrip `position: fixed` ist, ist das Ergebnis unabhaengig
      // vom Scroll-Offset identisch.
      const stripeProbeY = Math.min(200, window.innerHeight - 10)
      const elAtStripe = document.elementFromPoint(4, stripeProbeY)
      const elementAtStripePoint = elAtStripe
        ? {
            tagName: elAtStripe.tagName,
            className:
              typeof elAtStripe.className === 'string' ? elAtStripe.className : String(elAtStripe.className),
            ariaLabel: elAtStripe.getAttribute('aria-label'),
            role: elAtStripe.getAttribute('role'),
            backgroundColor: getComputedStyle(elAtStripe).backgroundColor,
            backgroundImage: getComputedStyle(elAtStripe).backgroundImage,
          }
        : null

      const edgeStripEl = document.querySelector('[aria-label="Menü öffnen"]')
      const edgeStripDiagnostics = edgeStripEl
        ? (() => {
            const rect = edgeStripEl.getBoundingClientRect()
            const cs = getComputedStyle(edgeStripEl)
            return {
              found: true,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              position: cs.position,
              backgroundImage: cs.backgroundImage,
              borderRight: cs.borderRight,
              // Wenn rect.height ~= window.innerHeight (statt document.scrollHeight), ist das der
              // Beweis: das Element ist im NORMALEN Viewport genau einen Viewport hoch (100vh),
              // nicht dokumenthoch -- der Vollseiten-Screenshot-Prozess vergroessert den
              // effektiven Viewport auf Dokumenthoehe, wodurch 100vh sich auf Dokumenthoehe
              // umrechnet und das Element im fullPage-Capture ueber die GESAMTE Seite reicht.
              matchesViewportHeight: Math.abs(rect.height - window.innerHeight) < 2,
              matchesDocumentHeight:
                Math.abs(rect.height - document.documentElement.scrollHeight) < 2,
            }
          })()
        : { found: false }

      const drawerEl = document.querySelector('[aria-label="Team4s Navigation"]')
      const drawerDiagnostics = drawerEl
        ? {
            hasOpenClass: /drawerOpen/.test(drawerEl.className),
            transform: getComputedStyle(drawerEl).transform,
          }
        : null

      return {
        heroHeight: h(heroSection),
        contentTop: notes ? Math.round(notes.getBoundingClientRect().top) : null,
        heroMetrics: heroSection?.querySelector('dl')?.textContent ?? null,
        heroArtworkLoaded: Boolean(heroSection?.querySelector('[class*="artwork"] img')?.naturalWidth),
        heroActionsInBounds: heroSection ? Array.from(heroSection.querySelectorAll('a')).every((el) => {
          const rect = el.getBoundingClientRect()
          return rect.left >= 0 && rect.right <= innerWidth && rect.height >= 36
        }) : false,
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
        noteBorderUniformity,
        noteNestedInteractiveViolations,
        mediaAllShownTextPresent,
        releasesEmptyStateText,
        releasesText: releasesText.slice(0, 200),
        elementAtStripePoint,
        edgeStripDiagnostics,
        drawerDiagnostics,
        windowInnerHeight: window.innerHeight,
        documentScrollHeight: document.documentElement.scrollHeight,
      }
    })

    facts.releaseRequests = releaseRequests
    if (facts.releasesSectionHeight !== null || facts.buttonLabels.some((label) => /Release/.test(label)) || /Release/.test(facts.heroMetrics) || releaseRequests.length) {
      throw new Error(`Project member release history must be absent: ${JSON.stringify(facts)}`)
    }
    facts.notePreviews = await page.locator('[data-note-entry] [class*="bodyClamped"]').evaluateAll((bodies) => bodies.map((body) => ({
      height: body.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(body).lineHeight),
      overflow: body.scrollHeight > body.clientHeight,
      hasToggle: Boolean(body.parentElement.querySelector('button[aria-expanded="false"]')),
    })))
    if (facts.notePreviews.some((note) => note.height > 3 * note.lineHeight + 1 || note.overflow !== note.hasToggle)) {
      throw new Error(`Inconsistent note preview at ${name}: ${JSON.stringify(facts.notePreviews)}`)
    }
    if (facts.noteBorderUniformity.some((b) => b.top !== b.inlineStart)) {
      throw new Error('Card border is not uniform -- a second colored edge may still be present: ' + JSON.stringify(facts.noteBorderUniformity))
    }
    if (facts.noteNestedInteractiveViolations > 0) {
      throw new Error(`Nested interactive markup found inside a note entry link at ${name}: ${facts.noteNestedInteractiveViolations} violation(s)`)
    }
    const expandableNote = page.locator('[data-note-entry]').filter({ has: page.getByRole('button', { name: 'Mehr anzeigen', exact: true }) }).first()
    if (await expandableNote.count()) {
      const beforeHeight = await expandableNote.locator('[class*="bodyClamped"]').evaluate((body) => body.getBoundingClientRect().height)
      await expandableNote.getByRole('button', { name: 'Mehr anzeigen', exact: true }).click()
      // The row no longer matches the collapsed filter after clicking; identify the expanded row.
      const expandedNote = page.locator('[data-note-entry]').filter({ has: page.getByRole('button', { name: 'Weniger anzeigen', exact: true }) }).first()
      const expandedHeight = await expandedNote.locator('[id]').evaluate((body) => ({ height: body.getBoundingClientRect().height, unclipped: body.scrollHeight <= body.clientHeight + 1 }))
      if (!expandedHeight.unclipped || expandedHeight.height <= beforeHeight || page.url() !== BASE + PATH_UNDER_TEST) {
        throw new Error(`Note expansion failed: ${JSON.stringify(expandedHeight)}`)
      }
      await expandedNote.getByRole('button', { name: 'Weniger anzeigen', exact: true }).click()
      const collapsedHeight = await expandableNote.locator('[class*="bodyClamped"]').evaluate((body) => body.getBoundingClientRect().height)
      if (Math.abs(collapsedHeight - beforeHeight) > 1) throw new Error('Note did not return to its preview height')
      facts.noteToggle = { beforeHeight, expandedHeight: expandedHeight.height, collapsedHeight }
      await page.evaluate(() => scrollTo(0, 0))
    }
    const normalConsoleErrors = [...consoleErrors]
    if (process.env.SHOT_VERIFY_HERO === '1') {
      if (facts.horizontalOverflow || !facts.heroActionsInBounds || facts.statBarEntryCount !== 0 || facts.summaryBandText !== null) {
        throw new Error(`Hero layout regression at ${name}: ${JSON.stringify(facts)}`)
      }
      if (facts.contentTop > (width < 600 ? 530 : 440)) {
        throw new Error(`Contribution content starts too late at ${name}: ${facts.contentTop}px`)
      }
    }
    if (process.env.SHOT_VERIFY_HERO === '1' && name === 'desktop') {
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
      const accessibility = await page.evaluate(async () => {
        const result = await window.axe.run(document.querySelector('section[aria-label="Projekt-Mitwirkung"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
        })
        return result.violations.map(({ id, description }) => ({ id, description }))
      })
      if (accessibility.length) throw new Error(JSON.stringify(accessibility))
      facts.heroAccessibilityViolations = accessibility
      const normalErrorCount = consoleErrors.length
      await page.route('**/_next/image*', (route) => route.abort())
      await page.reload({ waitUntil: 'networkidle' })
      await page.locator('section[aria-label="Projekt-Mitwirkung"] [class*="artwork"] img').waitFor({ state: 'detached' })
      facts.failedArtworkFallsBackToNeutral = await page.locator('section[aria-label="Projekt-Mitwirkung"] a').count() === 2
      if (!facts.failedArtworkFallsBackToNeutral) throw new Error('Artwork failure removed hero actions')
      await page.screenshot({ path: `${OUT}/${LABEL}-neutral.png`, fullPage: false })
      facts.expectedImageFailureErrors = consoleErrors.splice(normalErrorCount)
      facts.containerChecks = []
      for (const containerWidth of [320, 767, 768, 769]) {
        const geometry = await page.evaluate((targetWidth) => {
          const hero = document.querySelector('section[aria-label="Projekt-Mitwirkung"]')
          hero.style.width = `${targetWidth}px`
          hero.querySelector('h1').textContent = 'SehrLangerZusammenhängenderMembernameFürLayoutprüfung'
          hero.querySelector('p').textContent = 'Ein besonders langer Projektname mit mehreren Wörtern · Eine unabhängige Fansub-Gruppe'
          hero.querySelector('[data-role-code]').textContent = 'Qualitätsprüfung und technische Nachkontrolle'
          if (hero.querySelectorAll('[data-role-code]').length === 1) {
            const extraRole = hero.querySelector('[data-role-code]').cloneNode(true)
            extraRole.textContent = 'Übersetzung'
            hero.querySelector('[data-role-code]').parentElement.append(extraRole)
          }
          for (const [index, dd] of Array.from(hero.querySelectorAll('dd')).entries()) {
            dd.textContent = ['12.345 Folgen', '123.456 Beiträge', '1.234 Medien'][index]
          }
          const bounds = hero.getBoundingClientRect()
          const outside = Array.from(hero.querySelectorAll('a,h1,p,dd,[data-role-code]')).filter((node) => {
            const rect = node.getBoundingClientRect()
            return rect.left < bounds.left || rect.right > bounds.right || node.scrollWidth > node.clientWidth + 1
          }).map((node) => node.textContent)
          return {
            containerWidth: bounds.width,
            viewportWidth: innerWidth,
            detailsColumn: getComputedStyle(hero.querySelector('[class*="details"]')).gridColumnStart,
            overflow: document.documentElement.scrollWidth > innerWidth,
            outside,
          }
        }, containerWidth)
        if (geometry.outside.length || geometry.overflow) throw new Error(JSON.stringify(geometry))
        if (geometry.detailsColumn !== (containerWidth < 768 ? '1' : '2')) throw new Error(`Container query inactive: ${JSON.stringify(geometry)}`)
        facts.containerChecks.push(geometry)
      }
      await page.screenshot({ path: `${OUT}/${LABEL}-embedded-long-labels.png`, fullPage: false })
      // 1440px at 200% browser zoom has the same 720 CSS-pixel reflow width.
      await page.setViewportSize({ width: 720, height: 450 })
      await page.evaluate(() => {
        document.querySelector('section[aria-label="Projekt-Mitwirkung"]').style.width = ''
      })
      facts.zoomReflowOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      if (facts.zoomReflowOverflow) throw new Error('200% equivalent reflow overflow')
    }
    console.log(
      JSON.stringify(
        {
          viewport: name,
          status: resp && resp.status(),
          file,
          viewportOnlyFile,
          facts,
          consoleErrors: normalConsoleErrors,
        },
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
