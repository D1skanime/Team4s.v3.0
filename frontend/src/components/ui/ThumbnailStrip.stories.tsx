import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { ThumbnailStrip } from './ThumbnailStrip'

// Lokales Platzhalterbild statt externer Bildquelle — keine Netzwerkabhängigkeit.
function demoItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    key: index,
    thumbnailUrl: '/covers/placeholder.jpg',
  }))
}

/** Volle-Breite Thumbnail-Leiste unterhalb einer Bild-Bühne. Rendert bewusst nichts bei
 * weniger als zwei Einträgen — die Leer-Story zeigt diesen No-Op-Zustand. */
const meta = {
  title: 'Zusammengesetzte Bausteine/ThumbnailStrip',
  component: ThumbnailStrip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: ResponsiveImage.',
      },
    },
  },
  args: {
    items: demoItems(4),
    activeIndex: 0,
    onSelect: () => {},
    regionLabel: 'Bild-Vorschauen',
  },
} satisfies Meta<typeof ThumbnailStrip>

export default meta
type Story = StoryObj<typeof meta>

function StandardDemo() {
  const items = demoItems(4)
  const [activeIndex, setActiveIndex] = useState(0)
  return <ThumbnailStrip items={items} activeIndex={activeIndex} onSelect={setActiveIndex} regionLabel="Bild-Vorschauen" />
}

export const Standard: Story = {
  render: () => <StandardDemo />,
}

function VieleItemsDemo() {
  const items = demoItems(14)
  const [activeIndex, setActiveIndex] = useState(0)
  return <ThumbnailStrip items={items} activeIndex={activeIndex} onSelect={setActiveIndex} regionLabel="Bild-Vorschauen" />
}

export const VieleItems: Story = {
  name: 'Viele Einträge',
  render: () => <VieleItemsDemo />,
}

export const Leer: Story = {
  name: 'Leer',
  args: { items: [], activeIndex: 0, onSelect: () => {} },
  parameters: {
    docs: {
      description: { story: 'Rendert bewusst nichts: ThumbnailStrip zeigt sich erst ab zwei Einträgen.' },
    },
  },
}
