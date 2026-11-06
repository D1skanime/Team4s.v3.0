import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Badge } from './Badge'
import { BannerSection } from './BannerSection'
import { Text } from './Text'

/** Abschnitt mit Bannerbild-Hintergrund + WCAG-AA-Scrim -- übernimmt die Positionierungsrolle
 *  einer seiten-eigenen Hero-Banner-Box, braucht deshalb einen positionierten Eltern-Container
 *  mit fester Höhe (hier über die Story-Dekoration simuliert). */
const meta = {
  title: 'Zusammengesetzte Bausteine/BannerSection',
  component: BannerSection,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `Besteht aus: ${storybookDocsLink('Grundbausteine/ResponsiveImage', 'ResponsiveImage')} für das ` +
          'Hintergrundbild sowie einem eigenen Scrim-/Badge-Layer. Fachbausteine wie AnimeBackdropRotator ' +
          'werden als `children` innerhalb des Abschnitts komponiert (kein eigener Storybook-Link, da kein ' +
          'components/ui-Baustein).',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 240, borderRadius: 12, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    imageUrl: '/covers/placeholder.jpg',
    imageAlt: 'Frühlingsblüten über Tokio Hintergrundbild',
  },
} satisfies Meta<typeof BannerSection>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const OhneBild: Story = {
  name: 'Ohne Bild',
  args: { imageUrl: null },
}

export const MitStarkemScrimUndBadge: Story = {
  name: 'Mit starkem Scrim und Badge',
  args: {
    withTextScrim: true,
    badge: <Badge variant="onMedia">Ongoing</Badge>,
  },
}

export const AnimeOptik: Story = {
  name: 'Anime-Optik',
  args: { variant: 'anime' },
  parameters: {
    docs: {
      description: {
        story:
          'variant="anime" reproduziert die bisherige, schwächer kontrastierte Backdrop-Rezeptur der ' +
          'Anime-Detailseite (blur(20px), scale(1.1), ohne brightness/saturate-Abweichung) inklusive ' +
          'vertikaler Ausblendmaske zum Seitenhintergrund -- sichtbar schwächer unscharf/abgedunkelt als die ' +
          'Standardvariante oben, die restliche Standardvariante (andere Aufrufer) bleibt davon unberührt.',
      },
    },
  },
}

export const MitInhaltsabhaengigerHoehe: Story = {
  name: 'Mit inhaltsabhängiger Höhe (fillHeight)',
  // Überschreibt den festen 240px-Decorator des Meta-Objekts bewusst durch einen eigenen,
  // AUTO-hohen Vorfahren -- demonstriert genau den Fall, für den fillHeight gedacht ist (z. B.
  // eine Storybook-Vorschau-Bühne hinter unterschiedlich hohem Beispielinhalt statt einer festen
  // Seiten-Hero-Höhe). Der sichtbare Beispielinhalt lebt bewusst als NORMAL fließendes Geschwister
  // NEBEN BannerSection (nicht als dessen `children`) -- BannerSection selbst bleibt
  // `position:absolute` und kann deshalb nicht die eigene Höhe des Vorfahren bestimmen; das muss
  // ein tatsächlich im Textfluss stehendes Element übernehmen (identisches Muster wie
  // `ReleasePreviewRow.stories.tsx`s Decorator).
  args: { fillHeight: true },
  render: (args) => (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      <BannerSection {...args} />
      <div style={{ position: 'relative', padding: 24 }}>
        <Text tone="onScrim">
          Dieser Beispielinhalt ist absichtlich mehrzeilig lang, um zu zeigen, dass die
          Hintergrund-/Scrim-Fläche bis zur tatsächlichen Inhaltshöhe mitwächst, statt bei der
          festen --banner-height der echten Seiten-Hero-Sektion abzuschneiden.
        </Text>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'fillHeight=true ersetzt die feste --banner-height/--banner-height-mobile durch CSS ' +
          'inset:0 -- die Fläche wächst dadurch exakt mit der Höhe ihres positionierten Vorfahren ' +
          'mit, unabhängig davon, ob diese erst durch variablen Inhalt entsteht.',
      },
    },
  },
}
