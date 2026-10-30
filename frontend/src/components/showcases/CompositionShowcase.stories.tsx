import type { Meta, StoryObj } from '@storybook/nextjs'

import { CompositionShowcase } from './CompositionShowcase'

/**
 * Komposition: vier
 * typische Admin-Layer-Kompositionen (Liste, Edit-Formular, interaktive Liste,
 * Drawer-Anstoß) plus die drei verschachtelten Unterkomponenten
 * `MediaManagementCompositionShowcase`, `ProjectNoteShowcase` und
 * `ReleaseCompositionShowcase`, die hier als Kinder mitgerendert werden und deshalb
 * bewusst KEINE eigenen Top-Level-Stories bekommen (reine 1:1-Migration, keine
 * zusätzliche Aufsplittung gegenüber der ursprünglichen Seite).
 */
const meta = {
  title: 'Im Einsatz/Admin-Layer-Kompositionen',
  component: CompositionShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof CompositionShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    page: 2,
    onPageChange: () => {},
    onOpenDrawer: () => {},
  },
}
