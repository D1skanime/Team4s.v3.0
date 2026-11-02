import type { Meta, StoryObj } from '@storybook/nextjs'

import { AnimeEdgeNavigation } from './AnimeEdgeNavigation'

const meta = {
  title: 'Zusammengesetzte Bausteine/Anime-Randnavigation',
  component: AnimeEdgeNavigation,
  tags: ['autodocs', 'anime-navigation-regression'],
  parameters: {
    docs: { description: { component: 'Zurück- und Weiter-Overlay innerhalb eines Anime-Grid-Kontexts. Hover oder Fokus lädt die echten Vorschaukarten über den zentralen MSW-Listenhandler.' } },
  },
  decorators: [(Story) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: 56 }}><Story /></div>],
  args: { currentAnimeID: 13, gridQuery: 'page=1&per_page=24' },
} satisfies Meta<typeof AnimeEdgeNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const MitNachbarn: Story = { name: 'Mit Zurück und Weiter' }
