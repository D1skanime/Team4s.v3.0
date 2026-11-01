import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { MediaFrame } from './MediaFrame'

/**
 * Fläche mit festem Seitenverhältnis für Bild- oder Video-Inhalte, eckig oder rund, mit
 * Zuständen für leer, "Datei wird darübergezogen" und deaktiviert. Basis für Upload-Flächen und
 * Medien-Vorschauen.
 */
const meta = {
  title: 'Grundbausteine/MediaFrame',
  component: MediaFrame,
  tags: ['autodocs'],
  args: {
    aspectRatio: 1,
  },
} satisfies Meta<typeof MediaFrame>

export default meta
type Story = StoryObj<typeof meta>

function Box({ children }: { children?: React.ReactNode }) {
  return <div style={{ width: 160 }}>{children}</div>
}

export const Leer: Story = {
  args: { state: 'empty' },
  render: (args) => (
    <Box>
      <MediaFrame {...args} />
    </Box>
  ),
}

export const DateiWirdDaruebergezogen: Story = {
  name: 'Datei wird darübergezogen',
  args: { state: 'dragging', bottomBadge: <Badge variant="muted">Zum Ersetzen loslassen</Badge> },
  render: (args) => (
    <Box>
      <MediaFrame {...args} />
    </Box>
  ),
}

export const Deaktiviert: Story = {
  args: { state: 'disabled' },
  render: (args) => (
    <Box>
      <MediaFrame {...args} />
    </Box>
  ),
}

export const Rund: Story = {
  name: 'Rund mit Eckmarke',
  args: { shape: 'round', cornerBadge: <Badge variant="muted">Jellyfin</Badge> },
  render: (args) => (
    <Box>
      <MediaFrame {...args} />
    </Box>
  ),
}

export const Breitbild: Story = {
  args: { aspectRatio: 16 / 9 },
  render: (args) => (
    <div style={{ width: 320 }}>
      <MediaFrame {...args} />
    </div>
  ),
}
