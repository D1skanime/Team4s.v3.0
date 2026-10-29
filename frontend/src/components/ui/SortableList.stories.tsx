import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { SortableList } from './SortableList'

type DemoItem = { id: string; label: string }

const BASE_ITEMS: DemoItem[] = [
  { id: '1', label: 'Opening-Screenshot' },
  { id: '2', label: 'Typesetting-Beispiel' },
  { id: '3', label: 'Karaoke-Vorschau' },
  { id: '4', label: 'Release-Vergleich' },
]

const LONG_ITEMS: DemoItem[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  label: `Medien-Eintrag ${index + 1}`,
}))

function renderRow(item: DemoItem) {
  return (
    <div style={{ padding: '8px 12px', border: '1px solid var(--surface-border, #d8dce1)', borderRadius: 8, marginBottom: 6, background: 'var(--surface-card, #fff)' }}>
      {item.label}
    </div>
  )
}

/** Drag&Drop-Sortierliste ohne eigenes Erscheinungsbild — der Aufrufer liefert `renderItem`. */
const meta = {
  title: 'UI/SortableList',
  component: SortableList<DemoItem>,
  tags: ['autodocs'],
  // Platzhalter-Args für den generischen Typ; jede Story liefert ihre eigene
  // items/getItemId/onReorder/renderItem-Kombination über `render`.
  args: {
    items: BASE_ITEMS,
    getItemId: (item: DemoItem) => item.id,
    onReorder: () => {},
    renderItem: renderRow,
  },
} satisfies Meta<typeof SortableList<DemoItem>>

export default meta
type Story = StoryObj<typeof meta>

function StandardDemo() {
  const [items, setItems] = useState(BASE_ITEMS)
  return (
    <SortableList items={items} getItemId={(item) => item.id} onReorder={setItems} renderItem={renderRow} label="Medien-Sortierung" />
  )
}

export const Standard: Story = {
  render: () => <StandardDemo />,
}

export const Disabled: Story = {
  render: () => (
    <SortableList items={BASE_ITEMS} getItemId={(item) => item.id} onReorder={() => {}} renderItem={renderRow} disabled label="Gesperrte Sortierung" />
  ),
}

export const LeereListe: Story = {
  name: 'LeereListe',
  render: () => (
    <SortableList items={[]} getItemId={(item: DemoItem) => item.id} onReorder={() => {}} renderItem={renderRow} label="Leere Sortierung" />
  ),
}

function LangeListeDemo() {
  const [items, setItems] = useState(LONG_ITEMS)
  return (
    <SortableList items={items} getItemId={(item) => item.id} onReorder={setItems} renderItem={renderRow} label="Lange Medien-Sortierung" />
  )
}

export const LangeListe: Story = {
  name: 'LangeListe',
  render: () => <LangeListeDemo />,
}
