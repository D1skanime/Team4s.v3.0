import type { Meta, StoryObj } from '@storybook/nextjs'

import { AchievementBadgeShowcase } from './AchievementBadgeShowcase'
import { ACHIEVEMENT_BADGE_SOURCE_FILES } from './AchievementBadgeShowcase.sourceFiles.fixture'

/**
 * Erfolgsbadge-Galerie (Rollen-Ketten, Fortschritts-/Rang-Stufen, Sonderfälle). Baut sich
 * selbst einen `RoleCatalogProvider` mit Mock-`loads` auf und braucht deshalb KEINEN
 * globalen Storybook-Decorator.
 */
const meta = {
  title: 'Zusammengesetzte Bausteine/Erfolgsbadge-Galerie',
  component: AchievementBadgeShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof AchievementBadgeShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { sourceFiles: ACHIEVEMENT_BADGE_SOURCE_FILES },
}
