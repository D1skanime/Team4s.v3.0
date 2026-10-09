import { describe, expect, it } from 'vitest'

import {
  isCaptionOverflowing,
  resetCaptionPanelOpen,
  resolveCaptionPanelWidth,
  resolveContainedImageWidth,
  resolveEscapeTarget,
  resolveWheelOrSwipeTarget,
} from './mediaViewerCaptionPanel'

describe('isCaptionOverflowing', () => {
  it('erkennt eine Bildunterschrift als übergelaufen, wenn die gerenderte Höhe die sichtbare Höhe übersteigt', () => {
    expect(isCaptionOverflowing(120, 80)).toBe(true)
  })

  it('erkennt keinen Überlauf, wenn gerenderte und sichtbare Höhe gleich sind', () => {
    expect(isCaptionOverflowing(80, 80)).toBe(false)
  })
})

describe('resolveEscapeTarget', () => {
  it('schließt beim ersten Escape nur das Panel, wenn es offen ist', () => {
    expect(resolveEscapeTarget(false, true)).toBe('panel')
  })

  it('schließt beim zweiten Escape den Viewer, wenn das Panel bereits geschlossen ist', () => {
    expect(resolveEscapeTarget(false, false)).toBe('viewer')
  })

  it('setzt im gezoomten Zustand beim ersten Escape nur den Zoom zurück, obwohl das Panel offen ist', () => {
    expect(resolveEscapeTarget(true, true)).toBe('zoom')
  })

  it('setzt im gezoomten Zustand beim ersten Escape nur den Zoom zurück, wenn das Panel geschlossen ist', () => {
    expect(resolveEscapeTarget(true, false)).toBe('zoom')
  })
})

describe('resetCaptionPanelOpen', () => {
  it('setzt den Panel-Zustand beim Bildwechsel immer auf geschlossen zurück', () => {
    expect(resetCaptionPanelOpen()).toBe(false)
  })
})

describe('resolveWheelOrSwipeTarget', () => {
  it('leitet Wischen/Mausrad an das offene Panel weiter, statt die Bild-Navigation auszulösen', () => {
    expect(resolveWheelOrSwipeTarget(true)).toBe('panel')
  })

  it('leitet Wischen/Mausrad an die Bild-Bühne weiter, wenn das Panel geschlossen ist', () => {
    expect(resolveWheelOrSwipeTarget(false)).toBe('stage')
  })
})

describe('resolveContainedImageWidth', () => {
  it('beschneidet die Breite, wenn das Bild schmaler als hoch ist (Hochformat, Höhe ist der Flaschenhals)', () => {
    // 1000x2000 natural, box 1000x800 -> scale = min(1000/1000, 800/2000) = 0.4 -> width 400
    expect(resolveContainedImageWidth(1000, 2000, 1000, 800)).toBe(400)
  })

  it('nutzt die volle Box-Breite, wenn das Bild breiter als die Box ist (Breite ist der Flaschenhals)', () => {
    // 2000x1000 natural, box 1000x1000 -> scale = min(1000/2000, 1000/1000) = 0.5 -> width 1000
    expect(resolveContainedImageWidth(2000, 1000, 1000, 1000)).toBe(1000)
  })

  it('liefert die Box-Breite, solange die natürliche Bildgröße noch unbekannt ist (0x0)', () => {
    expect(resolveContainedImageWidth(0, 0, 1000, 800)).toBe(1000)
  })

  it('gibt die exakte Breite zurück, wenn Bild- und Box-Seitenverhältnis identisch sind', () => {
    expect(resolveContainedImageWidth(1600, 900, 800, 450)).toBe(800)
  })
})

describe('resolveCaptionPanelWidth', () => {
  it('nutzt die gemessene Bildbreite, wenn sie innerhalb der Klammer liegt', () => {
    expect(resolveCaptionPanelWidth(850, 720, 1000)).toBe(850)
  })

  it('hebt auf die Mindestbreite an, wenn das Bild schmaler als die Klammer ist', () => {
    expect(resolveCaptionPanelWidth(400, 720, 1000)).toBe(720)
  })

  it('deckelt auf die Maximalbreite, wenn das Bild breiter als die Klammer ist', () => {
    expect(resolveCaptionPanelWidth(1600, 720, 1000)).toBe(1000)
  })

  it('liefert die Mindestbreite bei noch unvermessener Bildbreite (0)', () => {
    expect(resolveCaptionPanelWidth(0, 720, 1000)).toBe(720)
  })

  it('behandelt Werte exakt an den Klammer-Grenzen als innerhalb der Klammer', () => {
    expect(resolveCaptionPanelWidth(720, 720, 1000)).toBe(720)
    expect(resolveCaptionPanelWidth(1000, 720, 1000)).toBe(1000)
  })
})
