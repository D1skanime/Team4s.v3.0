import type { Meta, StoryObj } from '@storybook/nextjs'

import { Pagination } from './Pagination'

/** Seitennavigation für lange Listen: Zurück/Weiter plus Seitenfenster mit Lückenanzeige. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Button, Text. Unterstützt Klick-Modus (`onPageChange`) und Link-Modus (`hrefForPage`).',
      },
    },
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const MittenImVerlauf: Story = {
  name: 'Mitten im Verlauf',
  args: { currentPage: 2, totalPages: 8, onPageChange: () => {} },
}

export const ErsteSeite: Story = {
  name: 'Erste Seite',
  args: { currentPage: 1, totalPages: 8, onPageChange: () => {} },
  parameters: {
    docs: {
      description: { story: 'Prüft den deaktivierten "Zurück"-Button auf der ersten Seite.' },
    },
  },
}

export const LetzteSeite: Story = {
  name: 'Letzte Seite',
  args: { currentPage: 8, totalPages: 8, onPageChange: () => {} },
  parameters: {
    docs: {
      description: { story: 'Prüft den deaktivierten "Weiter"-Button auf der letzten Seite.' },
    },
  },
}

export const LueckeAufBeidenSeiten: Story = {
  name: 'Lücke auf beiden Seiten',
  args: { currentPage: 10, totalPages: 20, onPageChange: () => {} },
  parameters: {
    docs: {
      description: { story: 'Sehr lange Liste: Erste/letzte Seite bleiben sichtbar, der Rest wird über zwei Lücken ausgeblendet.' },
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
