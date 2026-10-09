import { describe, expect, it } from 'vitest'

import {
  isCaptionOverflowing,
  resetCaptionPanelOpen,
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
    expect(resolveEscapeTarget(true)).toBe('panel')
  })

  it('schließt beim zweiten Escape den Viewer, wenn das Panel bereits geschlossen ist', () => {
    expect(resolveEscapeTarget(false)).toBe('viewer')
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
