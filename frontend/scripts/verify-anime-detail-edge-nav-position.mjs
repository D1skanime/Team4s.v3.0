// Live-Regressionsprüfung für die Randnavigation (Zurück/Weiter) auf der öffentlichen
// Anime-Detailseite: die absolut positionierte Randnavigation liegt im `Card
// variant="publicHero"`-Hero und muss sich am Rand DIESER Karte ausrichten, nicht an einem
// äußeren Wrapper mit eigenem Innenabstand. `Card.module.css` (.cardPublicHero) gibt dafür den
// Positionierungskontext vor -- dieses Skript misst das real gerenderte Layout im Browser (jsdom
// wendet keine echten Stylesheet-Regeln an, siehe ProjectMemberNotesSection.test.tsx), nach dem
// etablierten Muster aus verify-public-header-backdrop.mjs.
import { chromium } from 'playwright'

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000'
// Anime-ID 2 ("11eyes") liegt auf Seite 1 der Standardliste zwischen ID 8 und ID 3 -- echte
// Nachbarn aus der laufenden Dev-Datenbank, kein Mock.
const PATH = '/anime/2?grid_query=page%3D1%26per_page%3D5'
// Unterhalb 768px wechselt `.edgeNavigationOverlay` laut page.infoCard.module.css bewusst auf
// `position: relative` (normaler Textfluss nach der Hero-Karte) -- der Fund betrifft nur die
// absolut positionierte Desktop-Variante. Beide Breakpoints werden geprüft, aber mit je einer
// zum Breakpoint passenden Erwartung.
const VIEWPORTS = [
  { width: 1440, height: 900, label: 'desktop-1440x900', expectAbsolute: true },
  { width: 390, height: 844, label: 'mobil-390x844', expectAbsolute: false },
]

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const failures = []

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(`${BASE}${PATH}`, { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: /Vorheriger Anime/ }).waitFor({ timeout: 10000 })

    const measurement = await page.evaluate(() => {
      const heroCard = document.querySelector('[class*="cardPublicHero"]')
      const overlay = document.querySelector('[class*="edgeNavigationOverlay"]')
      const heroRect = heroCard.getBoundingClientRect()
      const overlayRect = overlay.getBoundingClientRect()
      return {
        heroTop: heroRect.top,
        overlayTop: overlayRect.top,
        cardPosition: getComputedStyle(heroCard).position,
        overlayPosition: getComputedStyle(overlay).position,
      }
    })

    const offset = measurement.overlayTop - measurement.heroTop
    if (measurement.cardPosition !== 'relative') {
      failures.push(`${viewport.label}: Card variant="publicHero" hat position:${measurement.cardPosition} statt relative`)
    }
    if (viewport.expectAbsolute) {
      if (measurement.overlayPosition !== 'absolute') {
        failures.push(`${viewport.label}: Randnavigation hat position:${measurement.overlayPosition} statt absolute`)
      }
      // Erwartet: Randnavigation liegt nahe --space-3 (12px) vom Kartenrand entfernt. Bei dem
      // gemeldeten Regressions-Fund hing sie stattdessen am äußeren `.heroWrapper` mit
      // padding-top --space-9 (80px) -- der Offset wäre dann rund 80px groesser.
      if (offset < 0 || offset > 40) {
        failures.push(`${viewport.label}: Randnavigation ${offset.toFixed(1)}px vom Kartenrand (erwartet 0-40px)`)
      }
    } else if (measurement.overlayPosition === 'absolute') {
      failures.push(`${viewport.label}: Randnavigation ist unerwartet absolut positioniert (Mobil-Breakpoint sollte Textfluss nutzen)`)
    }
    console.log(viewport.label, measurement, 'offset=' + offset.toFixed(1) + 'px')
  }

  await browser.close()
  if (failures.length) {
    console.error('FAIL\n' + failures.join('\n'))
    process.exitCode = 1
  } else {
    console.log('PASS: Randnavigation richtet sich am Hero-Kartenrand aus (Desktop absolut, Mobil im Textfluss).')
  }
}

main()
