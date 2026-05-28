import type { ProfileVisibility, TipTapDocument } from '@/types/profile'

export type MemberProfileFormState = {
  fansubName: string
  bio: string
  memberStory: TipTapDocument | null
  activeFromYear: string
  activeUntilYear: string
  isCurrentlyActive: boolean
  profileVisibility: ProfileVisibility
}
