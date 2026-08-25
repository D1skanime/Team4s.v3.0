import type { PublicFansubStory } from '@/types/fansub'

export function hasStoriesContent(stories: PublicFansubStory[]): boolean {
  return stories.some((story) => Boolean(story.title?.trim() || story.body_html?.trim() || story.body_text?.trim()))
}
