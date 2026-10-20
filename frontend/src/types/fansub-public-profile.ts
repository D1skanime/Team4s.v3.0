import type { FansubGroup, FansubGroupLink } from "./fansub";

export interface PublicFansubStory {
  id: number;
  title: string;
  body_html: string;
  body_text: string;
  updated_at?: string;
}

export interface PublicFansubProject {
  id: number;
  anime_slug: string;
  title: string;
  type: string;
  status: string;
  year?: number | null;
  cover_image?: string | null;
  max_episodes?: number | null;
  banner_url?: string | null;
}

// FansubProjectNavigationEntry (Plan 155-01) is the narrow sibling-project
// projection the resolver returns for Previous/Next-style navigation. It is
// intentionally NOT PublicFansubProject -- only the three fields
// buildFansubProjectNavigation's comparator reads.
export interface FansubProjectNavigationEntry {
  id: number;
  title: string;
  anime_slug: string;
}

// FansubProjectResolution (Plan 155-01) is the narrow identity a pretty route
// needs to resolve groupSlug+animeSlug without loading the full public
// fansub profile.
export interface FansubProjectResolution {
  /** Existing current-project artwork; same selection as PublicFansubProject. */
  banner_url?: string | null;
  cover_image?: string | null;
  group_id: number;
  anime_id: number;
  anime_slug: string;
  projects: FansubProjectNavigationEntry[];
}

export interface FansubProjectResolutionResponse {
  data: FansubProjectResolution;
}

export interface PublicFansubHistory {
  id: number;
  year?: number | null;
  event_type: string;
  title?: string | null;
  note?: string | null;
  status: string;
}

export interface PublicFansubMediaItem {
  id: number;
  media_type: string;
  caption?: string | null;
  mime_type: string;
  thumbnail_url?: string | null;
  original_url?: string | null;
  display_url?: string | null;
  title?: string | null;
  description?: string | null;
  category: string;
}

export interface PublicFansubProfile {
  group: FansubGroup;
  stories: PublicFansubStory[];
  projects: PublicFansubProject[];
  history: PublicFansubHistory[];
  media: PublicFansubMediaItem[];
  community_links: FansubGroupLink[];
}

export interface PublicFansubProfileResponse {
  data: PublicFansubProfile;
}
