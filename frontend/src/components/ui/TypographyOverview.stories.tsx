import type { Meta, StoryObj } from '@storybook/nextjs'

import { Heading } from './Heading'
import { Text } from './Text'

/**
 * Reine Dokumentations-Komponente (keine eigenständige Produktkomponente, daher kein Export
 * aus index.ts): zeigt die vier Heading-Stufen und alle vier Text-Varianten nebeneinander mit
 * Beispieltexten, die echten Seiteninhalten ähneln. Nur in dieser Storybook-Datei lokal
 * definiert.
 */
function TypographyOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Heading level={1}>Naruto</Heading>
        <Heading level={2}>Anime bearbeiten</Heading>
        <Heading level={3}>Übersicht</Heading>
        <Heading level={4}>Verknüpfte Anime</Heading>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Text variant="body">Normaler Fließtext für Beschreibungen und Inhalte.</Text>
        <Text variant="soft">Leiser getönter Text, etwa für Sektions-Unterzeilen.</Text>
        <Text variant="meta">Kompakter Metatext, etwa für Seiten-Unterzeilen.</Text>
        <Text variant="small">Kleiner, zurückhaltender Hinweistext.</Text>
      </div>
    </div>
  )
}

const meta = {
  title: 'Grundbausteine/Typografie',
  component: TypographyOverview,
  tags: ['autodocs'],
} satisfies Meta<typeof TypographyOverview>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
