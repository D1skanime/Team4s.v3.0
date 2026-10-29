import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Deterministischer Worst-Case-Kontrastnachweis für den Fansub-Hero-Banner (UAT-Befund 2): wenn
 * ein Bannerfoto vorhanden ist, blendet `FansubHeroSection` einen zusätzlichen dunklen Scrim
 * (`.heroBodyOnBanner::before`) hinter Titel/Subtitle/HeroMetrics ein, dessen Opazität so bemessen
 * ist, dass selbst ein rein weißes (also denkbar hellstes) Bannerfoto den Text nicht unlesbar
 * macht. Muster exakt wie `src/lib/roleCatalog.accessibility.test.ts`: lokale Helfer rechnen die
 * echten, per Regex aus dem realen CSS-Text extrahierten Formeln nach -- kein jsdom-Rendering
 * (jsdom kann Verläufe/Bilder ohnehin nicht zuverlässig für color-contrast auswerten).
 */

const pageCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/fansubs/[slug]/page.module.css'),
  'utf8',
)
const heroMetricsCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/ui/HeroMetrics.module.css'),
  'utf8',
)

type RGB = [number, number, number]
const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [0, 0, 0]

function hexRgb(hex: string): RGB {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as RGB
}

function mix(foreground: RGB, background: RGB, alpha: number): RGB {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as RGB
}

function luminance(rgb: RGB): number {
  const channels = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: RGB, b: RGB): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Extrahiert die Scrim-Opazität aus der mittleren/unteren rgba(10, 8, 14, <ALPHA>)-Stelle der
 *  `.heroBodyOnBanner::before`-background-Regel. */
function extractScrimAlpha(): number {
  const match = pageCss.match(/\.heroBodyOnBanner::before\s*\{[^}]*rgba\(10,\s*8,\s*14,\s*([\d.]+)\)\s*30%/)
  expect(match, '.heroBodyOnBanner::before must declare a mid-stop rgba(10, 8, 14, <alpha>) scrim').not.toBeNull()
  return Number(match![1])
}

/** Extrahiert eine Farbe (opak #hex ODER rgba(255,255,255,<alpha>)) aus einer benannten
 *  CSS-Deklaration innerhalb eines gegebenen Selektor-Blocks. */
function extractColorFromRule(cssText: string, selector: string, property: string): { rgb: RGB; alpha: number } {
  const selectorRegex = new RegExp(`${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const block = cssText.match(selectorRegex)
  expect(block, `${selector} must exist in the stylesheet`).not.toBeNull()
  const propRegex = new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6}|rgba\\([^)]+\\));`)
  const propMatch = block![1].match(propRegex)
  expect(propMatch, `${selector} must declare ${property}`).not.toBeNull()
  const value = propMatch![1]

  if (value.startsWith('#')) {
    return { rgb: hexRgb(value), alpha: 1 }
  }

  const rgbaMatch = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
  expect(rgbaMatch, `${selector} ${property} must be a parseable rgba()`).not.toBeNull()
  const [, r, g, b, a] = rgbaMatch!
  return { rgb: [Number(r), Number(g), Number(b)], alpha: Number(a) }
}

function extractVarValue(cssText: string, selector: string, varName: string): { rgb: RGB; alpha: number } {
  return extractColorFromRule(cssText, selector, `--${varName}`)
}

describe('FansubHeroSection Banner-Scrim Worst-Case-Kontrast', () => {
  const scrimAlpha = extractScrimAlpha()
  // Worst Case: ein rein weißes Bannerfoto (Leuchtdichte 1,0) hinter dem schwarzen Scrim.
  const worstCaseBackground = mix(BLACK, WHITE, scrimAlpha)

  it('der Scrim allein erreicht im Worst Case eine deutlich abgedunkelte effektive Hintergrundfarbe', () => {
    // Nachweis, dass der Scrim überhaupt wirkt (nicht nahezu durchsichtig) -- die eigentliche
    // Kontrastprüfung erfolgt pro Textfarbe unten.
    expect(scrimAlpha).toBeGreaterThanOrEqual(0.85)
    expect(luminance(worstCaseBackground)).toBeLessThan(0.2)
  })

  it('.heroBodyOnBanner .title (opakes Weiss) erreicht mindestens 4,5:1 gegen den Worst-Case-Scrim-Hintergrund', () => {
    const { rgb, alpha } = extractColorFromRule(pageCss, '.heroBodyOnBanner .title', 'color')
    const rendered = alpha < 1 ? mix(rgb, worstCaseBackground, alpha) : rgb
    expect(contrast(rendered, worstCaseBackground)).toBeGreaterThanOrEqual(4.5)
  })

  it('.heroBodyOnBanner .subtitle erreicht mindestens 4,5:1 gegen den Worst-Case-Scrim-Hintergrund', () => {
    const { rgb, alpha } = extractColorFromRule(pageCss, '.heroBodyOnBanner .subtitle', 'color')
    const rendered = alpha < 1 ? mix(rgb, worstCaseBackground, alpha) : rgb
    expect(contrast(rendered, worstCaseBackground)).toBeGreaterThanOrEqual(4.5)
  })

  it('--hero-metrics-label (im Banner-Fall) erreicht mindestens 4,5:1 gegen den Worst-Case-Scrim-Hintergrund', () => {
    const { rgb, alpha } = extractVarValue(pageCss, '.heroBodyOnBanner', 'hero-metrics-label')
    const rendered = alpha < 1 ? mix(rgb, worstCaseBackground, alpha) : rgb
    expect(contrast(rendered, worstCaseBackground)).toBeGreaterThanOrEqual(4.5)
  })

  it('--hero-metrics-value (im Banner-Fall) erreicht mindestens 4,5:1 gegen den Worst-Case-Scrim-Hintergrund', () => {
    const { rgb, alpha } = extractVarValue(pageCss, '.heroBodyOnBanner', 'hero-metrics-value')
    const rendered = alpha < 1 ? mix(rgb, worstCaseBackground, alpha) : rgb
    expect(contrast(rendered, worstCaseBackground)).toBeGreaterThanOrEqual(4.5)
  })

  it('HeroMetrics.module.css deklariert dieselben Fallback-Variablen mit dem unveränderten, dunklen Standardwert (kein Verhaltenswechsel ohne Bannerfoto)', () => {
    expect(heroMetricsCss).toMatch(/var\(--hero-metrics-label,\s*rgba\(28,\s*24,\s*38,\s*0\.64\)\)/)
    expect(heroMetricsCss).toMatch(/var\(--hero-metrics-value,\s*var\(--accent-deep\)\)/)
  })
})
