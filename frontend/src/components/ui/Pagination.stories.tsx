import type { Meta, StoryObj } from '@storybook/nextjs'

import { Pagination } from './Pagination'

/** Seitennavigation für lange Listen: Zurück/Weiter plus Seitenfenster. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Button.',
      },
    },
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const MittenImVerlauf: Story = {
  name: 'MittenImVerlauf',
  args: { currentPage: 2, totalPages: 8, onPageChange: () => {} },
}

export const ErsteSeite: Story = {
  name: 'ErsteSeite',
  args: { currentPage: 1, totalPages: 8, onPageChange: () => {} },
  parameters: {
    docs: {
      description: { story: 'Prüft den deaktivierten "Zurück"-Button auf der ersten Seite.' },
    },
  },
}

export const LetzteSeite: Story = {
  name: 'LetzteSeite',
  args: { currentPage: 8, totalPages: 8, onPageChange: () => {} },
  parameters: {
    docs: {
      description: { story: 'Prüft den deaktivierten "Weiter"-Button auf der letzten Seite.' },
    },
  },
}
