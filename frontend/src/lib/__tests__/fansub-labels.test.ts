import { describe, expect, it } from 'vitest'

import { getFansubLinkTypeLabel, getFansubMediaCategoryLabel, getFansubStatusLabel } from '../fansub-labels'

describe('getFansubMediaCategoryLabel', () => {
  it('übersetzt alle bekannten Medien-Kategorien ins Deutsche', () => {
    expect(getFansubMediaCategoryLabel('gallery')).toBe('Galerie')
    expect(getFansubMediaCategoryLabel('history_screenshot')).toBe('Historische Screenshots')
    expect(getFansubMediaCategoryLabel('old_website')).toBe('Alte Website')
    expect(getFansubMediaCategoryLabel('forum')).toBe('Forum')
    expect(getFansubMediaCategoryLabel('irc_chat')).toBe('IRC-Chat')
    expect(getFansubMediaCategoryLabel('event_meeting')).toBe('Event / Treffen')
    expect(getFansubMediaCategoryLabel('artwork_fanart')).toBe('Artwork / Fanart')
    expect(getFansubMediaCategoryLabel('other')).toBe('Sonstiges')
  })

  it('fällt bei unbekannten Kategorien auf Sonstiges zurück', () => {
    expect(getFansubMediaCategoryLabel('unbekannt')).toBe('Sonstiges')
  })
})

describe('getFansubLinkTypeLabel', () => {
  it('übersetzt alle bekannten Link-Typen ins Deutsche', () => {
    expect(getFansubLinkTypeLabel('website')).toBe('Webseite')
    expect(getFansubLinkTypeLabel('discord')).toBe('Discord')
    expect(getFansubLinkTypeLabel('irc')).toBe('IRC')
    expect(getFansubLinkTypeLabel('twitter')).toBe('Twitter/X')
    expect(getFansubLinkTypeLabel('github')).toBe('GitHub')
  })

  it('fällt bei unbekannten Link-Typen auf den Rohwert zurück', () => {
    expect(getFansubLinkTypeLabel('unbekannt')).toBe('unbekannt')
  })
})

// 176-EXTRA Scope Addition 3: zentraler deutscher Label-Helfer für FansubStatus,
// verwendet von der Anlege- und der Bearbeitungsseite (inkl. Fansub-Leader-Sicht).
describe('getFansubStatusLabel', () => {
  it('übersetzt alle drei Status-Rohwerte ins Deutsche', () => {
    expect(getFansubStatusLabel('active')).toBe('Aktiv')
    expect(getFansubStatusLabel('inactive')).toBe('Inaktiv')
    expect(getFansubStatusLabel('dissolved')).toBe('Aufgelöst')
  })
})
