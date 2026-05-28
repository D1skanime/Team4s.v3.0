import type { ProfileVisibility } from '@/types/profile'

export type MemberProfileFormState = {
  fansubName: string
  bio: string
  memberStory: unknown
  activeFromYear: string
  activeUntilYear: string
  isCurrentlyActive: boolean
  profileVisibility: ProfileVisibility
}
