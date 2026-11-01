import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { ThumbnailStrip } from './ThumbnailStrip'

// Vier lokale, stabile Bilddateien statt eines einzigen wiederholten Platzhalters — ThumbnailStrip
// rendert ausschließlich über `thumbnailUrl`, es gibt keinen zusätzlichen Styling-Einstiegspunkt
// je Kachel, daher ist eine echte Bildvielfalt der einzige Weg, um erkennbar unterscheidbare
// Kacheln zu zeigen. Alle vier liegen unter public/covers/ (der einzige für den Bild-Optimierer
// freigegebene lokale Pfad, siehe publicImagePatterns.mjs), keine externe Netzwerkabhängigkeit.
const DEMO_THUMBNAIL_URLS = [
  '/covers/placeholder.jpg',
  '/covers/cover_1775167905284_2cd26cdc-2530-4914-8dd7-2a90a55b3fcd.jpg',
  '/covers/cover_1775164698913_a216b01d-a000-4871-878d-46e3a41e08e8.jpg',
  '/covers/cover_1775171064368_2b331ca8-a66b-49f3-b9bb-62cd0508a44f.jpg',
]

function demoItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    key: index,
    thumbnailUrl: DEMO_THUMBNAIL_URLS[index % DEMO_THUMBNAIL_URLS.length],
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
        component: `Besteht aus: ${storybookDocsLink('Grundbausteine/ResponsiveImage', 'ResponsiveImage')}.`,
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
