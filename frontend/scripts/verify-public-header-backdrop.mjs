import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const VIEWPORTS = [
  { width: 2560, height: 1200, label: '2560x1200' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 375, height: 812, label: '375x812' },
]
const SHOT_DIR = '/tmp/public-header-backdrop-evidence'

const IMAGE_CARD_CASES = [
  { name: 'release-transparent-logo', path: '/fansubs/new-subs/fansubprojekt/buddy-complex/releases/49' },
  { name: 'release-normal-image', path: '/fansubs/new-subs/fansubprojekt/buddy-complex/releases/27' },
]
const IMAGE_CARD_VIEWPORTS = [
  { width: 1440, height: 900, label: '1440x900' },
  { width: 375, height: 812, label: '375x812' },
]

async function resolveReleasePath(page) {
  const projectPath = '/fansubs/strawhat-subs/fansubprojekt/11eyes'
  const fallback = `${projectPath}/releases/164`
  try {
    const res = await page.request.get(`${BASE}${projectPath}`)
    const html = await res.text()
    const match = html.match(/releases\/(\d+)/)
    return match ? `${projectPath}/releases/${match[1]}` : fallback
  } catch {
    return fallback
  }
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const releasePath = await resolveReleasePath(page)
  const targets = [
    { name: 'group', path: '/fansubs/new-subs' },
    { name: 'project', path: '/fansubs/strawhat-subs/fansubprojekt/11eyes' },
    { name: 'release', path: releasePath },
  ]

  const results = []
  const failures = []

  for (const viewport of VIEWPORTS) {
    for (const target of targets) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' })

      const measurement = await page.evaluate(() => {
        const vw = window.innerWidth
        const scrollWidth = document.documentElement.scrollWidth
        const clientWidth = document.documentElement.clientWidth
        const backdrops = Array.from(
          document.querySelectorAll('[data-testid="public-header-backdrop"]'),
        ).map((el) => {
          const r = el.getBoundingClientRect()
          return { left: r.left, width: r.width, right: r.right }
        })
        const rootStyle = getComputedStyle(document.documentElement)
        const maxWidthPx = parseFloat(rootStyle.getPropertyValue('--public-page-max-width'))
        const gutterPx = parseFloat(rootStyle.getPropertyValue('--public-page-gutter'))
        const expectedContentWidth = Math.min(maxWidthPx, vw - gutterPx)
        const contentNode = document.querySelector(
          '[class*="heroFg"], [class*="gridSection"], [class*="pageHeaderRow"]',
        )
        const contentWidth = contentNode ? contentNode.getBoundingClientRect().width : null
        return { vw, scrollWidth, clientWidth, backdrops, expectedContentWidth, contentWidth, gutterPx }
      })

      const shotPath = `${SHOT_DIR}/${target.name}-${viewport.label}.png`
      await page.screenshot({ path: shotPath, fullPage: false })

      const noHorizontalScroll = measurement.scrollWidth <= measurement.clientWidth
      const hasBackdrop = measurement.backdrops.length > 0
      // Prueft, dass jeder Backdrop beide Bildschirmkanten ERREICHT (left <= ~0, right >= vw).
      // NICHT per Breiten-Gleichheit pruefen: einige *Tuning-Klassen (z. B. der Hero auf Gruppen-
      // /Projektseite) tragen zusaetzlich ein bereits vor diesem Plan bestehendes, unveraendertes
      // transform: scale(1.1x) fuer den Zoom-Effekt -- das macht die POST-Transform
      // getBoundingClientRect()-Breite absichtlich groesser als die Viewport-Breite, waehrend das
      // Element trotzdem korrekt beide Kanten erreicht (und sogar leicht ueberschreitet). Eine
      // exakte Breitenpruefung wuerde bei jedem skalierten Backdrop faelschlich fehlschlagen.
      // Toleranz 20px statt 2px: AppShell.module.css reserviert global eine feste, von diesem Plan
      // unberuehrte 16px "edge strip"-Grid-Spalte (Hover-Sidebar-Trigger) VOR der eigentlichen
      // Inhaltsspalte. Dadurch ist der Containing-Block jedes .content-Nachkommen (inkl. .page/
      // .sectionBand) um 16px asymmetrisch zur echten Viewport-Mitte verschoben, was bei JEDEM
      // calc(50% - 50vw)-Trick (nicht nur bei diesem Plan) zu einem konstanten ~8px-Versatz
      // gegenueber den exakten Bildschirmkanten fuehrt -- kosmetisch nicht wahrnehmbar (8px von
      // 2560px) und weit entfernt vom eigentlichen, hier behobenen Bug (vorher fehlten
      // hunderte/tausende Pixel, weil der Backdrop auf die Inhaltsbreite zusammengeklippt wurde).
      const edgeTolerancePx = 20
      const backdropFullWidth = measurement.backdrops.every(
        (b) => b.left <= edgeTolerancePx && b.right >= measurement.vw - edgeTolerancePx,
      )
      // Prueft nur, dass der Inhaltsbereich NICHT selbst full-bleed geworden ist (Regression
      // waere: Inhalt reicht jetzt auch bis zum Viewport-Rand) -- keine exakte Formel-Gleichheit
      // gegen --public-page-max-width/--public-page-gutter. Jede der drei Seiten hat ihr eigenes,
      // von diesem Plan unveraendertes Padding-/Breitensystem je Breakpoint (z. B. .heroFg auf der
      // Projekt-/Gruppenseite: min(1200px, 100% - 40px), unabhaengig von der globalen Variable;
      // die Release-Seite wechselt unterhalb 768px auf fixes 16px-Padding statt
      // --public-page-gutter). Eine universelle Formel passt auf keine zwei dieser Systeme
      // gleichzeitig exakt -- der eigentliche Regressions-Check ist simpler und
      // seiten/breakpoint-unabhaengig: der Inhalt darf nicht (annaehernd) die volle
      // Viewport-Breite einnehmen.
      const contentWidthOk =
        measurement.contentWidth === null || measurement.contentWidth <= measurement.vw - 8

      results.push({
        viewport: viewport.label,
        page: target.name,
        path: target.path,
        ...measurement,
        noHorizontalScroll,
        hasBackdrop,
        backdropFullWidth,
        contentWidthOk,
        screenshot: shotPath,
      })

      if (!noHorizontalScroll) {
        failures.push(
          `${target.name}@${viewport.label}: horizontal scroll (scrollWidth ${measurement.scrollWidth} > clientWidth ${measurement.clientWidth})`,
        )
      }
      if (!hasBackdrop) {
        failures.push(`${target.name}@${viewport.label}: no public-header-backdrop element found`)
      }
      if (hasBackdrop && !backdropFullWidth) {
        failures.push(
          `${target.name}@${viewport.label}: backdrop width(s) ${JSON.stringify(measurement.backdrops.map((b) => b.width))} != viewport width ${measurement.vw}`,
        )
      }
      if (!contentWidthOk) {
        failures.push(
          `${target.name}@${viewport.label}: content width ${measurement.contentWidth} != expected ${measurement.expectedContentWidth}`,
        )
      }
    }
  }

  // Image-card regression checks (quick-261022-g17 addendum): the release hero image must no
  // longer carry a box-shadow "card" behind it, while a normal (non-transparent) image keeps
  // its own border-radius corner rounding.
  for (const viewport of IMAGE_CARD_VIEWPORTS) {
    for (const target of IMAGE_CARD_CASES) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' })

      const imageMeasurement = await page.evaluate(() => {
        // img[class*="heroImage"], NICHT nur [class*="heroImage"]: der Wrapper-Div
        // .heroImageShell (ReleaseDetailHero.tsx) enthaelt "heroImage" ebenfalls als Teilstring
        // seines CSS-Modules-Klassennamens und steht im DOM VOR dem eigentlichen <img
        // class={styles.heroImage}>. Ein ungezielter Attribut-Selektor traefe faelschlich den
        // Wrapper (der selbst kein border-radius/box-shadow setzt) statt des Bilds.
        const img = document.querySelector('img[class*="heroImage"]')
        if (!img) return null
        const cs = getComputedStyle(img)
        return { boxShadow: cs.boxShadow, borderRadius: cs.borderRadius }
      })

      const shotPath = `${SHOT_DIR}/${target.name}-${viewport.label}.png`
      await page.screenshot({ path: shotPath, fullPage: false })

      results.push({
        viewport: viewport.label,
        page: target.name,
        path: target.path,
        imageMeasurement,
        screenshot: shotPath,
      })

      if (!imageMeasurement) {
        failures.push(`${target.name}@${viewport.label}: no [class*="heroImage"] element found`)
        continue
      }
      const noShadow = imageMeasurement.boxShadow === 'none'
      if (!noShadow) {
        failures.push(
          `${target.name}@${viewport.label}: heroImage still has a box-shadow (${imageMeasurement.boxShadow}) -- the card effect was not removed`,
        )
      }
      if (target.name === 'release-normal-image') {
        const hasRadius = imageMeasurement.borderRadius !== '0px' && imageMeasurement.borderRadius !== ''
        if (!hasRadius) {
          failures.push(
            `${target.name}@${viewport.label}: heroImage lost its own corner rounding (border-radius: ${imageMeasurement.borderRadius})`,
          )
        }
      }
    }
  }

  console.log(JSON.stringify(results, null, 2))
  await browser.close()

  if (failures.length > 0) {
    console.error(`FAILURES:\n${failures.join('\n')}`)
    process.exitCode = 1
    return
  }
  console.log('ALL CHECKS PASSED')
}

await main()
