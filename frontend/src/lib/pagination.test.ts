import { describe, expect, it } from 'vitest'

import { computePageWindow, computePaginationItems } from './pagination'

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

describe('computePaginationItems', () => {
  it('zeigt alle Seiten ohne Lücke, wenn sie vollständig ins Fenster passen', () => {
    expect(computePaginationItems(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('ergänzt die letzte Seite mit Lücke, wenn das Fenster am Anfang steht', () => {
    expect(computePaginationItems(1, 10)).toEqual([1, 2, 3, 'ellipsis', 10])
  })

  it('ergänzt die erste Seite mit Lücke, wenn das Fenster am Ende steht', () => {
    expect(computePaginationItems(10, 10)).toEqual([1, 'ellipsis', 8, 9, 10])
  })

  it('ergänzt beide Enden mit Lücken, wenn das Fenster weit von Anfang und Ende entfernt steht', () => {
    expect(computePaginationItems(10, 20)).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12, 'ellipsis', 20])
  })

  it('lässt die Lücke weg, wenn nur genau eine Seite zwischen Fenster und Rand fehlt', () => {
    // Fenster [3,4,5,6], Seite 2 fehlt einzeln -> direkt anfügen statt Lücke für eine Seite.
    expect(computePaginationItems(5, 6)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('liefert genau eine Seite ohne Lücke, wenn es nur eine Seite gibt', () => {
    expect(computePaginationItems(1, 1)).toEqual([1])
  })
})
