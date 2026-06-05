import type { DomainProjectionReviewStatus } from './domain-projection'

export type MediaOwnershipOwnerType =
  | 'member'
  | 'fansub_group'
  | 'release_version'
  | 'release_theme'

export interface MediaOwnershipRow {
  id: number
  owner_type: MediaOwnershipOwnerType
  owner_id: number
  media_category: string
  visibility: string | null
  review_status: DomainProjectionReviewStatus | null
  review_status_label: string | null
  file_path: string
  original_file_path: string | null
  caption: string | null
  mime_type: string
}

export type MediaOwnershipProjectionResponse = MediaOwnershipRow[]
