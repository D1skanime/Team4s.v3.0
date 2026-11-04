// @vitest-environment jsdom

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'
import { Pagination } from './Pagination'

// Befund 25: `onPageChange`/`onShowMore`/`onShowLess` werden hier nur trivial weitergeleitet
// (`onClick: () => onPageChange?.(page)` etc.), ohne eigene Fachlogik -- statt eines echten
// DOM-Klicks wird die Komponente direkt als Funktion aufgerufen und der gefundene `onClick`-Prop
// direkt invoziert (etabliertes Muster aus `page.test.tsx`/`AnimeDetailView.test.tsx`, hier als
// eigene, dateilokale Kopie). Pagination delegiert intern an eine nicht exportierte
// Varianten-Komponente (`PagesPagination`/`LoadMorePagination`), die `useMemo` nutzt -- deshalb
// läuft der gesamte direkte Aufruf innerhalb von `renderHook`, damit React-Hooks einen echten
// Render-Kontext vorfinden, statt ihn (wie ein roher Funktionsaufruf) mit "Invalid hook call"
// abzulehnen. Button selbst wird bewusst NICHT weiter aufgerufen (kein Hook-Bedarf, Button-
// Elemente sind das gesuchte Blatt dieser Baumwanderung).
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    if (typeof child.type === 'function' && child.type !== Button) {
      const component = child.type as (props: Record<string, unknown>) => ReactNode
      return [child, ...elements(component(child.props))]
    }
    return [child, ...elements(child.props.children as ReactNode)]
  })
}
function textContent(node: ReactNode): string {
  return Children.toArray(node).map((child) =>
    isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child),
  ).join('')
}
function findButtonsByDirectCall(tree: ReactNode): ReactElement<Record<string, unknown>>[] {
  return elements(tree).filter((element) => element.type === Button)
}

describe('Pagination', () => {
  it('rendert nichts bei höchstens einer Seite', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('zeigt die Seitenzusammenfassung', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByText('Seite 2 von 5')).not.toBeNull()
  })

  describe('Klick-Modus', () => {
    it('ruft onPageChange mit der angeklickten Seitenzahl auf (direkter onClick-Aufruf statt Klick-Simulation, Befund 25)', () => {
      const onPageChange = vi.fn()
      const { result } = renderHook(() => findButtonsByDirectCall(Pagination({ currentPage: 2, totalPages: 5, onPageChange })))

      const pageThree = result.current.find((button) => textContent(button.props.children as ReactNode) === '3')
      expect(pageThree).toBeTruthy()
      ;(pageThree!.props.onClick as () => void)()

      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('ruft onPageChange mit der nächsten/vorherigen Seite bei Weiter/Zurück auf (direkter onClick-Aufruf statt Klick-Simulation, Befund 25)', () => {
      const onPageChange = vi.fn()
      const { result } = renderHook(() => findButtonsByDirectCall(Pagination({ currentPage: 2, totalPages: 5, onPageChange })))

      const weiter = result.current.find((button) => textContent(button.props.children as ReactNode).includes('Weiter'))
      const zurueck = result.current.find((button) => textContent(button.props.children as ReactNode).includes('Zurück'))
      expect(weiter).toBeTruthy()
      expect(zurueck).toBeTruthy()

      ;(weiter!.props.onClick as () => void)()
      expect(onPageChange).toHaveBeenCalledWith(3)

      ;(zurueck!.props.onClick as () => void)()
      expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('deaktiviert Zurück auf der ersten und Weiter auf der letzten Seite', () => {
      const { rerender } = render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />)
      expect(screen.getByRole('button', { name: /Zurück/ })).toHaveProperty('disabled', true)

      rerender(<Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />)
      expect(screen.getByRole('button', { name: /Weiter/ })).toHaveProperty('disabled', true)
    })

    it('markiert die aktuelle Seite mit aria-current="page"', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />)
      expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('page')
      expect(screen.getByRole('button', { name: '3' }).getAttribute('aria-current')).toBeNull()
    })

    it('rendert eine Lücke statt jeder ausgelassenen Seite bei langen Listen', () => {
      render(<Pagination currentPage={10} totalPages={20} onPageChange={() => {}} />)
      expect(screen.getAllByText('…')).toHaveLength(2)
      expect(screen.getByRole('button', { name: '1' })).not.toBeNull()
      expect(screen.getByRole('button', { name: '20' })).not.toBeNull()
      expect(screen.queryByRole('button', { name: '4' })).toBeNull()
    })
  })

  describe('Link-Modus', () => {
    it('rendert Seitenzahlen sowie Weiter/Zurück als Links mit der von hrefForPage gebauten URL', () => {
      render(<Pagination currentPage={2} totalPages={5} hrefForPage={(page) => `/anime?page=${page}`} />)

      expect(screen.getByRole('link', { name: '3' }).getAttribute('href')).toBe('/anime?page=3')
      expect(screen.getByRole('link', { name: /Weiter/ }).getAttribute('href')).toBe('/anime?page=3')
      expect(screen.getByRole('link', { name: /Zurück/ }).getAttribute('href')).toBe('/anime?page=1')
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('entfernt href bei Zurück auf der ersten Seite, statt den Link zu entfernen', () => {
      render(<Pagination currentPage={1} totalPages={5} hrefForPage={(page) => `/anime?page=${page}`} />)

      // Ohne href hat ein <a> keine implizite ARIA-Rolle "link" mehr (Button deaktiviert so
      // konsequent die Navigation) -- daher über den sichtbaren Text statt über die Rolle finden.
      const zurueck = screen.getByText('Zurück').closest('a')
      expect(zurueck).not.toBeNull()
      expect(zurueck?.getAttribute('href')).toBeNull()
      expect(zurueck?.getAttribute('aria-disabled')).toBe('true')
    })

    it('rendert über die Link-Komponente, wenn linkComponent übergeben wird', () => {
      function StubLink({ href, children, ...rest }: { href: string; children: ReactNode }) {
        return (
          <a data-stub-link="true" href={href} {...rest}>
            {children}
          </a>
        )
      }

      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          hrefForPage={(page) => `/anime?page=${page}`}
          linkComponent={StubLink}
        />,
      )

      expect(screen.getByRole('link', { name: '3' }).getAttribute('data-stub-link')).toBe('true')
    })

    it('rendert die Lücke als nicht-interaktive Markierung ohne Link', () => {
      render(<Pagination currentPage={10} totalPages={20} hrefForPage={(page) => `/anime?page=${page}`} />)
      expect(screen.getAllByText('…')).toHaveLength(2)
      screen.getAllByText('…').forEach((el) => expect(el.tagName).toBe('SPAN'))
    })
  })

  describe('Link-Modus mit hrefPattern', () => {
    it('rendert Seitenzahlen sowie Weiter/Zurück als Links mit der aus hrefPattern gebauten URL', () => {
      render(<Pagination currentPage={2} totalPages={5} hrefPattern="/anime?page={page}" />)

      expect(screen.getByRole('link', { name: '3' }).getAttribute('href')).toBe('/anime?page=3')
      expect(screen.getByRole('link', { name: /Weiter/ }).getAttribute('href')).toBe('/anime?page=3')
      expect(screen.getByRole('link', { name: /Zurück/ }).getAttribute('href')).toBe('/anime?page=1')
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('entfernt href bei Zurück auf der ersten Seite, statt den Link zu entfernen', () => {
      render(<Pagination currentPage={1} totalPages={5} hrefPattern="/anime?page={page}" />)

      const zurueck = screen.getByText('Zurück').closest('a')
      expect(zurueck).not.toBeNull()
      expect(zurueck?.getAttribute('href')).toBeNull()
      expect(zurueck?.getAttribute('aria-disabled')).toBe('true')
    })

    it('rendert über die Link-Komponente, wenn linkComponent übergeben wird', () => {
      function StubLink({ href, children, ...rest }: { href: string; children: ReactNode }) {
        return (
          <a data-stub-link="true" href={href} {...rest}>
            {children}
          </a>
        )
      }

      render(
        <Pagination currentPage={2} totalPages={5} hrefPattern="/anime?page={page}" linkComponent={StubLink} />,
      )

      expect(screen.getByRole('link', { name: '3' }).getAttribute('data-stub-link')).toBe('true')
    })

    it('bevorzugt hrefPattern, wenn sowohl hrefPattern als auch hrefForPage gesetzt sind', () => {
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          hrefPattern="/anime?page={page}"
          hrefForPage={(page) => `/sollte-nicht-verwendet-werden?page=${page}`}
        />,
      )

      expect(screen.getByRole('link', { name: '3' }).getAttribute('href')).toBe('/anime?page=3')
    })
  })

  describe('Nachlade-Modus (mode="loadMore")', () => {
    it('zeigt den Fortschritt und den Mehr-Button, solange weitere Einträge nachladbar sind', () => {
      render(
        <Pagination
          mode="loadMore"
          shownCount={15}
          totalCount={24}
          canShowMore
          canShowLess={false}
          onShowMore={() => {}}
          onShowLess={() => {}}
          showMoreLabel="Weitere 9 Beiträge anzeigen"
        />,
      )

      expect(screen.getByText('15 von 24 angezeigt')).not.toBeNull()
      expect(screen.queryByRole('button', { name: 'Weniger anzeigen' })).toBeNull()
    })

    it('ruft onShowMore bei einem direkten onClick-Aufruf auf (statt Klick-Simulation, Befund 25)', () => {
      const onShowMore = vi.fn()
      const { result } = renderHook(() => findButtonsByDirectCall(Pagination({
        mode: 'loadMore', shownCount: 15, totalCount: 24, canShowMore: true, canShowLess: false,
        onShowMore, onShowLess: () => {}, showMoreLabel: 'Weitere 9 Beiträge anzeigen',
      })))

      const mehrButton = result.current.find((button) => textContent(button.props.children as ReactNode).includes('Weitere 9 Beiträge anzeigen'))
      expect(mehrButton).toBeTruthy()
      ;(mehrButton!.props.onClick as () => void)()

      expect(onShowMore).toHaveBeenCalledTimes(1)
    })

    it('zeigt den Weniger-Button ohne Fortschrittstext, wenn bereits alles geladen ist', () => {
      render(
        <Pagination
          mode="loadMore"
          shownCount={24}
          totalCount={24}
          canShowMore={false}
          canShowLess
          onShowMore={() => {}}
          onShowLess={() => {}}
          showMoreLabel="Weitere Beiträge anzeigen"
        />,
      )

      expect(screen.queryByText(/von 24 angezeigt/)).toBeNull()
      expect(screen.getByRole('button', { name: 'Weniger anzeigen' })).not.toBeNull()
    })

    it('ruft onShowLess bei einem direkten onClick-Aufruf auf (statt Klick-Simulation, Befund 25)', () => {
      const onShowLess = vi.fn()
      const { result } = renderHook(() => findButtonsByDirectCall(Pagination({
        mode: 'loadMore', shownCount: 24, totalCount: 24, canShowMore: false, canShowLess: true,
        onShowMore: () => {}, onShowLess, showMoreLabel: 'Weitere Beiträge anzeigen',
      })))

      const wenigerButton = result.current.find((button) => textContent(button.props.children as ReactNode).includes('Weniger anzeigen'))
      expect(wenigerButton).toBeTruthy()
      ;(wenigerButton!.props.onClick as () => void)()

      expect(onShowLess).toHaveBeenCalledTimes(1)
    })

    it('deaktiviert den Mehr-Button während loading', () => {
      render(
        <Pagination
          mode="loadMore"
          shownCount={15}
          totalCount={24}
          canShowMore
          canShowLess={false}
          onShowMore={() => {}}
          onShowLess={() => {}}
          showMoreLabel="Weitere Beiträge anzeigen"
          loading
        />,
      )

      expect(screen.getByRole('button', { name: 'Weitere Beiträge anzeigen' })).toHaveProperty('disabled', true)
    })

    it('rendert nichts, wenn weder mehr noch weniger angezeigt werden kann', () => {
      const { container } = render(
        <Pagination
          mode="loadMore"
          shownCount={3}
          totalCount={3}
          canShowMore={false}
          canShowLess={false}
          onShowMore={() => {}}
          onShowLess={() => {}}
          showMoreLabel="Weitere Beiträge anzeigen"
        />,
      )

      expect(container.firstChild).toBeNull()
    })

    it('nutzt eine eigene Weniger-Beschriftung, wenn showLessLabel übergeben wird', () => {
      render(
        <Pagination
          mode="loadMore"
          shownCount={24}
          totalCount={24}
          canShowMore={false}
          canShowLess
          onShowMore={() => {}}
          onShowLess={() => {}}
          showMoreLabel="Weitere Beiträge anzeigen"
          showLessLabel="Weniger Bilder anzeigen"
        />,
      )

      expect(screen.getByRole('button', { name: 'Weniger Bilder anzeigen' })).not.toBeNull()
    })
  })
})
