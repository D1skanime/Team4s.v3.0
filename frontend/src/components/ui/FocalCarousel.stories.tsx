import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Card } from './Card'
import type { FocalCarouselItemState } from './FocalCarousel'
import { FocalCarousel } from './FocalCarousel'
import { ResponsiveImage } from './ResponsiveImage'
import { Text } from './Text'

type DemoItem = { id: number; label: string; imageUrl: string }

// Lokales Platzhalterbild statt externer Bildquelle -- ausschließlich Mockdaten, keine
// Netzwerkabhängigkeit.
function demoItems(count: number): DemoItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    label: `Szene ${index + 1}`,
    imageUrl: '/covers/placeholder.jpg',
  }))
}

const DEMO_ITEMS = demoItems(5)

/** Komposition aus Card/ResponsiveImage/Text statt handgebauter Inline-Styles -- die
 *  Hervorhebung des aktiven Elements kommt über Cards vorhandene elevated-Variante
 *  (eigener Rahmen-/Schatten-Token), kein eigenes border-Inline-Style mehr. */
function renderItem(item: DemoItem, state: FocalCarouselItemState) {
  return (
    <Card variant={state.active ? 'elevated' : 'flat'} style={{ width: '14rem' }}>
      <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden', borderRadius: 'var(--radius-surface)' }}>
        <ResponsiveImage src={item.imageUrl} alt="" fill sizes="224px" style={{ objectFit: 'cover' }} />
      </div>
      <Text variant="meta">
        {item.label} ({state.position}/{state.total})
      </Text>
    </Card>
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
        component: `Besteht aus: ${storybookDocsLink('Grundbausteine/Button', 'Button')}, ${storybookDocsLink('Zusammengesetzte Bausteine/NavArrow', 'NavArrow')} (über FocalCarouselInternals).`,
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

export const VolleBreite: Story = {
  name: 'Volle Breite',
  args: { presentation: 'full-width' },
  parameters: {
    docs: {
      description: { story: 'Breite Karten mit Navigation unterhalb statt gedämpfter Nachbar-Vorschau.' },
    },
  },
}

export const GridScroll: Story = {
  name: 'Raster-Scroll',
  args: { presentation: 'grid-scroll', items: demoItems(8) },
  parameters: {
    docs: {
      description: { story: 'Links ausgerichtete, kachelgroße Elemente ohne gedämpften Fokus-Mittelpunkt -- für ein scrollendes Raster statt eines zentrierten Fokus-Karussells.' },
    },
  },
}

export const Einzelelement: Story = {
  name: 'Einzelelement',
  args: { items: demoItems(1) },
  parameters: {
    docs: {
      description: { story: 'Bei genau einem Element aktiviert FocalCarousel automatisch den internen "quiet"-Modus: keine Pfeile/Zähler, da es nichts zu navigieren gibt.' },
    },
  },
}

export const AlleAnzeigen: Story = {
  name: 'Alle anzeigen',
  args: {
    items: demoItems(9),
    showAllLabel: 'Alle anzeigen',
    showLessLabel: 'Weniger anzeigen',
    listLabel: 'Alle Szenen',
  },
  parameters: {
    docs: {
      description: { story: 'Mit gesetztem showAllLabel erscheint unterhalb des Karussells ein Erweitern-Auslöser, der alle Elemente als Raster zeigt (showLessLabel klappt wieder ein).' },
    },
  },
}
