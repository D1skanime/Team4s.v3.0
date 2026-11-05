import type { Meta, StoryObj } from '@storybook/nextjs'

import { BannerSection } from '@/components/ui/BannerSection'
import { storybookDocsLink } from '@/lib/storybookLinks'

import { FansubGroupContext } from './FansubGroupContext'

const meta = {
  title: 'Zusammengesetzte Bausteine/Fansubgruppen-Karte',
  component: FansubGroupContext,
  tags: ['autodocs'],
  decorators: [(Story) => <div style={{ position: 'relative', padding: 20 }}><BannerSection imageUrl="/covers/placeholder.jpg" imageAlt="Hintergrund" /><div style={{ position: 'relative' }}><Story /></div></div>],
  parameters: {
    docs: { description: { component: `Besteht aus ${storybookDocsLink('Grundbausteine/Card', 'Card')} (variant="glass", eigene Innenabstand-Zweckstufe), ${storybookDocsLink('Grundbausteine/Stack', 'Stack')} (interner Name-/Vorschautext-/Aktionsreihen-Rhythmus), ${storybookDocsLink('Grundbausteine/Cluster', 'Cluster')} (rechtsbündige Sekundär-Aktionsreihe), ${storybookDocsLink('Grundbausteine/Heading', 'Heading')}, ${storybookDocsLink('Grundbausteine/Text', 'Text')} und ${storybookDocsLink('Grundbausteine/Button', 'Button')}.` } },
  },
  args: {
    activeGroup: { id: 101, slug: 'bloody-shadow', name: 'Bloody-Shadow', story_preview: 'Veröffentlicht die Folgen von Freezing als gemeinsames Projekt.' },
    animeSlug: 'freezing',
  },
} satisfies Meta<typeof FansubGroupContext>

export default meta
type Story = StoryObj<typeof meta>

export const MitGeschichte: Story = { name: 'Mit Geschichte' }
export const OhneGeschichte: Story = { name: 'Ohne Geschichte', args: { activeGroup: { id: 102, slug: 'lazy-subs', name: 'LazySubs' } } }
