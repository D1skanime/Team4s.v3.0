import { describe, expect, it } from 'vitest'

import {
  computeSwipeNavigation,
  nextZoomState,
  selectDisplaySrc,
  wrapIndex,
} from './mediaViewerNavigation'

describe('wrapIndex', () => {
  it('springt rückwärts über den Anfang hinweg zum letzten Index', () => {
    expect(wrapIndex(0, 3, -1)).toBe(2)
  })

  it('springt vorwärts über das Ende hinweg zum ersten Index', () => {
    expect(wrapIndex(2, 3, 1)).toBe(0)
  })

  it('bewegt sich innerhalb der Mitte ohne Wrap-around', () => {
    expect(wrapIndex(1, 3, 1)).toBe(2)
  })

  it('bewegt sich rückwärts innerhalb der Mitte ohne Wrap-around', () => {
    expect(wrapIndex(1, 3, -1)).toBe(0)
  })

  it('wirft bei einer Liste mit nur einem Element weder NaN noch einen Fehler', () => {
    expect(wrapIndex(0, 1, 1)).toBe(0)
  })
})

describe('computeSwipeNavigation', () => {
  it('erkennt eine horizontale Wischbewegung nach rechts als Navigation zum vorherigen Bild', () => {
    expect(computeSwipeNavigation(40, 5, 32)).toBe('prev')
  })

  it('erkennt eine horizontale Wischbewegung nach links als Navigation zum nächsten Bild', () => {
    expect(computeSwipeNavigation(-40, 5, 32)).toBe('next')
  })

  it('ignoriert eine Wischbewegung unterhalb des Schwellenwerts', () => {
    expect(computeSwipeNavigation(20, 5, 32)).toBeNull()
  })

  it('ignoriert eine vertikal dominante Wischbewegung, um normales Scrollen nicht zu blockieren', () => {
    expect(computeSwipeNavigation(40, 50, 32)).toBeNull()
  })
})

describe('nextZoomState', () => {
  it('schaltet von nicht gezoomt auf gezoomt', () => {
    expect(nextZoomState(false)).toBe(true)
  })

  it('schaltet von gezoomt auf nicht gezoomt', () => {
    expect(nextZoomState(true)).toBe(false)
  })
})

describe('selectDisplaySrc', () => {
  it('liefert die Display-URL, solange das Original noch nicht geladen ist und alle URLs vorhanden sind', () => {
    const result = selectDisplaySrc({
      displayUrl: 'display.jpg',
      originalUrl: 'original.jpg',
      thumbnailUrl: 'thumb.jpg',
      originalLoaded: false,
    })

    expect(result).toBe('display.jpg')
  })

  it('wechselt nahtlos zur Original-URL, sobald das Original geladen ist', () => {
    const result = selectDisplaySrc({
      displayUrl: 'display.jpg',
      originalUrl: 'original.jpg',
      thumbnailUrl: 'thumb.jpg',
      originalLoaded: true,
    })

    expect(result).toBe('original.jpg')
  })

  it('fällt auf die Original-URL zurück, wenn keine Display-URL vorhanden ist', () => {
    const result = selectDisplaySrc({
      displayUrl: null,
      originalUrl: 'original.jpg',
      thumbnailUrl: 'thumb.jpg',
      originalLoaded: false,
    })

    expect(result).toBe('original.jpg')
  })

  it('fällt auf die Display-URL zurück, wenn das Original als geladen markiert ist, aber keine Original-URL existiert', () => {
    const result = selectDisplaySrc({
      displayUrl: 'display.jpg',
      originalUrl: null,
      thumbnailUrl: 'thumb.jpg',
      originalLoaded: true,
    })

    expect(result).toBe('display.jpg')
  })
})
