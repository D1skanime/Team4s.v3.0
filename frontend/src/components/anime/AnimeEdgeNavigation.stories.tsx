import type { Meta, StoryObj } from '@storybook/nextjs'

import { buildAnimeDetailHref } from '@/lib/animeGridContext'

import { AnimeEdgeNavigation } from './AnimeEdgeNavigation'

// Die beiden Nachbarn stammen aus derselben Fixture (animeNavigationFixture, animeFixtures.ts),
// die der MSW-Listenhandler für die Vorschaukarte beantwortet -- die Navigations-HREFs selbst
// werden serverseitig berechnet und müssen deshalb als fertige Props übergeben werden, statt sie
// im Browser selbst zu ermitteln.
const previous = { href: buildAnimeDetailHref(12, 'page=1&per_page=24'), label: 'Zurück', ariaLabel: 'Vorheriger Anime: Freezing: Erstes Kapitel' }
const next = { href: buildAnimeDetailHref(14, 'page=1&per_page=24'), label: 'Weiter', ariaLabel: 'Nächster Anime: Freezing: Vibration' }

const meta = {
  title: 'Zusammengesetzte Bausteine/Anime-Randnavigation',
  component: AnimeEdgeNavigation,
  tags: ['autodocs', 'anime-navigation-regression'],
  parameters: {
    docs: { description: { component: 'Zurück- und Weiter-Overlay innerhalb eines Anime-Grid-Kontexts. Die Links selbst kommen bereits fertig als serverseitig aufgelöste Props; Hover oder Fokus lädt nur noch die Vorschaukarte über den zentralen MSW-Listenhandler.' } },
  },
  decorators: [(Story) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: 56 }}><Story /></div>],
  args: { currentAnimeID: 13, gridQuery: 'page=1&per_page=24', previous, next },
} satisfies Meta<typeof AnimeEdgeNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const MitNachbarn: Story = { name: 'Mit Zurück und Weiter' }
