import type { Meta, StoryObj } from '@storybook/nextjs'

import { BannerSection } from './BannerSection'
import { Card } from './Card'
import { Text } from './Text'

/** Card-Primitive: alle zehn dokumentierten Varianten aus CardProps, inkl. der beiden
 *  öffentlichen Glas-Varianten -- zweite offizielle Erscheinung derselben
 *  Kartenfläche auf Foto-/Bannerhintergrund statt der hellen Admin-Optik. */
const meta = {
  title: 'Grundbausteine/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Grundfläche mit optionalem Titel/Beschreibung -- kann Heading und Text als Titel enthalten ' +
          '(begründete Ausnahme in catalogTaxonomy.test.ts: Heading/Text sind geteilte Typografie-' +
          'Grundbausteine, keine sichtbar komponierte Baustein-Kombination wie bei PageHeader/' +
          'SectionHeader, die deshalb unter "Zusammengesetzte Bausteine" stehen).',
      },
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Standard',
  args: { title: 'Standard-Karte', description: 'Ruhige Standardfläche für die meisten Blöcke.' },
}

export const Elevated: Story = {
  name: 'Angehoben',
  args: { variant: 'elevated', title: 'Angehobene Karte', description: 'Für priorisierte Inhalte oder erste Einstiege.' },
}

export const Interactive: Story = {
  name: 'Interaktiv',
  args: { variant: 'interactive', title: 'Interaktive Karte', description: 'Hover-verstärkte Auswahlfläche.' },
}

export const Compact: Story = {
  name: 'Kompakt',
  args: { variant: 'compact', title: 'Kompakte Karte', description: 'Verdichtete Sektion für Listen oder kleine Hinweise.' },
}

export const Section: Story = {
  name: 'Abschnitt',
  args: { variant: 'section', title: 'Abschnitts-Karte', description: 'Umschließt eine ganze thematische Sektion.' },
}

export const Flat: Story = {
  name: 'Flach',
  args: { variant: 'flat', title: 'Flache Karte', description: 'Fläche ohne Schatten, für verschachtelte Bausteine.' },
}

export const Nested: Story = {
  name: 'Verschachtelt',
  args: { variant: 'nested', title: 'Verschachtelte Karte', description: 'Für Karten innerhalb einer anderen Karte.' },
}

export const NestedFlat: Story = {
  name: 'Verschachtelt flach',
  args: { variant: 'nestedFlat', title: 'Flache verschachtelte Karte', description: 'Flache Variante für verschachtelte Karten.' },
}

export const Glass: Story = {
  name: 'Glas',
  args: { variant: 'glass' },
  render: (args) => (
    <div style={{ position: 'relative', height: 200 }}>
      <BannerSection imageUrl="/covers/placeholder.jpg" imageAlt="Bannerhintergrund">
        <div style={{ position: 'relative', zIndex: 1, padding: 20 }}>
          <Card {...args}>
            <Text tone="onScrim">Durchscheinende Fläche auf Bannerhintergrund (6% Deckkraft, 12px Radius).</Text>
          </Card>
        </div>
      </BannerSection>
    </div>
  ),
}

export const GlassStrong: Story = {
  name: 'Glas kräftig',
  args: { variant: 'glassStrong' },
  render: (args) => (
    <div style={{ position: 'relative', height: 200 }}>
      <BannerSection imageUrl="/covers/placeholder.jpg" imageAlt="Bannerhintergrund">
        <div style={{ position: 'relative', zIndex: 1, padding: 20 }}>
          <Card {...args}>
            <Text tone="onScrim">Kräftigere Deckkraft-Stufe (10%, 6px Radius) -- für Reihen/Listenzeilen.</Text>
          </Card>
        </div>
      </BannerSection>
    </div>
  ),
}

export const RuhigeOeffentlicheFlaeche: Story = {
  name: 'Ruhige öffentliche Fläche',
  args: { variant: 'publicSection' },
  render: (args) => (
    <div style={{ padding: 20, background: '#1c1c1e' }}>
      <Card {...args}><Text tone="onScrim">Zurückhaltender Rahmen für einen Bereich mit hervorgehobenen Karten darin.</Text></Card>
    </div>
  ),
}

export const OeffentlicherHeroRahmen: Story = {
  name: 'Öffentlicher Hero-Rahmen',
  args: { variant: 'publicHero' },
  render: (args) => (
    <div style={{ padding: 20, background: 'var(--surface-stage)' }}>
      <Card {...args}><Text tone="onScrim">Rahmen für öffentliche Kopfbereiche mit schwebenden Steuerelementen.</Text></Card>
    </div>
  ),
}

export const OeffentlichePosterFlaeche: Story = {
  name: 'Öffentliche Poster-Fläche',
  args: { variant: 'publicPoster' },
  render: (args) => (
    <div style={{ padding: 20, background: 'var(--surface-stage)' }}>
      <Card {...args}><Text tone="onScrim">Durchscheinende Fläche für Poster und ergänzende Aktionen.</Text></Card>
    </div>
  ),
}

export const PaddingUeberschreibung: Story = {
  name: 'Innenabstand überschreiben (padding-Prop)',
  parameters: {
    docs: {
      description: {
        story:
          'Die glassStrong-Variante hat standardmäßig padding:0 (Aufrufer bringt eigene Struktur ' +
          'mit) -- die padding-Prop fordert pro Instanz eine der benannten Zweck-Polsterungen an, ' +
          'ohne dass der Aufrufer selbst eine padding-CSS-Regel schreiben müsste.',
      },
    },
  },
  render: () => (
    <div style={{ position: 'relative', height: 200 }}>
      <BannerSection imageUrl="/covers/placeholder.jpg" imageAlt="Bannerhintergrund">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, padding: 20 }}>
          <Card variant="glassStrong">
            <Text tone="onScrim">Standard (padding:0, Aufrufer polstert selbst)</Text>
          </Card>
          <Card variant="glassStrong" padding="content">
            <Text tone="onScrim">padding=&quot;content&quot; (volle Innenabstand-Polsterung, z. B. Vorschaukarte der Randnavigation)</Text>
          </Card>
          <Card variant="glassStrong" padding="nestedBlock">
            <Text tone="onScrim">padding=&quot;nestedBlock&quot; (Innenabstand eines verschachtelten Inhaltsblocks)</Text>
          </Card>
        </div>
      </BannerSection>
    </div>
  ),
}

export const RandBisRandUnterhalb767px: Story = {
  name: 'Rand-bis-Rand unterhalb 767px (bleedBelowMd)',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story:
          'bleedBelowMd kollabiert unterhalb 767px Cards horizontale Polsterung auf 0 und ' +
          'zentriert die Grid-Kinder -- für einen verschachtelten Inhaltsblock (hier die ' +
          'Poster-Metadaten-Karte des Anime-Kopfs), der auf schmaler Breite bis an den Rand ' +
          'seines äußeren Containers reichen soll, statt den eigenen Innenabstand mitzutragen. ' +
          'Diese Story simuliert die schmale Breite per fester Viewport-Dekoration statt ' +
          'tatsächlichem Fenster-Resize (narrow-viewport decorator).',
      },
    },
  },
  render: () => (
    <div style={{ width: 320, background: 'var(--surface-stage)', padding: 20 }}>
      <Card variant="nested" padding="nestedBlock" bleedBelowMd>
        <Text>Reicht unterhalb 767px bis an den Rand der äußeren Karte und zentriert ihre Kinder.</Text>
      </Card>
    </div>
  ),
}

export const GlasAufHintergrund: Story = {
  name: 'Glas auf Hintergrund (alle Tönungen)',
  parameters: {
    docs: {
      description: {
        story:
          'Alle vier Episoden-Tönungen des generischen tintHue-Hooks nebeneinander -- ' +
          'Haupthandlung (222°), Filler (2°), Gemischt (272°), Rückblick (42°).',
      },
    },
  },
  render: () => (
    <div style={{ position: 'relative', height: 260 }}>
      <BannerSection imageUrl="/covers/placeholder.jpg" imageAlt="Bannerhintergrund">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, padding: 20, flexWrap: 'wrap' }}>
          <Card variant="glass" tintHue={222} style={{ padding: 12 }}>
            <Text tone="onScrim">Haupthandlung</Text>
          </Card>
          <Card variant="glass" tintHue={2} style={{ padding: 12 }}>
            <Text tone="onScrim">Filler</Text>
          </Card>
          <Card variant="glass" tintHue={272} style={{ padding: 12 }}>
            <Text tone="onScrim">Gemischt</Text>
          </Card>
          <Card variant="glass" tintHue={42} style={{ padding: 12 }}>
            <Text tone="onScrim">Rückblick</Text>
          </Card>
        </div>
      </BannerSection>
    </div>
  ),
}
