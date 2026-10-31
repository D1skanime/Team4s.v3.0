// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './Pagination'

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
    it('ruft onPageChange mit der angeklickten Seitenzahl auf', () => {
      const onPageChange = vi.fn()
      render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)

      fireEvent.click(screen.getByRole('button', { name: '3' }))

      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('ruft onPageChange mit der nächsten/vorherigen Seite bei Weiter/Zurück auf', () => {
      const onPageChange = vi.fn()
      render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)

      fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
      expect(onPageChange).toHaveBeenCalledWith(3)

      fireEvent.click(screen.getByRole('button', { name: /Zurück/ }))
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

  describe('Nachlade-Modus (mode="loadMore")', () => {
    it('zeigt den Fortschritt und den Mehr-Button, solange weitere Einträge nachladbar sind', () => {
      const onShowMore = vi.fn()
      render(
        <Pagination
          mode="loadMore"
          shownCount={15}
          totalCount={24}
          canShowMore
          canShowLess={false}
          onShowMore={onShowMore}
          onShowLess={() => {}}
          showMoreLabel="Weitere 9 Beiträge anzeigen"
        />,
      )

      expect(screen.getByText('15 von 24 angezeigt')).not.toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Weitere 9 Beiträge anzeigen' }))
      expect(onShowMore).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: 'Weniger anzeigen' })).toBeNull()
    })

    it('zeigt den Weniger-Button ohne Fortschrittstext, wenn bereits alles geladen ist', () => {
      const onShowLess = vi.fn()
      render(
        <Pagination
          mode="loadMore"
          shownCount={24}
          totalCount={24}
          canShowMore={false}
          canShowLess
          onShowMore={() => {}}
          onShowLess={onShowLess}
          showMoreLabel="Weitere Beiträge anzeigen"
        />,
      )

      expect(screen.queryByText(/von 24 angezeigt/)).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Weniger anzeigen' }))
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
