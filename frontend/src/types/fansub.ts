import { PaginationMeta } from "@/types/anime";

export type FansubStatus = "active" | "inactive" | "dissolved";
export type FansubGroupType = "group" | "collaboration";
export type FansubGroupLinkType =
  | "website"
  | "discord"
  | "twitter"
  | "github"
  | "irc";

export interface FansubGroupLink {
  id: number;
  group_id: number;
  link_type: FansubGroupLinkType;
  name?: string | null;
  url: string;
  created_at: string;
}

export interface FansubGroup {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  history?: string | null;
  history_description?: string | null;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  closed_year?: number | null;
  status: FansubStatus;
  group_type: FansubGroupType;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
  anime_relations_count: number;
  release_versions_count: number;
  members_count: number;
  aliases_count: number;
  created_at: string;
  updated_at: string;
  links?: FansubGroupLink[];
  collaboration_members?: FansubGroupSummary[];
}

export interface FansubGroupSummary {
  id: number;
  slug: string;
  name: string;
  logo_url?: string | null;
}

export interface FansubMember {
  id: number;
  fansub_group_id: number;
  handle: string;
  role: string;
  since_year?: number | null;
  until_year?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FansubAlias {
  id: number;
  fansub_group_id: number;
  alias: string;
  created_at: string;
  updated_at: string;
}

export interface AnimeFansubRelation {
  anime_id: number;
  fansub_group_id: number;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  fansub_group?: FansubGroupSummary | null;
}

export interface FansubGroupListResponse {
  data: FansubGroup[];
  meta: PaginationMeta;
}

export interface FansubGroupResponse {
  data: FansubGroup;
}

export interface FansubGroupLinkListResponse {
  data: FansubGroupLink[];
}

export interface FansubGroupLinkResponse {
  data: FansubGroupLink;
}

export interface FansubMemberListResponse {
  data: FansubMember[];
}

export interface FansubMemberResponse {
  data: FansubMember;
}

export interface FansubAliasListResponse {
  data: FansubAlias[];
}

export interface FansubAliasResponse {
  data: FansubAlias;
}

export interface AnimeFansubListResponse {
  data: AnimeFansubRelation[];
}

export interface FansubGroupCreateRequest {
  slug: string;
  name: string;
  description?: string | null;
  history?: string | null;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  status: FansubStatus;
  group_type?: FansubGroupType;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
}

export interface FansubGroupPatchRequest {
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  history?: string | null;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  status?: FansubStatus | null;
  group_type?: FansubGroupType;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
}

export interface FansubGroupLinkCreateRequest {
  link_type: FansubGroupLinkType;
  name?: string | null;
  url: string;
}

export interface FansubGroupLinkPatchRequest {
  link_type?: FansubGroupLinkType | null;
  name?: string | null;
  url?: string | null;
}

export interface FansubMemberCreateRequest {
  handle: string;
  role: string;
  since_year?: number | null;
  until_year?: number | null;
  notes?: string | null;
}

export interface FansubMemberPatchRequest {
  handle?: string | null;
  role?: string | null;
  since_year?: number | null;
  until_year?: number | null;
  notes?: string | null;
}

export interface FansubAliasCreateRequest {
  alias: string;
}

export interface MergeFansubsRequest {
  target_id: number;
  source_ids: number[];
}

export interface MergeFansubsResult {
  merged_count: number;
  versions_migrated: number;
  members_migrated: number;
  relations_migrated: number;
  aliases_added: string[];
}

export interface MergeFansubsResponse {
  data: MergeFansubsResult;
}

export interface MergeFansubsPreviewConflicts {
  version_conflicts: number;
  duplicate_aliases_count: number;
  duplicate_aliases: string[];
  duplicate_members_count: number;
  duplicate_members: string[];
  duplicate_relations_count: number;
  duplicate_relation_anime_ids: number[];
  duplicate_slugs_count: number;
  duplicate_slugs: string[];
  duplicate_names_count: number;
  duplicate_names: string[];
}

export interface MergeFansubsPreviewResult {
  merged_count: number;
  versions_migrated: number;
  members_migrated: number;
  relations_migrated: number;
  aliases_added: string[];
  aliases_skipped: string[];
  can_merge: boolean;
  conflicts: MergeFansubsPreviewConflicts;
}

export interface MergeFansubsPreviewResponse {
  data: MergeFansubsPreviewResult;
}

export interface CollaborationMember {
  collaboration_id: number;
  member_group_id: number;
  added_at: string;
  member_group?: FansubGroupSummary;
}

export interface CollaborationMemberListResponse {
  data: CollaborationMember[];
}

export interface CollaborationMemberResponse {
  data: CollaborationMember;
}

export interface AddCollaborationMemberRequest {
  member_group_id: number;
}

export type FansubMediaKind = "logo" | "banner";

export interface FansubMediaAsset {
  id: number;
  filename: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  created_at: string;
}

export interface FansubMediaUploadResponse {
  data: {
    kind: FansubMediaKind;
    media: FansubMediaAsset;
    gif_large_warning: boolean;
  };
}

// --- Explicit release API types (Phase 30) ---
// These types model release context explicitly so consumers do not have to
// infer release_id from theme-asset helper responses.

/** AdminFansubRelease describes a fansub release as an explicit admin resource.
 * Surfaces release identity, anime context, fansub/group context, and episode anchor. */
export interface AdminFansubRelease {
  release_id: number;
  anime_id: number;
  anime_title: string;
  fansub_group_id: number;
  fansub_name: string;
  episode_id: number;
  episode_number: string;
  episode_title?: string | null;
  source?: string | null;
  version_count: number;
  has_theme_assets: boolean;
  created_at: string;
}

/** Response envelope for listing releases scoped to a fansub + anime combination. */
export interface AdminFansubAnimeReleasesResponse {
  data: AdminFansubRelease[];
}

/** canonical release response — release is null when no canonical release anchor exists
 * for the given fansub + anime combination. */
export interface AdminCanonicalFansubAnimeReleaseResponse {
  fansub_group_id: number;
  anime_id: number;
  release: AdminFansubRelease | null;
}

/** Direct release fetch by release_id. */
export interface AdminReleaseResponse {
  data: AdminFansubRelease;
}
