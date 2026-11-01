import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { Drawer } from '@/components/ui'

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

/** Echter `useState`-Zustand statt der eingefrorenen `onPageChange: () => {}`/`onOpenDrawer: () =>
 *  {}`-Platzhalter: Seitenzahlen in Komposition 1 sind klickbar, "Drawer-Demo starten" in
 *  Komposition 4 öffnet tatsächlich einen Drawer. */
function ControlledCompositionShowcase() {
  const [page, setPage] = useState(2)
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <>
      <CompositionShowcase page={page} onPageChange={setPage} onOpenDrawer={() => setDrawerOpen(true)} />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Release-Version v3.2 Clean Encode"
        description="Nur Mockdaten -- zeigt, dass Komposition 4s Auslöser-Button einen echten Drawer öffnet."
      >
        <p>Mock-Detailinhalt ohne API-Seam.</p>
      </Drawer>
    </>
  )
}

export const Standard: Story = {
  // render() ignoriert args und baut seinen eigenen Zustand -- Platzhalter-args nur, weil
  // Storybooks Typen ein vollständiges args-Objekt verlangen.
  args: { page: 2, onPageChange: () => {}, onOpenDrawer: () => {} },
  render: () => <ControlledCompositionShowcase />,
}
