// Spiegelt backend/internal/repository/release_detail_public_repository.go DTOs
// (snake_case JSON tags) für GET /anime/:id/group/:groupId/releases/:releaseVersionId (AO4-02).

import type { ReleaseVersionMediaCategory } from "@/types/releaseVersionMedia";

export interface PublicReleaseContributor {
  fansub_group_id?: number;
  member_id: number;
  name: string;
  role_label: string;
  avatar_url: string | null;
}

export interface PublicReleaseImage {
  id: number;
  fansub_group_id?: number | null;
  category: ReleaseVersionMediaCategory;
  thumbnail_url: string | null;
  original_url: string | null;
  caption: string | null;
  /** Anzeigename des Hochladers, null wenn kein Hochlader hinterlegt/aufloesbar (AO4-18 Autor-Chip). */
  author_name: string | null;
  is_preview_candidate: boolean;
}

export interface PublicReleaseNote {
  id: number;
  fansub_group_id?: number | null;
  title?: string | null;
  member_name: string;
  member_id: number;
  member_avatar_url: string | null;
  role_label: string;
  body_html: string;
  created_at: string;
}

export interface PublicReleaseGroup {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
}

export interface PublicReleaseSubtitleTrack {
  language: string | null;
  label: string;
  format: string | null;
  forced: boolean;
  default: boolean;
}

export interface PublicReleaseSegment {
  theme_segment_id: number;
  name: string;
  type: string;
  start_seconds: number | null;
  end_seconds: number | null;
  duration_seconds: number | null;
  readiness: "ready" | "unavailable";
  participants: PublicReleaseContributor[];
  preview_url: string | null;
  /**
   * Hoechste Episodennummer, fuer die dieses (geteilte) Segment ebenfalls
   * zugewiesen ist -- fehlt/null, wenn das Segment nur dieser einen Folge
   * zugeordnet ist (UI-SPEC Surface 3, "Gilt auch fuer Folge {von}-{bis}"-Badge, D-02).
   */
  applies_through_episode?: string | null;
}

export interface PublicReleaseNavigationTarget {
  release_version_id: number;
  episode_number: string;
  episode_title: string | null;
  version: string;
  group_id: number;
}

export interface ReleaseDetailResponse {
  release_version_id: number;
  episode_number: string;
  episode_title: string | null;
  title: string;
  version: string;
  groups: PublicReleaseGroup[];
  release_date: string | null;
  duration_seconds: number | null;
  resolution: string | null;
  container: string | null;
  video_codec: string | null;
  audio_codec: string | null;
  audio_language: string | null;
  subtitle_tracks: PublicReleaseSubtitleTrack[];
  subtitle_type?: string | null;
  preview_image: PublicReleaseImage | null;
  image_category_totals: Record<ReleaseVersionMediaCategory, number>;
  segments: PublicReleaseSegment[];
  previous: PublicReleaseNavigationTarget | null;
  next: PublicReleaseNavigationTarget | null;
  images_count: number;
  notes_count: number;
  contributors_count: number;
  contributors: PublicReleaseContributor[];
  images: PublicReleaseImage[];
  notes: PublicReleaseNote[];
}

// Generische Seek-Cursor-Seiten-Huelle (AO4-03/AO4-24) fuer die drei nachladenden
// Listen (vollstaendige Release-Liste, Bildergalerie, Textliste). Spiegelt die
// Backend-Result-Structs (GroupReleasesCursorPage, ReleaseImagesCursorPage,
// ReleaseNotesCursorPage), die alle identisch items/next_cursor/has_more liefern.
export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ReleaseImagesCursorPage extends CursorPage<PublicReleaseImage> {
  category: ReleaseVersionMediaCategory;
  total: number;
  returned_count: number;
}
