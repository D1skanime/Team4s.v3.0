import type { Meta, StoryObj } from '@storybook/nextjs'

import type { FocalCarouselItemState } from './FocalCarousel'
import { FocalCarousel } from './FocalCarousel'

type DemoItem = { id: number; label: string; imageUrl: string }

// Lokales Platzhalterbild statt externer Bildquelle — Storybook zeigt wie die frühere
// In-App-Showcase ausschließlich Mockdaten, keine Netzwerkabhängigkeit.
const DEMO_ITEMS: DemoItem[] = Array.from({ length: 5 }, (_, index) => ({
  id: index,
  label: `Szene ${index + 1}`,
  imageUrl: '/covers/placeholder.jpg',
}))

function renderItem(item: DemoItem, state: FocalCarouselItemState) {
  return (
    <div
      style={{
        border: state.active ? '2px solid var(--accent-primary, #2d5fe8)' : '1px solid var(--surface-border, #d8dce1)',
        borderRadius: 12,
        overflow: 'hidden',
        width: 220,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl} alt="" style={{ width: '100%', display: 'block' }} />
      <p style={{ margin: 0, padding: 8, fontSize: 13 }}>
        {item.label} ({state.position}/{state.total})
      </p>
    </div>
  )
}

/** Fokussiertes Karussell-Primitive mit Nachbar-Vorschau und Tastatur-/Pointer-Navigation. */
const meta = {
  title: 'Zusammengesetzte Bausteine/FocalCarousel',
  component: FocalCarousel<DemoItem>,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Button, NavArrow (über FocalCarouselInternals).',
      },
    },
  },
  args: {
    items: DEMO_ITEMS,
    getItemKey: (item: DemoItem) => item.id,
    renderItem,
    regionLabel: 'Szenen-Karussell',
    itemSingularLabel: 'Szene',
    itemPluralLabel: 'Szenen',
    previousLabel: 'Vorherige Szene',
    nextLabel: 'Nächste Szene',
    showCounter: true,
  },
} satisfies Meta<typeof FocalCarousel<DemoItem>>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
