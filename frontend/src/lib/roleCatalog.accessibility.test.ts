import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { NEUTRAL_ROLE_COLOR_KEY, ROLE_COLOR_KEYS } from './roleCatalog'

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')

function hexRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number]
}

function mix(foreground: [number, number, number], background: [number, number, number], alpha: number): [number, number, number] {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as [number, number, number]
}

function luminance(rgb: [number, number, number]): number {
  const channels = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

function rootHex(name: string): [number, number, number] {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  expect(match, `${name} must resolve to a concrete hex token`).not.toBeNull()
  return hexRgb(match![1])
}

describe('role catalog chip accessibility', () => {
  it('resolves every bounded treatment from the actual stylesheet with no role-code selector', () => {
    expect(css).not.toMatch(/\[data-role-code(?:=|\])/)
    for (const colorKey of [...ROLE_COLOR_KEYS, NEUTRAL_ROLE_COLOR_KEY]) {
      const selectorKey = colorKey.replace('#', '\\#')
      const accent = colorKey === NEUTRAL_ROLE_COLOR_KEY ? '#596176' : selectorKey
      expect(css).toMatch(new RegExp(`\\[data-color-key=['"]${selectorKey}['"]\\]\\s*\\{[^}]*--role-chip-accent:\\s*${accent}`, 'i'))
    }
  })

  it('proves text, boundary and focus contrast for all 15 catalog treatments', () => {
    const card = rootHex('--surface-card')
    const text = rootHex('--role-chip-text')
    const border = rootHex('--role-chip-border')
    const focus = rootHex('--role-chip-focus')
    for (const colorKey of ROLE_COLOR_KEYS) {
      const background = mix(hexRgb(colorKey), card, 0.14)
      expect(contrast(text, background), `${colorKey} text`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(border, background), `${colorKey} border`).toBeGreaterThanOrEqual(3)
      expect(contrast(focus, background), `${colorKey} focus`).toBeGreaterThanOrEqual(3)
    }
  })
})
