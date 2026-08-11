// Domain-Typen der oeffentlichen Projekt-Member-Seite (Member × Fansubgruppe × Anime, Phase 122).
// Spiegelt die Backend-DTOs (ProjectMemberPublicHandler) und die OpenAPI-ProjectMember*-Schemas.

export interface ProjectMemberCounts {
  roles: number
  notes: number
  media: number
  releases: number
}

export interface ProjectMemberSummary {
  member_id: number
  member_slug: string | null
  member_display_name: string
  member_avatar_url: string | null
  is_verified: boolean
  role_labels: string[]
  counts: ProjectMemberCounts
}

export interface ProjectMemberNote {
  id: number
  title: string | null
  body_html: string
  body_text: string
  role_label: string
  episode_label: string
  release_version_label: string
  release_version_id: number
  created_at: string
}

export interface ProjectMemberMediaItem {
  id: number
  media_asset_id: number
  category: string
  caption: string | null
  episode_label: string
  release_version_label: string
  release_version_id: number
  created_at: string
  thumbnail_url: string
  preview_url: string
}

export interface ProjectMemberRelease {
  release_version_id: number
  episode_label: string
  version_label: string
  confirmed_at: string | null
  role_labels: string[]
}
