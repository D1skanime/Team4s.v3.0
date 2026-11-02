import type { Meta, StoryObj } from '@storybook/nextjs'

import { groupedEpisodesHandler } from '../../../../.storybook/mocks/handlers'
import { storybookDocsLink } from '@/lib/storybookLinks'

import { AnimeEpisodesSection } from './AnimeEpisodesSection'
import { freezingAnimeFansubsResponse, freezingFansubStoryGroups, freezingGroupedEpisodesResponse } from './AnimeDetailView.fixtures'

/** Zusammengesetzter Bereich für Gruppenauswahl, Gruppenkarte und die öffentliche Episodenliste. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Episoden-Bereich',
  component: AnimeEpisodesSection,
  tags: ['autodocs'],
  parameters: {
    msw: { handlers: [groupedEpisodesHandler(freezingGroupedEpisodesResponse)] },
    docs: {
      description: {
        component: `Besteht aus ${storybookDocsLink('Grundbausteine/Card', 'Card')} (Glasfläche), Gruppen-Auswahl, Gruppen-Kontext und Episoden-Browser. Die Umschalter verwenden in dieser Story echte Client-Anfragen, die zentral per MSW beantwortet werden.`,
      },
    },
  },
  args: {
    animeID: 13,
    animeSlug: 'freezing',
    animeFansubsResponse: freezingAnimeFansubsResponse,
    groupedEpisodesResponse: freezingGroupedEpisodesResponse,
    fansubStoryGroups: freezingFansubStoryGroups,
    episodeCount: 1,
  },
} satisfies Meta<typeof AnimeEpisodesSection>

export default meta
type Story = StoryObj<typeof meta>

export const MehrereFansubgruppen: Story = { name: 'Mehrere Fansubgruppen' }
