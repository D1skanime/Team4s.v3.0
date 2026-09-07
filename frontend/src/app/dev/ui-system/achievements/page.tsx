import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { AchievementBadgeShowcase } from '../showcase/AchievementBadgeShowcase'

const ACHIEVEMENT_ARTWORK_DIRECTORY = path.join(
  process.cwd(),
  'public',
  'member-achievement-badges',
)

export default async function AchievementGalleryPage() {
  const sourceFiles = (await readdir(ACHIEVEMENT_ARTWORK_DIRECTORY, {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))

  return <AchievementBadgeShowcase sourceFiles={sourceFiles} />
}
