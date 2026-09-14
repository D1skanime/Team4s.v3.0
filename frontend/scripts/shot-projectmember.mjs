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
import { runHeroVerification, runSectionHeaderRowAlignmentCheck } from './lib/shotHelpers.mjs'

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

// Plan 157-11 (GAP-02): the previous fullPage capture ran right after 'networkidle' plus
// hero-h1/fonts-ready, before client fetches and below-the-fold lazy images had necessarily
// painted/loaded. This scrolls through the document to trigger lazy loading, waits for every
// still-loading <img>, then returns to the top and settles layout before the caller screenshots.
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
      // 157-13 (GAP-02 V4, Entscheid 2026-09-14): the timeline LINE must carry the same
      // per-entry role color as the dot. lineColor reads the .entry::before pseudo-element's
      // computed background directly off the SAME element data-color-key/dotColor above already
      // derive from -- both read the identical var(--role-accent) inheritance chain.
      const noteAccentColorSamples = Array.from(document.querySelectorAll('[data-note-entry]')).map(
        (el) => {
          const dotEl = el.querySelector('[class*="dot"]')
          return {
            colorKey: el.getAttribute('data-color-key'),
            dotColor: dotEl ? getComputedStyle(dotEl).backgroundColor : null,
            lineColor: getComputedStyle(el, '::before').backgroundColor,
          }
        },
      )

      // 157-13 (GAP-02 V3): the dot must be measurably larger than the pre-plan 6px baseline and
      // must not overflow the card edge on mobile at 390px -- dotOverflow is a separate boolean
      // fact (not baked into dotSizes) so the mobile-only throwing check below stays independent
      // of viewport-agnostic size measurement.
      const dotEls = Array.from(document.querySelectorAll('[data-note-entry] [class*="dot"]'))
      const dotSizes = dotEls.map((el) => el.getBoundingClientRect().width)
      const dotOverflow = dotEls.some((el) => el.getBoundingClientRect().left < 0)

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

      // Plan 157-12 (GAP-02 V2) -- Kopfzeilen muessen ueber die globale SectionHeader-Primitive
      // mit dem Wein-Unterstrich rendern, nicht ueber ein lokales h2.
      const sectionHeaderUnderlines = Object.fromEntries(['Texte & Notizen', 'Bilder & Medien'].map((label) => [label, Boolean(Array.from(document.querySelectorAll('h2')).find((h) => h.textContent.trim() === label)?.closest('[class*="sectionHeaderUnderline"]'))]))

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

      // GAP-02 V6 (157-14): the separate narrow ProjectMemberStickyNav tab card must be fully
      // gone -- its metrics now live as clickable jump targets inside the hero itself.
      const stickyNavPresent = Boolean(document.querySelector('[class*="stickyNav"]'))

      return {
        stickyNavPresent,
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
        dotSizes,
        dotOverflow,
        noteBorderUniformity,
        noteNestedInteractiveViolations,
        mediaAllShownTextPresent,
        sectionHeaderUnderlines,
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
    if (facts.stickyNavPresent) {
      throw new Error(`ProjectMemberStickyNav duplicate tab card must be gone at ${name}: stickyNavPresent=${facts.stickyNavPresent}`)
    }
    if (Object.values(facts.sectionHeaderUnderlines).some((hasUnderline) => !hasUnderline)) throw new Error(`Section header underline missing at ${name}: ${JSON.stringify(facts.sectionHeaderUnderlines)}`)
    await runSectionHeaderRowAlignmentCheck(page, facts, name)
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
    // 157-13 (GAP-02 V4): the dot and its own entry's line must render the identical role-derived
    // color -- both read var(--role-accent) off the same element, unconditional on role count.
    if (facts.noteAccentColorSamples.some((sample) => sample.dotColor !== sample.lineColor)) {
      throw new Error(`Dot and line color diverge for at least one entry at ${name}: ${JSON.stringify(facts.noteAccentColorSamples)}`)
    }
    // Only when the live fixture actually exhibits 2+ distinct roles: prove the line color also
    // changes at the role boundary, not just the dot. Not fabricated for a single-role fixture.
    const distinctColorKeys = new Set(facts.noteAccentColorSamples.map((sample) => sample.colorKey))
    if (distinctColorKeys.size >= 2) {
      const lineColorsForDistinctRoles = new Set(
        Array.from(distinctColorKeys, (key) => facts.noteAccentColorSamples.find((sample) => sample.colorKey === key).lineColor),
      )
      if (lineColorsForDistinctRoles.size !== distinctColorKeys.size) {
        throw new Error(`Distinct-role entries do not render distinct line colors at ${name}: ${JSON.stringify(facts.noteAccentColorSamples)}`)
      }
    }
    // V3: the larger dot must not overflow the card edge on mobile at 390px.
    if (name === 'mobile' && facts.dotOverflow) {
      throw new Error(`Timeline dot overflows the left viewport edge at ${name}: ${JSON.stringify(facts.dotSizes)}`)
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
    // Plan 157-13: the SHOT_VERIFY_HERO=1 hero-layout/accessibility/container-query/zoom-reflow
    // pass moved to lib/shotHelpers.mjs (straight relocation, no behavior change) to keep this
    // file under the 450-line production cap while adding the GAP-02 V3/V4 diagnostics below.
    await runHeroVerification({ page, facts, name, width, require, consoleErrors, OUT, LABEL })
    // 157-14 (GAP-02 V6): live proof that clicking the hero's "Beiträge" jump metric really
    // scrolls the page -- not just that the button/aria-label exist, but that the click actually
    // moves #texte near the viewport top in a real browser.
    if (name === 'desktop') {
      const jumpButton = page.getByRole('button', { name: 'Zu Texte & Notizen springen' })
      if (await jumpButton.count()) {
        await jumpButton.click()
        await page.waitForTimeout(400)
        const texteTop = await page.evaluate(() => document.getElementById('texte').getBoundingClientRect().top)
        if (Math.abs(texteTop) > 100) {
          throw new Error(`Clicking the hero jump metric did not scroll #texte near the viewport top: texteTop=${texteTop}`)
        }
        await page.evaluate(() => scrollTo(0, 0))
      }
    }
    // Plan 157-11 (GAP-02): closes 157-UAT.md checklist point 9 (Browser-Zoom), previously
    // unverified -- an always-on, page-wide 200%-zoom-equivalent overflow check, reusing the same
    // 720x450 CSS-pixel equivalence used above for the hero-only, env-gated SHOT_VERIFY_HERO check.
    if (name === 'desktop') {
      await page.setViewportSize({ width: 720, height: 450 })
      await waitForSectionsSettled(page)
      const zoom200File = `${OUT}/${LABEL}-desktop-zoom200.png`
      await page.screenshot({ path: zoom200File, fullPage: true })
      const zoom200Overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      facts.zoom200Overflow = zoom200Overflow
      if (zoom200Overflow) {
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
        throw new Error(`Horizontal overflow at desktop-zoom200: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`)
      }
      await runSectionHeaderRowAlignmentCheck(page, facts, 'desktop-zoom200', 'sectionHeaderTitleRowAlignmentZoom200')
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
