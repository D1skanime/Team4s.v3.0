import { describe, expect, it } from 'vitest'

import { storybookDocsLink, storybookDocsPath } from './storybookLinks'

describe('storybookDocsPath', () => {
  it('baut den Deep-Link exakt nach Storybooks eigenem sanitize-Algorithmus (gegen echte storybook-build-IDs verifiziert)', () => {
    expect(storybookDocsPath('Grundbausteine/IconButton')).toBe('?path=/docs/grundbausteine-iconbutton--docs')
    expect(storybookDocsPath('Zusammengesetzte Bausteine/DisclosureTrigger')).toBe(
      '?path=/docs/zusammengesetzte-bausteine-disclosuretrigger--docs',
    )
  })

  it('behält Umlaute bei, da Storybooks sanitize() nur eine feste Satzzeichen-/Leerzeichen-Liste ersetzt, keine generische Nicht-ASCII-Klasse', () => {
    expect(storybookDocsPath('Zusammengesetzte Bausteine/Öffentliche Fansub-Oberflächen')).toBe(
      '?path=/docs/zusammengesetzte-bausteine-öffentliche-fansub-oberflächen--docs',
    )
  })
})

describe('storybookDocsLink', () => {
  it('baut eine Markdown-Verlinkung aus Label und Pfad', () => {
    expect(storybookDocsLink('Grundbausteine/Button', 'Button')).toBe(
      '[Button](?path=/docs/grundbausteine-button--docs)',
    )
  })
})
