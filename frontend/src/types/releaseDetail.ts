// Spiegelt backend/internal/repository/release_detail_public_repository.go DTOs
// (snake_case JSON tags) für GET /anime/:id/group/:groupId/releases/:releaseVersionId (AO4-02).

import type { ReleaseVersionMediaCategory } from "@/types/releaseVersionMedia";

export interface PublicReleaseContributor {
  member_id: number;
  name: string;
  role_label: string;
}

export interface PublicReleaseImage {
  id: number;
  category: ReleaseVersionMediaCategory;
  thumbnail_url: string | null;
  original_url: string | null;
  caption: string | null;
}

export interface PublicReleaseNote {
  id: number;
  member_name: string;
  role_label: string;
  body_html: string;
  created_at: string;
}

export interface ReleaseDetailResponse {
  release_version_id: number;
  episode_number: string;
  title: string;
  release_date: string | null;
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
