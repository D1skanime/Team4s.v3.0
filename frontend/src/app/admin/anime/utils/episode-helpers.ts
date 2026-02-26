import { EpisodeListItem } from '@/types/anime'
import { FansubGroup } from '@/types/fansub'

export function suggestNextEpisodeNumber(episodes: EpisodeListItem[]): string | null {
  const numeric = episodes
    .map((episode) => (episode.episode_number || '').trim())
    .filter((value) => /^\d+$/.test(value))
    .map((value) => ({ value, number: Number.parseInt(value, 10) }))
    .filter((item) => Number.isFinite(item.number) && item.number > 0)

  if (numeric.length === 0) {
    return null
  }

  const maxItem = numeric.reduce((acc, item) => (item.number > acc.number ? item : acc), numeric[0])
  const width = Math.max(2, maxItem.value.length)
  return String(maxItem.number + 1).padStart(width, '0')
}

export function buildFansubStoryPreview(group: FansubGroup): string {
  const raw = (group.history || group.description || '').trim()
  if (!raw) return 'Keine Historie hinterlegt.'
  const normalized = raw.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const maxLength = 420
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}
