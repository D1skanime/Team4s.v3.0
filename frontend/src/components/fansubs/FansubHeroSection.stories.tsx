import type { Meta, StoryObj } from '@storybook/nextjs'

import { FansubHeroSection } from './FansubHeroSection'
import type { FansubGroup } from '@/types/fansub'

/**
 * Echte, produktive Public-Komponente (Mockdaten): zeigt die Kopfzeile einer Fansub-
 * Gruppenseite inkl. Status-Badge, Kennzahlen und optionalem Bannerfoto. Die Story
 * "AufgelöstMitBanner" macht den UAT-Kontrastfix für den Status-Badge (variant="muted") auf
 * dem dunklen Banner-Scrim sichtbar prüfbar -- vorher gab es keinen Storybook-Zustand, der
 * eine aufgelöste Gruppe MIT Bannerfoto zeigt.
 */
const activeGroup: FansubGroup = {
  id: 201,
  slug: 'active-subs',
  name: 'Active-Subs',
  logo_url: '/groups/cookie.png',
  banner_url: '',
  founded_year: 2010,
  dissolved_year: null,
  closed_year: null,
  status: 'active',
  website_url: 'https://example.test',
  discord_url: null,
  irc_url: null,
  country: 'Deutschland',
  anime_relations_count: 12,
  projects_count: 8,
  release_versions_count: 40,
  members_count: 6,
  aliases_count: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const dissolvedGroupWithBanner: FansubGroup = {
  id: 202,
  slug: 'new-subs',
  name: 'New-Subs',
  logo_url: '/groups/aoisora.png',
  banner_url: '/covers/cover_1775164698913_a216b01d-a000-4871-878d-46e3a41e08e8.jpg',
  founded_year: 1999,
  dissolved_year: 2015,
  closed_year: null,
  status: 'dissolved',
  website_url: null,
  discord_url: null,
  irc_url: null,
  country: 'Deutschland',
  anime_relations_count: 30,
  projects_count: 22,
  release_versions_count: 88,
  members_count: 0,
  aliases_count: 2,
  created_at: '1999-05-01T00:00:00Z',
  updated_at: '2015-12-31T00:00:00Z',
}

const sampleStats = [
  { label: 'Projekte', value: 8 },
  { label: 'Releases', value: 40 },
  { label: 'Mitglieder', value: 6 },
]

const meta = {
  title: 'Im Einsatz/FansubHeroSection',
  component: FansubHeroSection,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Echte, produktive Public-Komponente (Mockdaten). Rendert Logo, Titel, Status-Badge und Kennzahlen einer Fansub-Gruppe, optional vor einem Bannerfoto mit dunklem Scrim.',
      },
    },
  },
} satisfies Meta<typeof FansubHeroSection>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    group: activeGroup,
    stats: sampleStats,
  },
}

export const AufgelostMitBanner: Story = {
  name: 'Aufgelöst mit Banner',
  args: {
    group: dissolvedGroupWithBanner,
    stats: sampleStats,
  },
}
