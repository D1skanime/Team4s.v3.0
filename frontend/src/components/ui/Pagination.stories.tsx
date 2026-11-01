import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Pagination } from './Pagination'

/** Seitennavigation für lange Listen: Zurück/Weiter plus Seitenfenster mit Lückenanzeige. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `Besteht aus: ${storybookDocsLink('Grundbausteine/Button', 'Button')}, ${storybookDocsLink('Grundbausteine/Text', 'Text')}. Unterstützt Klick-Modus (\`onPageChange\`) und Link-Modus (\`hrefForPage\`) für Seiten-Sprung-Navigation, sowie \`mode="loadMore"\` für cursor-/batch-basiertes Nachladen (Fortschrittstext + Weniger-/Mehr-Button statt Seiten-Sprung).`,
      },
    },
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

/** Echter `useState`-Zustand statt eines eingefrorenen `onPageChange: () => {}`-Platzhalters --
 *  jede Seitenzahl im Canvas ist dadurch tatsächlich klickbar (zeigt die neu ausgewählte Seite
 *  als "aktuell" an), auch wenn jede Story mit einer anderen Rand-Konfiguration startet. */
function ControlledPagination({ initialPage, totalPages }: { initialPage: number; totalPages: number }) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  return <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
}

// render() ignoriert args und baut seinen eigenen Seitenzahl-Zustand -- Platzhalter-args nur,
// weil Storybooks Typen bei einem Union-Props-Baustein ein vollständiges args-Objekt verlangen
// (identisches Muster wie die NachladeModus-Story unten).
const PLACEHOLDER_PAGES_ARGS = { currentPage: 1, totalPages: 1 }

export const MittenImVerlauf: Story = {
  name: 'Mitten im Verlauf',
  args: PLACEHOLDER_PAGES_ARGS,
  render: () => <ControlledPagination initialPage={2} totalPages={8} />,
}

export const ErsteSeite: Story = {
  name: 'Erste Seite',
  args: PLACEHOLDER_PAGES_ARGS,
  render: () => <ControlledPagination initialPage={1} totalPages={8} />,
  parameters: {
    docs: {
      description: { story: 'Prüft den deaktivierten "Zurück"-Button auf der ersten Seite -- auf eine andere Seitenzahl klicken zeigt, dass er danach wieder aktiv wird.' },
    },
  },
}

export const LetzteSeite: Story = {
  name: 'Letzte Seite',
  args: PLACEHOLDER_PAGES_ARGS,
  render: () => <ControlledPagination initialPage={8} totalPages={8} />,
  parameters: {
    docs: {
      description: { story: 'Prüft den deaktivierten "Weiter"-Button auf der letzten Seite -- auf eine andere Seitenzahl klicken zeigt, dass er danach wieder aktiv wird.' },
    },
  },
}

export const LueckeAufBeidenSeiten: Story = {
  name: 'Lücke auf beiden Seiten',
  args: PLACEHOLDER_PAGES_ARGS,
  render: () => <ControlledPagination initialPage={10} totalPages={20} />,
  parameters: {
    docs: {
      description: { story: 'Sehr lange Liste: Erste/letzte Seite bleiben sichtbar, der Rest wird über zwei Lücken ausgeblendet. Jede sichtbare Seitenzahl ist klickbar.' },
    },
  },
}

/**
 * Link-Modus für öffentliche, serverseitig gerenderte Listen: jede Seite bekommt über
 * `hrefForPage` eine echte URL statt eines reinen Klick-Callbacks -- funktioniert ohne
 * JavaScript und ist für Suchmaschinen crawlbar.
 */
export const LinkModus: Story = {
  name: 'Link-Modus',
  args: {
    currentPage: 3,
    totalPages: 8,
    hrefForPage: (page: number) => `/anime?page=${page}`,
  },
  parameters: {
    docs: {
      description: { story: 'Alle Seitenzahlen sowie Zurück/Weiter rendern als echte `<a>`-Links statt als Button mit Klick-Handler.' },
    },
  },
}

const LOAD_MORE_TOTAL = 24
const LOAD_MORE_BATCH = 9

/**
 * Nachlade-Modus für cursor-/batch-basierte Listen (z. B. eine Projektmitglied-Texte-/Bilder-
 * Sektion): bereits sichtbare Einträge bleiben beim Nachladen erhalten, statt wie im Seiten-Modus
 * durch eine andere Seite ersetzt zu werden. Echter Zustand über useState, damit Mehr/Weniger im
 * Canvas bedienbar ist.
 */
export const NachladeModus: Story = {
  name: 'Nachlade-Modus',
  // render() ignoriert args und baut seinen eigenen loadMore-Zustand -- Platzhalter-args nur,
  // weil Storybooks Typen bei einem Union-Props-Baustein ein vollständiges args-Objekt verlangen.
  args: { currentPage: 1, totalPages: 1 },
  render: () => {
    function Demo() {
      const [shownCount, setShownCount] = useState(15)
      const canShowMore = shownCount < LOAD_MORE_TOTAL
      const canShowLess = shownCount > 15
      const nextBatch = Math.min(LOAD_MORE_BATCH, LOAD_MORE_TOTAL - shownCount)

      return (
        <Pagination
          mode="loadMore"
          shownCount={shownCount}
          totalCount={LOAD_MORE_TOTAL}
          canShowMore={canShowMore}
          canShowLess={canShowLess}
          onShowMore={() => setShownCount((current) => Math.min(LOAD_MORE_TOTAL, current + LOAD_MORE_BATCH))}
          onShowLess={() => setShownCount(15)}
          showMoreLabel={nextBatch === 1 ? 'Weiteren 1 Beitrag anzeigen' : `Weitere ${nextBatch} Beiträge anzeigen`}
        />
      )
    }
    return <Demo />
  },
  parameters: {
    docs: {
      description: {
        story: 'Lädt in Batches nach, statt zu einer Seitenzahl zu springen -- der Fortschrittstext verschwindet, sobald alles geladen ist.',
      },
    },
  },
}
