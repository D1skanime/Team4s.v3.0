import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { readGlobalsCssResolved } from '@/test/readGlobalsCss'

/**
 * Deterministischer Worst-Case-Kontrastnachweis für den Fansub-Hero-Banner (UAT-Befund 2): wenn
 * ein Bannerfoto vorhanden ist, blendet `FansubHeroSection` einen zusätzlichen dunklen Scrim
 * (`.heroBodyOnBanner::before`) hinter Titel/Subtitle/MetricList ein, dessen Opazität so bemessen
 * ist, dass selbst ein rein weißes (also denkbar hellstes) Bannerfoto den Text nicht unlesbar
 * macht. Muster exakt wie `src/lib/roleCatalog.accessibility.test.ts`: lokale Helfer rechnen die
 * echten, per Regex aus dem realen CSS-Text extrahierten Formeln nach -- kein jsdom-Rendering
 * (jsdom kann Verläufe/Bilder ohnehin nicht zuverlässig für color-contrast auswerten).
 *
 * Positionsabhängigkeit (Live-UAT-Nachbesserung): `extractScrimAlpha()` erzwingt zusätzlich, dass
 * der Scrim eine FLÄCHIGE Farbe ist, kein `linear-gradient()` mit einer Rampe. Ein früherer
 * Verlauf erreichte die hier geprüfte Opazität erst bei 30% der Box-Höhe, während Titel/Badge/
 * Kennzahlen bereits direkt am oberen Rand (nach 16px Padding) beginnen -- ein reiner Endwert-
 * Test hätte diese Lücke nicht erkannt. Der zusätzliche, Playwright-basierte Nachweis gegen die
 * echte laufende App (`e2e/fansub-hero-banner-contrast.spec.ts`) misst ergänzend die
 * tatsächlichen Pixel hinter Titel/Badge/Kennzahlen für reale Gruppen mit hellem Bannerfoto.
 */

const pageCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/fansubs/[slug]/page.module.css'),
  'utf8',
)
const metricListCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/ui/MetricList.module.css'),
  'utf8',
)
const headingCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/ui/Heading.module.css'),
  'utf8',
)
const textCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/ui/Text.module.css'),
  'utf8',
)
const fansubHeroSectionTsx = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/fansubs/FansubHeroSection.tsx'),
  'utf8',
)
const badgeCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/ui/Badge.module.css'),
  'utf8',
)
// Die --badge-onmedia-*-Rezeptur wanderte mit Befund 26 von components.css nach effects.css
// (eigenes Zuhause für Blur-/Glas-/Scrim-Zweck-Tokens) -- dieselben Werte, andere Quelldatei.
const effectsTokensCss = fs.readFileSync(
  path.resolve(process.cwd(), 'src/styles/tokens/effects.css'),
  'utf8',
)
const globalsCss = readGlobalsCssResolved()

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

/**
 * Extrahiert die Scrim-Opazität aus der `.heroBodyOnBanner::before`-background-Regel und
 * erzwingt zugleich, dass es sich um eine FLÄCHIGE Farbe handelt (kein `linear-gradient(...)`
 * mit einer Rampe von transparent auf deckend). Live-UAT-Befund: ein vormaliger Verlauf
 * (`rgba(10,8,14,0) 0%` bis `rgba(10,8,14,0.88) 30%`) ließ exakt den oberen Bereich dieser Box
 * -- wo Titel/Status-Badge/Kennzahlen direkt nach dem 16px-Padding beginnen, also weit VOR der
 * 30%-Marke -- unzureichend verdunkelt. Ein reiner Endwert-Test (wie zuvor) kann das nicht
 * erkennen, da er nur die 30%/100%-Stelle prüft, nicht den tatsächlich von Text belegten oberen
 * Rand. Die Prüfung auf eine flächige (positionsunabhängige) Farbe schließt diese Lücke
 * grundsätzlich: es gibt dann schlicht keine schwächere Stelle mehr, unabhängig von der
 * Textposition innerhalb der Box.
 */
function extractScrimAlpha(): number {
  const block = pageCss.match(/\.heroBodyOnBanner::before\s*\{([^}]*)\}/)
  expect(block, '.heroBodyOnBanner::before must exist in the stylesheet').not.toBeNull()

  expect(
    block![1],
    '.heroBodyOnBanner::before darf keinen linear-gradient() mehr verwenden -- ein Verlauf kann am ' +
      'oberen Rand der Box (wo Titel/Badge/Kennzahlen tatsächlich beginnen) schwächer als am Endwert ' +
      'sein, eine flächige Farbe schließt das aus',
  ).not.toMatch(/linear-gradient/)

  const match = block![1].match(/background:\s*rgba\(10,\s*8,\s*14,\s*([\d.]+)\)/)
  expect(match, '.heroBodyOnBanner::before must declare a flat rgba(10, 8, 14, <alpha>) background').not.toBeNull()
  return Number(match![1])
}

/**
 * Löst eine in `globals.css` deklarierte Custom Property bis zu einem Literal auf (hex ODER
 * rgba()) -- folgt dabei EINER Indirektionsstufe (`--text-primary: var(--color-text-primary)`
 * -> `--color-text-primary: #1c1c1e`), wie sie im globalen Token-System üblich ist. Wird für
 * `.heroChip`s `color: var(--text-primary)` benötigt, das (anders als Badge/MetricList) KEINEN
 * eigenen Banner-Override besitzt und daher direkt auf den globalen Token verweist.
 */
function resolveGlobalVar(varName: string, depth = 0): { rgb: RGB; alpha: number } {
  expect(depth, `--${varName}: Variablenkette zu tief verschachtelt`).toBeLessThan(5)
  const match = globalsCss.match(new RegExp(`--${varName}:\\s*([^;]+);`))
  expect(match, `--${varName} must be declared in globals.css`).not.toBeNull()
  const value = match![1].trim()

  const varRefMatch = value.match(/^var\(--([a-zA-Z0-9-]+)\)$/)
  if (varRefMatch) {
    return resolveGlobalVar(varRefMatch[1], depth + 1)
  }
  if (value.startsWith('#')) {
    return { rgb: hexRgb(value), alpha: 1 }
  }
  const rgbaMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  expect(rgbaMatch, `--${varName} must be a parseable color: ${value}`).not.toBeNull()
  const [, r, g, b, a] = rgbaMatch!
  return { rgb: [Number(r), Number(g), Number(b)], alpha: a === undefined ? 1 : Number(a) }
}

/** Extrahiert eine Farbe (opak #hex, rgba(...), ODER eine direkte CSS-Variablen-Referenz ohne
 *  eigenen Fallback auf einen globalen Token) aus einer benannten CSS-Deklaration innerhalb
 *  eines gegebenen Selektor-Blocks. */
function extractColorFromRule(cssText: string, selector: string, property: string): { rgb: RGB; alpha: number } {
  const selectorRegex = new RegExp(`${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const block = cssText.match(selectorRegex)
  expect(block, `${selector} must exist in the stylesheet`).not.toBeNull()
  const propRegex = new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6}|rgba?\\([^)]+\\)|var\\(--[a-zA-Z0-9-]+\\));`)
  const propMatch = block![1].match(propRegex)
  expect(propMatch, `${selector} must declare ${property}`).not.toBeNull()
  const value = propMatch![1]

  if (value.startsWith('#')) {
    return { rgb: hexRgb(value), alpha: 1 }
  }

  const varRefMatch = value.match(/^var\(--([a-zA-Z0-9-]+)\)$/)
  if (varRefMatch) {
    return resolveGlobalVar(varRefMatch[1])
  }

  const rgbaMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  expect(rgbaMatch, `${selector} ${property} must be a parseable rgba()`).not.toBeNull()
  const [, r, g, b, a] = rgbaMatch!
  return { rgb: [Number(r), Number(g), Number(b)], alpha: a === undefined ? 1 : Number(a) }
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

  it('Text tone="onScrim" (MetricLists Kennzahlen-Beschriftung im Banner-Fall) erreicht mindestens 4,5:1 gegen den Worst-Case-Scrim-Hintergrund', () => {
    const { rgb, alpha } = extractColorFromRule(textCss, '.textToneOnScrim', 'color')
    const rendered = alpha < 1 ? mix(rgb, worstCaseBackground, alpha) : rgb
    expect(contrast(rendered, worstCaseBackground)).toBeGreaterThanOrEqual(4.5)
  })

  it('Heading tone="onScrim" (MetricLists Kennzahlen-Wert im Banner-Fall) erreicht mindestens 4,5:1 gegen den Worst-Case-Scrim-Hintergrund', () => {
    const { rgb, alpha } = extractColorFromRule(headingCss, '.headingToneOnScrim', 'color')
    const rendered = alpha < 1 ? mix(rgb, worstCaseBackground, alpha) : rgb
    expect(contrast(rendered, worstCaseBackground)).toBeGreaterThanOrEqual(4.5)
  })

  it('FansubHeroSection reicht tone="onDark" nur bei vorhandenem Bannerfoto an MetricList durch, MetricList.module.css überschreibt keine Heading-/Text-Farbe/-Größe mehr', () => {
    expect(fansubHeroSectionTsx).toMatch(/tone=\{bannerURL \? 'onDark' : 'default'\}/)
    // Die frühere .metricLabel/.metricValue-Überschreibung ist komplett entfallen -- einzige
    // verbleibende Farbdeklaration ist der rein dekorative "·"-Trenner der Inline-Variante
    // (::before, kein Heading/Text-Override).
    expect(metricListCss).not.toMatch(/metricLabel|metricValue/)
    expect(metricListCss).not.toMatch(/font-size:/)
    expect(metricListCss).not.toMatch(/font-weight:/)
  })

  it('Status-Badge (variant="onMedia") erreicht im Banner-Fall mindestens 4,5:1 Kontrast gegen seine eigene, auf dem Worst-Case-Scrim aufliegende Chip-Fläche', () => {
    // Zweistufige Mischung: zuerst der Badge-eigene Chip-Hintergrund über dem Worst-Case-Scrim-
    // Hintergrund (Chip ist selbst teiltransparent), danach der Badge-Text über diesem bereits
    // gemischten Chip-Hintergrund -- nicht nur direkt gegen den Scrim, da der Text optisch auf
    // der Chip-Fläche liegt, nicht auf dem rohen Scrim. Die Werte kommen seit der onMedia-
    // Migration aus den festen --badge-onmedia-bg/-text-Tokens, seit Befund 26 in effects.css
    // geführt (identisch zu den vormals von page.module.css injizierten --badge-muted-bg/-fg-
    // Overrides), nicht mehr aus einer von außen gesetzten CSS-Variable.
    const bgToken = extractVarValue(effectsTokensCss, ':root', 'badge-onmedia-bg')
    const fgToken = extractVarValue(effectsTokensCss, ':root', 'badge-onmedia-text')
    const chipBackground =
      bgToken.alpha < 1 ? mix(bgToken.rgb, worstCaseBackground, bgToken.alpha) : bgToken.rgb
    const renderedText =
      fgToken.alpha < 1 ? mix(fgToken.rgb, chipBackground, fgToken.alpha) : fgToken.rgb
    expect(contrast(renderedText, chipBackground)).toBeGreaterThanOrEqual(4.5)
  })

  it('Badge.module.css behält die unveränderten Fallback-Werte ohne Bannerfoto (kein Verhaltenswechsel für die ~45+ anderen variant="muted"-Verwender)', () => {
    // Die Fallbacks kommen seit der Token-Sweep-Runde aus globalen --badge-muted-*-default-
    // Tokens statt rohen Literalen direkt in Badge.module.css -- der tatsächlich gerenderte Wert
    // bleibt dabei exakt derselbe, nur die Herkunft ist jetzt ein Token statt eines Literals.
    const bgFallbackMatch = badgeCss.match(/var\(--badge-muted-bg,\s*var\(--([a-zA-Z0-9-]+)\)\)/)
    expect(bgFallbackMatch, 'background muss auf var(--badge-muted-bg, var(--...)) verweisen').not.toBeNull()
    const bgFallback = resolveGlobalVar(bgFallbackMatch![1])
    expect(bgFallback).toEqual({ rgb: [255, 255, 255], alpha: 0.38 })

    const fgFallbackMatch = badgeCss.match(/var\(--badge-muted-fg,\s*var\(--([a-zA-Z0-9-]+)\)\)/)
    expect(fgFallbackMatch, 'color muss auf var(--badge-muted-fg, var(--...)) verweisen').not.toBeNull()
    const fgFallback = resolveGlobalVar(fgFallbackMatch![1])
    expect(fgFallback).toEqual({ rgb: hexRgb('#66758d'), alpha: 1 })
  })

  it('.heroChip (Link-Pills) erreicht im Banner-Fall mindestens 4,5:1 Kontrast gegen seine eigene, auf dem Worst-Case-Scrim aufliegende Chip-Fläche', () => {
    // .heroChip besitzt -- anders als Badge/MetricList -- KEINEN eigenen Banner-Override: die
    // teiltransparente weiße Chip-Fläche (rgba(255,255,255,0.72)) und der dunkle Text
    // (var(--text-primary)) bleiben im Banner-Fall unverändert. Zweistufige Mischung wie beim
    // Badge: zuerst die Chip-Fläche über dem Worst-Case-Scrim-Hintergrund, danach der Text
    // über dieser bereits gemischten Chip-Fläche.
    const chipBackgroundOwn = extractColorFromRule(pageCss, '.heroChip', 'background')
    const chipText = extractColorFromRule(pageCss, '.heroChip', 'color')
    const chipBackground =
      chipBackgroundOwn.alpha < 1 ? mix(chipBackgroundOwn.rgb, worstCaseBackground, chipBackgroundOwn.alpha) : chipBackgroundOwn.rgb
    const renderedText = chipText.alpha < 1 ? mix(chipText.rgb, chipBackground, chipText.alpha) : chipText.rgb
    expect(contrast(renderedText, chipBackground)).toBeGreaterThanOrEqual(4.5)
  })
})
