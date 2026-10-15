import { describe, expect, it } from 'vitest'

import { computePageWindow } from './pagination'

describe('computePageWindow', () => {
  it('liefert das Fenster currentPage-2 bis currentPage+2, innerhalb [1, totalPages]', () => {
    expect(computePageWindow(3, 10)).toEqual([1, 2, 3, 4, 5])
  })

  it('kappt from auf 1, wenn currentPage-2 negativ würde', () => {
    expect(computePageWindow(1, 10)).toEqual([1, 2, 3])
  })

  it('kappt to auf totalPages, wenn currentPage+2 darüber liegen würde', () => {
    expect(computePageWindow(10, 10)).toEqual([8, 9, 10])
  })

  it('liefert genau eine Seite, wenn es nur eine Seite gibt', () => {
    expect(computePageWindow(1, 1)).toEqual([1])
  })

  it('kappt to auf totalPages, wenn currentPage größer als totalPages ist (Grenzfall der bestehenden Implementierung: from bleibt bei currentPage-2, to bei totalPages, ggf. nur eine Seite)', () => {
    expect(computePageWindow(5, 3)).toEqual([3])
  })
})
