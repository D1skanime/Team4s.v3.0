import type { Meta, StoryObj } from '@storybook/nextjs'

import { AnimeListView } from './AnimeListView'
import {
  emptyResponse,
  longTitleResponse,
  manyPageResponse,
  missingCoverResponse,
  normalResponse,
} from './AnimeListView.fixtures'

/**
 * Pilot-Story für "ganze Seiten" in Storybook: rendert die echte öffentliche Anime-Listenseite
 * (Server/Ansicht-Split, siehe `AnimeListView.tsx`) mit realistischen deutschen Fixture-Daten,
 * ohne dass ein Backend läuft. Vorbild für künftige Seiten-Migrationen in dieses Katalog-Muster.
 */
const meta = {
  title: 'Im Einsatz/Öffentlich/Anime-Liste',
  component: AnimeListView,
  tags: ['autodocs'],
} satisfies Meta<typeof AnimeListView>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {
  args: {
    response: normalResponse,
    letter: '',
    perPage: 24,
    gridQuery: 'letter=&per_page=24',
  },
}

export const Leer: Story = {
  args: {
    response: emptyResponse,
    letter: 'Z',
    perPage: 24,
    gridQuery: 'letter=Z&per_page=24',
  },
}

export const Fehler: Story = {
  args: {
    response: null,
    letter: '',
    perPage: 24,
    gridQuery: '',
  },
}

export const VieleSeiten: Story = {
  args: {
    response: manyPageResponse,
    letter: '',
    perPage: 24,
    gridQuery: 'letter=&per_page=24',
  },
}

export const LangerTitel: Story = {
  args: {
    response: longTitleResponse,
    letter: '',
    perPage: 24,
    gridQuery: 'letter=&per_page=24',
  },
}

export const FehlendesBild: Story = {
  args: {
    response: missingCoverResponse,
    letter: '',
    perPage: 24,
    gridQuery: 'letter=&per_page=24',
  },
}
