import type {
  AdminAnimeThemeSegment,
  AdminFansubAnimeEntry,
} from "@/types/admin";
import type {
  AdminFansubRelease,
  FansubGroupCapabilities,
  FansubGroupLinkType,
  FansubGroupType,
  FansubStatus,
} from "@/types/fansub";
import type { MainTab as MainTabType } from "./mainTabRouting";

export type ReleasePaginationState = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type SectionKey =
  | "basic"
  | "media"
  | "links"
  | "collaboration"
  | "releases"
  | "notes"
  | "mitglieder"
  | "claims"
  | "vorschlaege"
  | "readiness";
// MainTab aus mainTabRouting.ts — enthält dieselben Schlüssel wie SectionKey
export type MainTab = MainTabType;

export type FormState = {
  name: string;
  slug: string;
  status: FansubStatus;
  groupType: FansubGroupType;
  country: string;
  foundedYear: string;
  dissolvedYear: string;
};

export type CommunityLinkDraft = {
  key: string;
  id: number | null;
  link_type: FansubGroupLinkType;
  name: string;
  url: string;
};

export type FansubReleaseGroup = {
  key: string;
  anime: AdminFansubAnimeEntry;
};

export type ReleaseSegmentStatus = "global" | "release" | "missing";

export type ReleaseSegmentCard = {
  theme_id: number;
  theme_type_name: string;
  theme_title: string | null;
  status: ReleaseSegmentStatus;
  segments: AdminAnimeThemeSegment[];
  media_id?: number;
  public_url?: string;
  source_label?: string;
  release_asset_upload_locked?: boolean;
};

export type SelectedReleaseSegment = {
  release: AdminFansubRelease;
  card: ReleaseSegmentCard;
};

export type ReleaseDrawerTab = "details" | "media";

export type ReleaseDrawerContext = {
  release: AdminFansubRelease;
  animeID: number;
  fansubGroupID: number;
  contextKey: string;
};

export type ContributionModalAnime = {
  id: number;
  title: string;
  focusedRoleCode?: string | null;
};

export type FansubEditAccessContext = {
  isPlatformAdmin: boolean;
  capabilities: FansubGroupCapabilities | null;
};
