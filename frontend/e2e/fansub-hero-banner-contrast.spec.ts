import { test, expect, type Locator, type Page } from '@playwright/test'
import sharp from 'sharp'

/**
 * Empirischer WCAG-AA-Nachweis für den Fansub-Hero-Scrim gegen die echte, laufende App (Live-
 * UAT-Befund: ein früherer Verlauf war erst ab 30% der Textblock-Höhe ausreichend deckend, der
 * davor existierende CSS-Test prüfte aber nur den Endwert des Verlaufs und konnte das nicht
 * erkennen). Dieser Test rendert zwei reale Fansub-Profile mit nachweislich HELLEM Bannerfoto
 * (per vorheriger DB-/Bildanalyse ermittelt, siehe `HERO_CASES` unten für die genaue
 * Auswahlbegründung) und misst die TATSÄCHLICH gerenderten Pixel direkt hinter Titel,
 * Status-Badge, Gründungszeile, Kennzahlen UND den Hero-Link-Pills (`.heroChip`) -- exakt am
 * oberen Rand des Textblocks, wo der frühere Verlauf am schwächsten war, statt nur dessen
 * rechnerischen Endwert zu wiederholen.
 *
 * Methodik: Für jedes gemessene Element wird die vom Browser TATSÄCHLICH angewendete Textfarbe
 * per `getComputedStyle` gelesen (deterministisch, kein Rätselraten) -- INKLUSIVE Alpha-Kanal,
 * der vor der Kontrastberechnung gegen den gemessenen Hintergrund komponiert wird (Subtitle und
 * Kennzahl-Bezeichnung sind im Banner-Fall bewusst teiltransparent, siehe `parseComputedColor`).
 * Der tatsächlich komponierte Hintergrund wird per Screenshot des Element-Ausschnitts +
 * häufigster (quantisierter) Farbe darin geschätzt -- robust gegenüber den wenigen,
 * kantengeglätteten Textrand-Pixeln, solange die Hintergrundfläche (wie hier) größer ist als die
 * dünnen Glyphenstriche selbst. Für Status-Badge und Link-Pill ist das bewusst die CHIP-eigene,
 * auf dem Scrim aufliegende Fläche (nicht der rohe Scrim), weil der Text optisch auf dieser
 * Fläche liegt.
 */

const WCAG_AA_NORMAL_TEXT = 4.5
type RGB = [number, number, number]

function luminance([r, g, b]: RGB): number {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: RGB, b: RGB): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

function mix(foreground: RGB, background: RGB, alpha: number): RGB {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as RGB
}

/**
 * Parst eine von `getComputedStyle` zurückgegebene Farbe INKLUSIVE Alpha. Browser liefern
 * `rgb(r, g, b)` für opake und `rgba(r, g, b, a)` für teiltransparente Farben -- Subtitle
 * (`rgba(255, 255, 255, 0.88)`) und Kennzahl-Bezeichnung (`rgba(255, 255, 255, 0.82)`) im
 * Banner-Fall sind BEWUSST teiltransparent (siehe FansubHeroSection.accessibility.test.ts). Ein
 * Verwerfen des Alpha-Kanals würde sie fälschlich als deckendes Weiß behandeln und könnte einen
 * echten Kontrastregressionsfall (z. B. ein versehentlich erhöhter Alpha-Wert) grün melden, da
 * nur `rgb` statt der tatsächlich gerenderten, mit dem Hintergrund gemischten Farbe geprüft
 * würde.
 */
function parseComputedColor(css: string): { rgb: RGB; alpha: number } {
  const match = css.match(/rgba?\(([^)]+)\)/)
  if (!match) throw new Error(`Nicht parsebare computed-style-Farbe: ${css}`)
  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()))
  const alpha = parts.length >= 4 ? parts[3] : 1
  return { rgb: [parts[0], parts[1], parts[2]], alpha }
}

/** Häufigste (auf 8er-Schritte quantisierte) Farbe innerhalb eines Screenshot-Ausschnitts. */
async function dominantColor(buffer: Buffer): Promise<RGB> {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  const counts = new Map<string, { count: number; rgb: RGB }>()
  for (let i = 0; i < data.length; i += info.channels) {
    const rgb: RGB = [data[i], data[i + 1], data[i + 2]]
    const key = rgb.map((channel) => Math.round(channel / 8)).join('-')
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { count: 1, rgb })
  }
  let best: { count: number; rgb: RGB } | null = null
  for (const value of counts.values()) {
    if (!best || value.count > best.count) best = value
  }
  if (!best) throw new Error('Leerer Screenshot-Ausschnitt -- keine Pixel zum Auswerten.')
  return best.rgb
}

interface Measurement {
  label: string
  ratio: number
  foreground: RGB
  background: RGB
  topOffsetFromBlockPx: number
}

/**
 * Misst ein einzelnes Textelement: computed-style-Textfarbe (Vordergrund) gegen die häufigste
 * Farbe im Element-Screenshot (Hintergrund). `blockTop` ist die Y-Koordinate des Textblock-
 * Containers (`.heroBodyOnBanner`) -- der zurückgegebene `topOffsetFromBlockPx` belegt, dass die
 * Messung tatsächlich nah am oberen Rand dieses Blocks liegt (dort, wo der frühere Verlauf am
 * schwächsten war), statt zufällig irgendwo im unteren, längst unproblematischen Bereich.
 */
async function measure(label: string, locator: Locator, blockTop: number): Promise<Measurement> {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) throw new Error(`${label}: Element ist nicht sichtbar / hat keine Bounding Box.`)

  const screenshot = await locator.screenshot()
  const background = await dominantColor(screenshot)
  const colorCss = await locator.evaluate((el) => getComputedStyle(el).color)
  const { rgb: foregroundRgb, alpha: foregroundAlpha } = parseComputedColor(colorCss)
  // Teiltransparenter Text wird VOR der Kontrastberechnung gegen den gemessenen Hintergrund
  // komponiert -- sonst würde z. B. `rgba(255,255,255,0.82)` fälschlich wie deckendes Weiß
  // bewertet, das stets maximalen Kontrast gegen jeden dunklen Hintergrund ergibt.
  const foreground = foregroundAlpha < 1 ? mix(foregroundRgb, background, foregroundAlpha) : foregroundRgb

  return {
    label,
    ratio: contrast(foreground, background),
    foreground,
    background,
    topOffsetFromBlockPx: box.y - blockTop,
  }
}

function formatRgb(rgb: RGB): string {
  return `rgb(${rgb.map((c) => Math.round(c)).join(', ')})`
}

interface HeroCase {
  slug: string
  label: string
  statusText: string
  subtitleText: string
  linkText: string
}

/**
 * Die zwei hellsten von sieben Fansub-Gruppen mit echtem Bannerfoto, die ZUGLEICH einen echten
 * Hero-Link (`.heroChip`) besitzen -- von den sieben bannerten Gruppen haben nur `new-subs` und
 * `ls-subs` einen hinterlegten Website-Link, Link-Pills gehören laut Abnahmevorgabe zur
 * Pflicht-Messreihe. `bloody-shadow` (~68% Leuchtdichte, eigentlich die zweithellste Gruppe)
 * hat KEINEN Link und schied deshalb aus; `ls-subs` ist mit ~64,5% die hellste der verbleibenden
 * fünf Gruppen MIT Link (per Sharp-Leuchtdichte-Analyse der tatsächlich auf der DB hinterlegten
 * Bilddateien ermittelt, siehe Bericht). `new-subs` bleibt zusätzlich der kontrastkritischste
 * Badge-Pfad (Status "aufgelöst" -- variant="muted" nutzt einen teiltransparenten statt opaken
 * Chip).
 */
const HERO_CASES: HeroCase[] = [
  {
    slug: 'new-subs',
    label: 'New-Subs (hellstes Bannerfoto, ~89% Leuchtdichte, Status "aufgelöst")',
    statusText: 'aufgelöst',
    subtitleText: '2012 bis 2015 • Deutschland',
    linkText: 'Webseite',
  },
  {
    slug: 'ls-subs',
    label: 'LS-SUBS (hellstes Bannerfoto MIT Hero-Link, ~64,5% Leuchtdichte, Status "aktiv")',
    statusText: 'aktiv',
    subtitleText: 'gegründet 2011 • Deutschland',
    linkText: 'Webseite',
  },
]

async function measureHero(page: Page, heroCase: HeroCase): Promise<Measurement[]> {
  await page.goto(`/fansubs/${heroCase.slug}`)
  const hero = page.locator('#hero')
  await expect(hero).toBeVisible()

  // `.heroBodyOnBanner` ist der Textblock-Container, dessen Scrim geprüft wird (CSS-Modul-
  // Klassenname wird zu `page_heroBodyOnBanner__<hash>` gehasht -- Teilstring-Match ist hier die
  // etablierte, stabile Art, eine reine Struktur-/Layout-Klasse ohne eigenen Text zu adressieren).
  const textBlock = hero.locator('[class*="heroBodyOnBanner"]')
  const textBlockBox = await textBlock.boundingBox()
  if (!textBlockBox) throw new Error(`${heroCase.slug}: .heroBodyOnBanner nicht sichtbar.`)

  const title = hero.getByRole('heading', { level: 1 })
  const badge = hero.getByText(heroCase.statusText, { exact: true })
  const subtitle = hero.getByText(heroCase.subtitleText, { exact: true })
  const metricLabel = hero.locator('dt').first()
  const metricValue = hero.locator('dd').first()
  const link = hero.getByRole('link', { name: heroCase.linkText })

  return [
    await measure('Titel (Gruppenname)', title, textBlockBox.y),
    await measure(`Status-Badge ("${heroCase.statusText}")`, badge, textBlockBox.y),
    await measure('Gründungszeile', subtitle, textBlockBox.y),
    await measure('Kennzahl-Bezeichnung', metricLabel, textBlockBox.y),
    await measure('Kennzahl-Wert', metricValue, textBlockBox.y),
    await measure(`Link-Pill ("${heroCase.linkText}")`, link, textBlockBox.y),
  ]
}

test.describe('Fansub-Hero-Scrim: realer, positionsabhängiger Kontrast gegen echte helle Bannerfotos', () => {
  for (const heroCase of HERO_CASES) {
    test(`${heroCase.label}: Titel/Badge/Gründungszeile/Kennzahlen/Link-Pills erreichen WCAG AA direkt am oberen Rand des Textblocks`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      const measurements = await measureHero(page, heroCase)

      for (const measurement of measurements) {
        console.log(
          `[${heroCase.slug}] ${measurement.label}: Vordergrund ${formatRgb(measurement.foreground)}, ` +
            `Hintergrund ${formatRgb(measurement.background)}, Kontrast ${measurement.ratio.toFixed(2)}:1, ` +
            `Abstand zum oberen Blockrand ${measurement.topOffsetFromBlockPx.toFixed(1)}px`,
        )
      }

      // Die kritischste Messung (Titel) muss NAH am oberen Rand des Textblocks liegen -- genau
      // dort, wo der frühere Verlauf (0% transparent bis 30% Boxhöhe) am schwächsten war. Ein
      // großer Abstand würde bedeuten, dass versehentlich eine unkritische, tiefer liegende
      // Stelle gemessen wurde statt des tatsächlich beanstandeten oberen Bereichs.
      const titleMeasurement = measurements[0]
      expect(
        titleMeasurement.topOffsetFromBlockPx,
        'Titel muss nah am oberen Rand des Textblocks liegen, sonst wird nicht die kritische Stelle geprüft',
      ).toBeLessThanOrEqual(40)

      for (const measurement of measurements) {
        expect(
          measurement.ratio,
          `${heroCase.slug} / ${measurement.label}: Kontrast ${measurement.ratio.toFixed(2)}:1 unterschreitet WCAG AA (4,5:1)`,
        ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT)
      }
    })
  }
})
